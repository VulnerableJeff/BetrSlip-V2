"""
BetrSlip API - Main Application Entry Point
Refactored modular architecture
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import base64
import aiohttp
import json
import re
import asyncio

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import route modules
from routes.deps import db, client, get_current_user, get_admin_user, security
from routes import auth, subscriptions, picks

# Import services
from services.smart_picks_service import SmartPicksService
from services.auto_resolver_service import AutoResolverService

# Import existing helpers
from sports_data_service import get_enhanced_context_for_analysis, SportsDataService
from injury_weather_service import get_enhanced_game_context
from admin_subscription import (
    is_admin, get_all_users, get_admin_stats, ban_user, unban_user,
    check_usage_limit, increment_usage, update_device_fingerprint,
    generate_device_fingerprint, get_client_ip, get_user_subscription,
    create_subscription_record, update_subscription_status,
    FREE_ANALYSIS_LIMIT, SUBSCRIPTION_PRICE, ADMIN_EMAIL
)

# LLM Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# App setup
app = FastAPI(title="BetrSlip API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# Environment variables
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ===== INCLUDE ROUTE MODULES =====
api_router.include_router(auth.router)
api_router.include_router(subscriptions.router)
api_router.include_router(picks.router)


# ===== BACKWARDS COMPATIBLE ROUTES =====
# These redirect old endpoints to new structure
@api_router.get("/usage")
async def get_usage_compat(current_user: dict = Depends(get_current_user)):
    """Backwards compatible usage endpoint"""
    user_id = current_user['user_id']
    usage = await db.user_usage.find_one({"user_id": user_id}, {"_id": 0})
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    
    is_subscribed = subscription and subscription.get('subscription_status') == 'active'
    analyses_count = usage.get('analyses_count', 0) if usage else 0
    
    return {
        "analyses_used": analyses_count,
        "analyses_remaining": max(0, 5 - analyses_count) if not is_subscribed else 999,
        "free_limit": 5,
        "is_subscribed": is_subscribed,
        "can_analyze": is_subscribed or analyses_count < 5
    }


# ===== LIVE GAMES STREAMING =====
@api_router.get("/live-games")
async def get_live_games():
    """Get currently live games with stream links and streaming sources"""
    from services.stream_sources_service import StreamSourcesService
    
    # Get admin-configured streams
    admin_streams = await db.live_streams.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    # Get live games with streaming sources from API
    stream_service = StreamSourcesService()
    api_games = await stream_service.get_live_games_with_streams()
    
    # Merge admin streams with API games (admin streams take priority)
    admin_game_ids = {s.get('id') for s in admin_streams}
    
    # Filter out API games that have admin overrides
    filtered_api_games = [g for g in api_games if g.get('id') not in admin_game_ids]
    
    # Combine: admin streams first, then API games
    all_games = admin_streams + filtered_api_games
    
    return {
        "games": all_games[:15],  # Limit to 15 games
        "total": len(all_games),
        "sources": {
            "admin_configured": len(admin_streams),
            "api_detected": len(api_games)
        }
    }


class LiveStreamCreate(BaseModel):
    title: str
    sport: str
    stream_url: Optional[str] = None
    external_url: Optional[str] = None
    score: Optional[str] = None
    quarter: Optional[str] = None
    network: Optional[str] = None

@api_router.post("/admin/live-streams")
async def admin_create_stream(
    stream: LiveStreamCreate,
    admin_user: dict = Depends(get_admin_user)
):
    """Add a live stream link (admin only)"""
    new_stream = {
        "id": str(uuid.uuid4()),
        **stream.dict(),
        "is_active": True,
        "created_by": admin_user['email'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.live_streams.insert_one(new_stream)
    return {"message": "Stream added", "stream_id": new_stream["id"]}


@api_router.get("/admin/live-streams")
async def admin_get_streams(admin_user: dict = Depends(get_admin_user)):
    """Get all live streams (admin only)"""
    streams = await db.live_streams.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"streams": streams, "total": len(streams)}


@api_router.delete("/admin/live-streams/{stream_id}")
async def admin_delete_stream(stream_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete a live stream (admin only)"""
    result = await db.live_streams.delete_one({"id": stream_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stream not found")
    return {"message": "Stream deleted"}


@api_router.post("/admin/live-streams/{stream_id}/toggle")
async def admin_toggle_stream(stream_id: str, admin_user: dict = Depends(get_admin_user)):
    """Toggle stream active status (admin only)"""
    stream = await db.live_streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    new_status = not stream.get('is_active', True)
    await db.live_streams.update_one({"id": stream_id}, {"$set": {"is_active": new_status}})
    return {"message": f"Stream {'activated' if new_status else 'deactivated'}"}


# ===== HEALTH ENDPOINTS =====
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "betrslip-api"}

@api_router.get("/health")
async def api_health_check():
    return {"status": "healthy", "service": "betrslip-api"}


# ===== BET SLIP ANALYSIS =====
class AnalysisResult(BaseModel):
    id: str
    image_url: str
    analysis: dict
    created_at: str

@api_router.post("/analyze")
async def analyze_bet_slip(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Analyze a bet slip image using AI"""
    user_id = current_user['user_id']
    
    # Check usage limits
    usage = await db.user_usage.find_one({"user_id": user_id})
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    
    is_subscribed = subscription and subscription.get('subscription_status') == 'active'
    analyses_count = usage.get('analyses_count', 0) if usage else 0
    
    if not is_subscribed and analyses_count >= FREE_ANALYSIS_LIMIT:
        raise HTTPException(
            status_code=402,
            detail="Free analysis limit reached. Please subscribe to continue."
        )
    
    # Read and encode image
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # Get enhanced sports context
    sports_context = ""
    try:
        sports_service = SportsDataService()
        context_data = await get_enhanced_context_for_analysis()
        if context_data:
            sports_context = f"\n\nREAL-TIME SPORTS DATA:\n{json.dumps(context_data, indent=2)}"
    except Exception as e:
        logger.warning(f"Failed to get sports context: {e}")
    
    # AI Analysis prompt
    analysis_prompt = f"""You are an expert sports betting analyst. Analyze this bet slip image and provide:

1. **Bet Details**: Extract all bets from the image (teams, spreads, odds, totals, etc.)
2. **Win Probability**: Estimate the probability of each bet winning (be realistic, most bets are 45-65%)
3. **Overall Probability**: If parlay, calculate combined probability
4. **Key Factors**: What factors support or work against these bets
5. **Risk Assessment**: Rate overall risk (Low/Medium/High/Very High)
6. **Kelly Criterion**: Suggested bet size based on edge
7. **Expected Value**: Calculate EV for each bet
8. **Recommendation**: Should they place this bet? Why or why not?
{sports_context}

Respond in JSON format:
{{
    "bets": [
        {{
            "description": "Team A -3.5 vs Team B",
            "odds": "-110",
            "win_probability": 52,
            "ev_percent": -2.3,
            "analysis": "Brief analysis"
        }}
    ],
    "overall_probability": 45,
    "risk_level": "Medium",
    "kelly_fraction": 0.02,
    "recommendation": "Your recommendation",
    "key_factors": ["Factor 1", "Factor 2"],
    "improvements": ["Suggestion 1", "Suggestion 2"]
}}"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis_{uuid.uuid4()}",
            system_message="You are an expert sports betting analyst providing detailed, honest analysis."
        )
        
        # Create image content for vision analysis
        image_content = ImageContent(image_base64=base64_image)
        msg = UserMessage(text=analysis_prompt, file_contents=[image_content])
        
        response = await chat.send_message(msg)
        
        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            analysis_data = json.loads(json_match.group())
        else:
            analysis_data = {"raw_analysis": response, "error": "Could not parse structured response"}
        
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    # Save analysis
    analysis_id = str(uuid.uuid4())
    analysis_record = {
        "id": analysis_id,
        "user_id": user_id,
        "image_data": base64_image[:100] + "...",  # Store preview only
        "analysis": analysis_data,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.analyses.insert_one(analysis_record)
    
    # Increment usage
    await db.user_usage.update_one(
        {"user_id": user_id},
        {"$inc": {"analyses_count": 1}},
        upsert=True
    )
    
    # Check if high probability - add to top bets
    overall_prob = analysis_data.get('overall_probability', 0)
    if overall_prob >= 70:
        await db.top_bets.insert_one({
            "id": str(uuid.uuid4()),
            "analysis_id": analysis_id,
            "user_id": user_id,
            "win_probability": overall_prob,
            "analysis_summary": analysis_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "id": analysis_id,
        "analysis": analysis_data,
        "usage": {
            "count": analyses_count + 1,
            "limit": FREE_ANALYSIS_LIMIT,
            "is_subscribed": is_subscribed
        }
    }


@api_router.get("/analyses")
async def get_user_analyses(
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get user's analysis history"""
    analyses = await db.analyses.find(
        {"user_id": current_user['user_id']},
        {"_id": 0, "image_data": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.analyses.count_documents({"user_id": current_user['user_id']})
    
    return {"analyses": analyses, "total": total}


class OutcomeRequest(BaseModel):
    outcome: str  # 'won', 'lost', 'push'
    stake_amount: Optional[float] = None
    payout_amount: Optional[float] = None

@api_router.post("/analysis/{analysis_id}/outcome")
async def mark_analysis_outcome(
    analysis_id: str,
    outcome_data: OutcomeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mark an analysis as won, lost, or push"""
    user_id = current_user['user_id']
    
    # Verify analysis exists and belongs to user
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Update analysis with outcome
    update_data = {
        "outcome": outcome_data.outcome,
        "outcome_marked_at": datetime.now(timezone.utc).isoformat()
    }
    
    if outcome_data.stake_amount:
        update_data["stake_amount"] = outcome_data.stake_amount
    if outcome_data.payout_amount:
        update_data["payout_amount"] = outcome_data.payout_amount
    
    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": update_data}
    )
    
    return {"message": f"Analysis marked as {outcome_data.outcome}", "outcome": outcome_data.outcome}


# ===== ADMIN ROUTES =====
@api_router.get("/admin/stats")
async def admin_get_stats(admin_user: dict = Depends(get_admin_user)):
    stats = await get_admin_stats(db)
    return stats

@api_router.get("/admin/users")
async def admin_get_users(
    skip: int = 0,
    limit: int = 50,
    admin_user: dict = Depends(get_admin_user)
):
    users = await get_all_users(db, skip, limit)
    return {"users": users, "total": await db.users.count_documents({})}

class BanUserRequest(BaseModel):
    reason: Optional[str] = None

@api_router.post("/admin/users/{user_id}/ban")
async def admin_ban_user(
    user_id: str,
    ban_request: BanUserRequest,
    admin_user: dict = Depends(get_admin_user)
):
    if user_id == admin_user['user_id']:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    success = await ban_user(db, user_id, ban_request.reason)
    if success:
        return {"message": "User banned"}
    raise HTTPException(status_code=404, detail="User not found")

@api_router.post("/admin/users/{user_id}/unban")
async def admin_unban_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    success = await unban_user(db, user_id)
    if success:
        return {"message": "User unbanned"}
    raise HTTPException(status_code=404, detail="User not found")

@api_router.get("/admin/user/{user_id}")
async def admin_get_user_details(user_id: str, admin_user: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    usage = await db.user_usage.find_one({"user_id": user_id}, {"_id": 0})
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    analyses = await db.analyses.count_documents({"user_id": user_id})
    
    return {"user": user, "usage": usage, "subscription": subscription, "total_analyses": analyses}

@api_router.post("/admin/users/{user_id}/grant-subscription")
async def admin_grant_subscription(user_id: str, admin_user: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "email": user.get('email', ''),
            "subscription_status": "active",
            "subscription_start": datetime.now(timezone.utc).isoformat(),
            "granted_by_admin": True
        }},
        upsert=True
    )
    return {"message": f"Pro subscription granted to {user.get('email')}"}

@api_router.post("/admin/users/{user_id}/revoke-subscription")
async def admin_revoke_subscription(user_id: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_status": "revoked", "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count > 0:
        return {"message": "Subscription revoked"}
    raise HTTPException(status_code=404, detail="No subscription found")

# CashApp Admin
@api_router.get("/admin/cashapp-requests")
async def admin_get_cashapp_requests(admin_user: dict = Depends(get_admin_user)):
    requests = await db.cashapp_requests.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"requests": requests, "total": len(requests)}

@api_router.post("/admin/cashapp-requests/{request_id}/approve")
async def admin_approve_cashapp(request_id: str, admin_user: dict = Depends(get_admin_user)):
    cashapp_req = await db.cashapp_requests.find_one({"id": request_id})
    if not cashapp_req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.cashapp_requests.update_one({"id": request_id}, {"$set": {"status": "approved", "approved_by": admin_user['email'], "approved_at": datetime.now(timezone.utc).isoformat()}})
    await db.subscriptions.update_one({"user_id": cashapp_req['user_id']}, {"$set": {"user_id": cashapp_req['user_id'], "email": cashapp_req['email'], "subscription_status": "active", "payment_method": "cashapp", "subscription_start": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    await db.payment_transactions.insert_one({"type": "cashapp", "user_id": cashapp_req['user_id'], "email": cashapp_req['email'], "amount": "5.00", "payment_status": "paid", "approved_by": admin_user['email'], "created_at": datetime.now(timezone.utc).isoformat()})
    
    return {"message": f"CashApp approved. {cashapp_req['email']} is now Pro!"}

@api_router.post("/admin/cashapp-requests/{request_id}/reject")
async def admin_reject_cashapp(request_id: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.cashapp_requests.update_one({"id": request_id}, {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request rejected"}

# Top Bets Admin
@api_router.get("/admin/top-bets")
async def admin_get_top_bets(limit: int = 50, admin_user: dict = Depends(get_admin_user)):
    top_bets = await db.top_bets.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"top_bets": top_bets}

@api_router.get("/admin/top-bets/stats")
async def admin_get_top_bets_stats(admin_user: dict = Depends(get_admin_user)):
    total = await db.top_bets.count_documents({})
    avg_pipeline = [{"$group": {"_id": None, "avg_prob": {"$avg": "$win_probability"}}}]
    avg_result = await db.top_bets.aggregate(avg_pipeline).to_list(1)
    avg_prob = round(avg_result[0]['avg_prob'], 1) if avg_result else 0
    
    return {"total_top_bets": total, "average_probability": avg_prob}


# ===== STRIPE WEBHOOK =====
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.process_webhook(body, request.headers.get("Stripe-Signature"))
        
        if webhook_response.payment_status == 'paid':
            user_id = webhook_response.metadata.get('user_id')
            if user_id:
                await update_subscription_status(db, user_id, 'active')
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}


# ===== BACKGROUND TASKS =====
_background_tasks = []

async def periodic_auto_resolve():
    """Auto-resolve picks every 2 hours"""
    while True:
        try:
            await asyncio.sleep(7200)
            logger.info("Running scheduled auto-resolution...")
            resolver = AutoResolverService(db)
            result = await resolver.resolve_picks()
            logger.info(f"Auto-resolution: {result}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Auto-resolve error: {e}")
            await asyncio.sleep(300)

@app.on_event("startup")
async def startup_event():
    task = asyncio.create_task(periodic_auto_resolve())
    _background_tasks.append(task)
    logger.info("Started background tasks")
    
    # Initial auto-resolve
    try:
        resolver = AutoResolverService(db)
        await resolver.resolve_picks()
    except Exception as e:
        logger.warning(f"Initial auto-resolve failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    for task in _background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    client.close()


# ===== MOUNT ROUTER & MIDDLEWARE =====
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
