"""
Daily Picks routes - AI picks management, auto-generation, performance tracking
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from .deps import db, get_current_user, get_admin_user
from services.smart_picks_service import SmartPicksService
from services.auto_resolver_service import AutoResolverService

router = APIRouter(tags=["Daily Picks"])
logger = logging.getLogger(__name__)


class DailyPickCreate(BaseModel):
    title: str
    description: str
    win_probability: float
    odds: str
    sport: str
    confidence: int = 7
    reasoning: List[str] = []
    risk_factors: List[str] = []
    game_time: str = ""

class PickOutcomeUpdate(BaseModel):
    outcome: str  # "won", "lost", "push"


# Public endpoints
# Track last generation attempt to avoid repeated retries
_last_picks_gen_attempt = None
_PICKS_GEN_COOLDOWN = 300  # 5 minutes between generation attempts

@router.get("/daily-picks")
async def get_daily_picks():
    """Get active daily picks - auto-generates if needed (with cooldown)"""
    global _last_picks_gen_attempt
    
    # Check for picks from last 16 hours
    sixteen_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=16)).isoformat()
    
    active_recent = await db.daily_picks.count_documents({
        "is_active": True,
        "created_at": {"$gte": sixteen_hours_ago}
    })
    
    # Auto-generate only if: few recent picks AND cooldown has passed
    if active_recent < 2:
        now = datetime.now(timezone.utc)
        should_try = (
            _last_picks_gen_attempt is None or
            (now - _last_picks_gen_attempt).total_seconds() > _PICKS_GEN_COOLDOWN
        )
        if should_try:
            _last_picks_gen_attempt = now
            logger.info(f"Only {active_recent} recent picks, attempting smart AI generation...")
            smart_service = SmartPicksService(db)
            await smart_service.generate_smart_picks(force=True)
    
    # Get active picks, sorted by probability
    picks = await db.daily_picks.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("win_probability", -1).limit(3).to_list(3)
    
    return {"picks": picks, "count": len(picks)}


@router.get("/picks-performance")
async def get_picks_performance():
    """Get public performance stats for daily picks"""
    won = await db.daily_picks.count_documents({"outcome": "won"})
    lost = await db.daily_picks.count_documents({"outcome": "lost"})
    push = await db.daily_picks.count_documents({"outcome": "push"})
    total_decided = won + lost + push
    
    win_rate = round((won / total_decided * 100), 1) if total_decided > 0 else 0
    
    # Get recent decided picks
    recent = await db.daily_picks.find(
        {"outcome": {"$in": ["won", "lost", "push"]}},
        {"_id": 0}
    ).sort("outcome_updated_at", -1).limit(10).to_list(10)
    
    # Calculate streak
    streak_picks = await db.daily_picks.find(
        {"outcome": {"$in": ["won", "lost"]}},
        {"_id": 0, "outcome": 1}
    ).sort("outcome_updated_at", -1).limit(20).to_list(20)
    
    current_streak = 0
    streak_type = None
    for pick in streak_picks:
        if streak_type is None:
            streak_type = pick['outcome']
            current_streak = 1
        elif pick['outcome'] == streak_type:
            current_streak += 1
        else:
            break
    
    return {
        "won": won,
        "lost": lost,
        "push": push,
        "win_rate": win_rate,
        "total_decided": total_decided,
        "current_streak": current_streak,
        "streak_type": streak_type,
        "recent_picks": recent
    }


# Admin endpoints
@router.get("/admin/daily-picks")
async def admin_get_all_picks(admin_user: dict = Depends(get_admin_user)):
    """Get all daily picks for admin management"""
    picks = await db.daily_picks.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"picks": picks, "total": len(picks)}


@router.post("/admin/daily-picks")
async def admin_create_pick(
    pick: DailyPickCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """Create a new daily pick"""
    new_pick = {
        "id": str(uuid.uuid4()),
        **pick.dict(),
        "created_by": admin_user['email'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "outcome": None
    }
    
    await db.daily_picks.insert_one(new_pick)
    return {"message": "Pick created", "pick_id": new_pick["id"]}


@router.put("/admin/daily-picks/{pick_id}")
async def admin_update_pick(
    pick_id: str,
    pick: DailyPickCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """Update an existing pick"""
    result = await db.daily_picks.update_one(
        {"id": pick_id},
        {"$set": {
            **pick.dict(),
            "updated_by": admin_user['email'],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    return {"message": "Pick updated"}


@router.delete("/admin/daily-picks/{pick_id}")
async def admin_delete_pick(pick_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete a pick"""
    result = await db.daily_picks.delete_one({"id": pick_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pick not found")
    return {"message": "Pick deleted"}


@router.post("/admin/daily-picks/{pick_id}/toggle")
async def admin_toggle_pick(pick_id: str, admin_user: dict = Depends(get_admin_user)):
    """Toggle pick active status"""
    pick = await db.daily_picks.find_one({"id": pick_id})
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    new_status = not pick.get('is_active', True)
    await db.daily_picks.update_one(
        {"id": pick_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": f"Pick {'activated' if new_status else 'deactivated'}"}


@router.post("/admin/daily-picks/{pick_id}/outcome")
async def admin_update_outcome(
    pick_id: str,
    update: PickOutcomeUpdate,
    admin_user: dict = Depends(get_admin_user)
):
    """Update pick outcome (won/lost/push)"""
    if update.outcome not in ["won", "lost", "push"]:
        raise HTTPException(status_code=400, detail="Invalid outcome")
    
    result = await db.daily_picks.update_one(
        {"id": pick_id},
        {"$set": {
            "outcome": update.outcome,
            "outcome_updated_at": datetime.now(timezone.utc).isoformat(),
            "outcome_updated_by": admin_user['email']
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    return {"message": f"Pick marked as {update.outcome}"}


@router.get("/admin/picks-performance")
async def admin_get_picks_performance(admin_user: dict = Depends(get_admin_user)):
    """Get detailed picks performance for admin"""
    won = await db.daily_picks.count_documents({"outcome": "won"})
    lost = await db.daily_picks.count_documents({"outcome": "lost"})
    push = await db.daily_picks.count_documents({"outcome": "push"})
    pending = await db.daily_picks.count_documents({
        "$or": [{"outcome": None}, {"outcome": {"$exists": False}}, {"outcome": "pending"}]
    })
    
    decided = won + lost + push
    win_rate = round((won / decided * 100), 1) if decided > 0 else 0
    
    recent = await db.daily_picks.find(
        {"outcome": {"$in": ["won", "lost"]}},
        {"_id": 0, "outcome": 1}
    ).sort("outcome_updated_at", -1).limit(10).to_list(10)
    
    current_streak = 0
    streak_type = None
    for pick in recent:
        if streak_type is None:
            streak_type = pick['outcome']
            current_streak = 1
        elif pick['outcome'] == streak_type:
            current_streak += 1
        else:
            break
    
    return {
        "won": won,
        "lost": lost,
        "push": push,
        "pending": pending,
        "decided": decided,
        "win_rate": win_rate,
        "current_streak": current_streak,
        "streak_type": streak_type
    }


@router.post("/admin/generate-picks")
async def admin_generate_picks(admin_user: dict = Depends(get_admin_user)):
    """Trigger smart AI pick generation"""
    smart_service = SmartPicksService(db)
    result = await smart_service.generate_smart_picks(force=True)
    return result


@router.post("/admin/refresh-picks")
async def admin_refresh_picks(admin_user: dict = Depends(get_admin_user)):
    """Force clear all old picks and generate fresh ones"""
    # Deactivate ALL existing picks
    deactivate_result = await db.daily_picks.update_many(
        {"is_active": True},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Generate fresh picks
    smart_service = SmartPicksService(db)
    result = await smart_service.generate_smart_picks(force=True)
    
    return {
        "deactivated": deactivate_result.modified_count,
        "generation_result": result
    }


@router.post("/admin/clear-old-picks")
async def admin_clear_old_picks(admin_user: dict = Depends(get_admin_user)):
    """Clear picks older than 24 hours"""
    one_day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    result = await db.daily_picks.update_many(
        {"is_active": True, "created_at": {"$lt": one_day_ago}},
        {"$set": {"is_active": False}}
    )
    
    return {"deactivated_count": result.modified_count}


@router.post("/admin/auto-resolve-picks")
async def admin_auto_resolve(admin_user: dict = Depends(get_admin_user)):
    """Trigger auto-resolution of pick outcomes"""
    resolver = AutoResolverService(db)
    result = await resolver.resolve_picks()
    return result


@router.get("/admin/ai-learning-stats")
async def admin_get_ai_learning_stats(admin_user: dict = Depends(get_admin_user)):
    """Get AI learning statistics"""
    smart_service = SmartPicksService(db)
    performance = await smart_service.get_historical_performance()
    return {
        "learning_data": performance,
        "message": "This data is used by the AI to improve pick selection"
    }


# Cron endpoint for auto-generation
@router.post("/cron/generate-picks")
async def cron_generate_picks(request: Request):
    """Cron job endpoint for auto-generating picks"""
    try:
        body = await request.json()
        if body.get('secret_key') != "BetrSlip2026SecureReset":
            raise HTTPException(status_code=403, detail="Invalid secret key")
        
        smart_service = SmartPicksService(db)
        result = await smart_service.generate_smart_picks()
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Initialize picks endpoint
class InitPicksRequest(BaseModel):
    secret_key: str

@router.post("/admin/initialize-picks")
async def initialize_picks(request: InitPicksRequest):
    """Generate fresh picks using real live odds (admin only)"""
    if request.secret_key != "BetrSlip2026SecureReset":
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    # Deactivate all existing picks
    await db.daily_picks.update_many({}, {"$set": {"is_active": False}})
    
    # Generate real picks from live data
    from services.smart_picks_service import SmartPicksService
    smart_service = SmartPicksService(db)
    result = await smart_service.generate_smart_picks(force=True)
    
    return {"message": result.get("message", "Picks regenerated"), "success": result.get("generated", False)}
