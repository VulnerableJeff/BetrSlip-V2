"""
Push Notifications Routes
- Subscribe/unsubscribe to push notifications
- Store push subscriptions
- Send notifications for line movements, game starts, daily picks
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import json
import logging

from .deps import db, get_current_user, get_admin_user

router = APIRouter(prefix="/notifications", tags=["notifications"])
logger = logging.getLogger(__name__)


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # Contains p256dh and auth keys


class NotificationPreferences(BaseModel):
    line_movements: bool = True
    game_starts: bool = True
    daily_picks: bool = True
    bet_results: bool = True


@router.post("/subscribe")
async def subscribe_to_push(
    subscription: PushSubscription,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to push notifications"""
    user_id = current_user['user_id']
    
    # Store or update subscription
    await db.push_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "email": current_user.get('email', ''),
            "endpoint": subscription.endpoint,
            "keys": subscription.keys,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }},
        upsert=True
    )
    
    # Set default preferences if not exists
    prefs = await db.notification_preferences.find_one({"user_id": user_id})
    if not prefs:
        await db.notification_preferences.insert_one({
            "user_id": user_id,
            "line_movements": True,
            "game_starts": True,
            "daily_picks": True,
            "bet_results": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Successfully subscribed to push notifications"}


@router.post("/unsubscribe")
async def unsubscribe_from_push(current_user: dict = Depends(get_current_user)):
    """Unsubscribe from push notifications"""
    user_id = current_user['user_id']
    
    await db.push_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Unsubscribed from push notifications"}


@router.get("/preferences")
async def get_notification_preferences(current_user: dict = Depends(get_current_user)):
    """Get user's notification preferences"""
    user_id = current_user['user_id']
    
    prefs = await db.notification_preferences.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user_id},
        {"_id": 0, "is_active": 1}
    )
    
    is_subscribed = subscription.get('is_active', False) if subscription else False
    
    if not prefs:
        prefs = {
            "line_movements": True,
            "game_starts": True,
            "daily_picks": True,
            "bet_results": True
        }
    
    return {
        "is_subscribed": is_subscribed,
        "preferences": {
            "line_movements": prefs.get('line_movements', True),
            "game_starts": prefs.get('game_starts', True),
            "daily_picks": prefs.get('daily_picks', True),
            "bet_results": prefs.get('bet_results', True)
        }
    }


@router.put("/preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: dict = Depends(get_current_user)
):
    """Update notification preferences"""
    user_id = current_user['user_id']
    
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "line_movements": preferences.line_movements,
            "game_starts": preferences.game_starts,
            "daily_picks": preferences.daily_picks,
            "bet_results": preferences.bet_results,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Preferences updated"}


@router.get("/status")
async def get_notification_status(current_user: dict = Depends(get_current_user)):
    """Check if user has push notifications enabled"""
    user_id = current_user['user_id']
    
    subscription = await db.push_subscriptions.find_one(
        {"user_id": user_id, "is_active": True}
    )
    
    return {"enabled": subscription is not None}


# Admin endpoint to send test notification
class TestNotificationRequest(BaseModel):
    user_id: Optional[str] = None
    title: str
    body: str
    url: Optional[str] = None


@router.post("/admin/send-test")
async def admin_send_test_notification(
    request: TestNotificationRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """Send a test notification (admin only)"""
    # This would integrate with a push notification service like web-push
    # For now, we'll just log it and store it
    
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "title": request.title,
        "body": request.body,
        "url": request.url,
        "sent_by": admin_user['email'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications_log.insert_one(notification)
    
    return {"message": "Test notification logged", "notification_id": notification['id']}


@router.get("/admin/stats")
async def get_notification_stats(admin_user: dict = Depends(get_admin_user)):
    """Get notification statistics (admin only)"""
    total_subscribers = await db.push_subscriptions.count_documents({"is_active": True})
    total_sent = await db.notifications_log.count_documents({})
    
    # Preferences breakdown
    prefs_pipeline = [
        {"$group": {
            "_id": None,
            "line_movements_enabled": {"$sum": {"$cond": ["$line_movements", 1, 0]}},
            "game_starts_enabled": {"$sum": {"$cond": ["$game_starts", 1, 0]}},
            "daily_picks_enabled": {"$sum": {"$cond": ["$daily_picks", 1, 0]}},
            "bet_results_enabled": {"$sum": {"$cond": ["$bet_results", 1, 0]}},
            "total": {"$sum": 1}
        }}
    ]
    
    prefs_result = await db.notification_preferences.aggregate(prefs_pipeline).to_list(1)
    prefs_stats = prefs_result[0] if prefs_result else {}
    
    return {
        "total_subscribers": total_subscribers,
        "total_notifications_sent": total_sent,
        "preferences_breakdown": {
            "line_movements": prefs_stats.get('line_movements_enabled', 0),
            "game_starts": prefs_stats.get('game_starts_enabled', 0),
            "daily_picks": prefs_stats.get('daily_picks_enabled', 0),
            "bet_results": prefs_stats.get('bet_results_enabled', 0)
        }
    }
