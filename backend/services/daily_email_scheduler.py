"""
Daily Email Scheduler for BetrSlip
Sends daily pick emails to Pro users at 8:00 AM ET
"""

import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.email_service import get_email_service

logger = logging.getLogger(__name__)

# Timezone for scheduling
ET_TZ = ZoneInfo('America/New_York')
SEND_HOUR = 8  # 8:00 AM ET
SEND_MINUTE = 0


class DailyEmailScheduler:
    """Scheduler for sending daily pick emails to Pro users"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.email_service = get_email_service()
        self._running = False
        self._task = None
    
    async def get_todays_pick(self) -> Dict:
        """Get the current Bet of the Day"""
        today = datetime.now(ET_TZ).date()
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=ET_TZ)
        
        # Try to find today's featured pick first
        pick = await self.db.daily_picks.find_one(
            {
                "is_featured": True,
                "created_at": {"$gte": today_start.isoformat()}
            },
            {"_id": 0}
        )
        
        if not pick:
            # Fall back to most recent featured pick
            pick = await self.db.daily_picks.find_one(
                {"is_featured": True},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
        
        if not pick:
            # Fall back to any recent active pick
            pick = await self.db.daily_picks.find_one(
                {"is_active": True},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
        
        if not pick:
            # Fall back to most recent pick regardless of status
            pick = await self.db.daily_picks.find_one(
                {},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
        
        return pick or {}
    
    async def get_top_picks(self, limit: int = 3) -> List[Dict]:
        """Get today's top picks"""
        today = datetime.now(ET_TZ).date()
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=ET_TZ)
        
        picks = await self.db.daily_picks.find(
            {
                "created_at": {"$gte": today_start.isoformat()}
            },
            {"_id": 0}
        ).sort("win_probability", -1).limit(limit).to_list(limit)
        
        if not picks:
            # Fall back to recent picks
            picks = await self.db.daily_picks.find(
                {},
                {"_id": 0}
            ).sort([("created_at", -1), ("win_probability", -1)]).limit(limit).to_list(limit)
        
        return picks
    
    async def get_pro_users_for_email(self) -> List[Dict]:
        """Get all Pro users who have email notifications enabled"""
        # Get active subscriptions
        subscriptions = await self.db.subscriptions.find(
            {"subscription_status": "active"},
            {"_id": 0, "user_id": 1}
        ).to_list(1000)
        
        pro_user_ids = [s["user_id"] for s in subscriptions]
        
        if not pro_user_ids:
            return []
        
        # Get users with their email preferences
        users = await self.db.users.find(
            {
                "id": {"$in": pro_user_ids},
                "email_unsubscribed": {"$ne": True}  # Not unsubscribed
            },
            {"_id": 0, "id": 1, "email": 1, "email_preference": 1}
        ).to_list(1000)
        
        return users
    
    async def send_daily_emails(self) -> Dict:
        """Send daily pick emails to all eligible Pro users"""
        if not self.email_service.is_configured():
            logger.warning("Email service not configured, skipping daily emails")
            return {"success": False, "error": "Email not configured", "sent": 0, "failed": 0}
        
        # Get today's picks
        pick = await self.get_todays_pick()
        if not pick:
            logger.warning("No pick available for daily email")
            return {"success": False, "error": "No pick available", "sent": 0, "failed": 0}
        
        top_picks = await self.get_top_picks()
        
        # Get eligible users
        users = await self.get_pro_users_for_email()
        if not users:
            logger.info("No eligible users for daily email")
            return {"success": True, "message": "No eligible users", "sent": 0, "failed": 0}
        
        sent_count = 0
        failed_count = 0
        
        for user in users:
            email = user.get("email")
            if not email:
                continue
            
            # Get user's email preference (default to "full")
            email_type = user.get("email_preference", "full")
            
            try:
                success = self.email_service.send_daily_pick_email(
                    to_email=email,
                    pick=pick,
                    top_picks=top_picks,
                    email_type=email_type
                )
                
                if success:
                    sent_count += 1
                    # Log email sent
                    await self.db.email_logs.insert_one({
                        "user_id": user.get("id"),
                        "email": email,
                        "type": "daily_pick",
                        "pick_id": pick.get("id"),
                        "status": "sent",
                        "sent_at": datetime.now(ET_TZ).isoformat()
                    })
                else:
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Error sending email to {email}: {e}")
                failed_count += 1
            
            # Small delay between emails to avoid rate limiting
            await asyncio.sleep(0.5)
        
        logger.info(f"Daily emails complete: {sent_count} sent, {failed_count} failed")
        return {
            "success": True,
            "sent": sent_count,
            "failed": failed_count,
            "pick_title": pick.get("title", "")
        }
    
    def _time_until_next_send(self) -> float:
        """Calculate seconds until next 8:00 AM ET"""
        now = datetime.now(ET_TZ)
        target = now.replace(hour=SEND_HOUR, minute=SEND_MINUTE, second=0, microsecond=0)
        
        if now >= target:
            # Already past 8 AM today, schedule for tomorrow
            target += timedelta(days=1)
        
        delta = target - now
        return delta.total_seconds()
    
    async def _scheduler_loop(self):
        """Main scheduler loop"""
        logger.info("Daily email scheduler started")
        
        while self._running:
            try:
                # Wait until next send time
                wait_seconds = self._time_until_next_send()
                logger.info(f"Next daily email in {wait_seconds/3600:.1f} hours")
                
                await asyncio.sleep(wait_seconds)
                
                if self._running:
                    logger.info("Sending daily pick emails...")
                    result = await self.send_daily_emails()
                    logger.info(f"Daily email result: {result}")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(60)  # Wait a minute before retrying
    
    def start(self):
        """Start the scheduler"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info("Daily email scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Daily email scheduler stopped")


# Global scheduler instance
_scheduler = None

def get_email_scheduler(db: AsyncIOMotorDatabase) -> DailyEmailScheduler:
    """Get or create scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = DailyEmailScheduler(db)
    return _scheduler
