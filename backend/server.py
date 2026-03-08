"""
BetrSlip API - Main Application Entry Point
Refactored modular architecture with security enhancements
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
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import base64
import aiohttp
import json
import re
import asyncio
from collections import defaultdict
import time

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import route modules
from routes.deps import db, client, get_current_user, get_admin_user, security
from routes import auth, subscriptions, picks, streams, usa_sports, bankroll, analytics
from routes import referrals, notifications, admin_analytics
from routes import chat, performance, parlay_builder
from routes import pro_tools, support

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
app = FastAPI(title="BetrSlip API", version="2.1.0")
api_router = APIRouter(prefix="/api")

# Environment variables — read lazily via functions for deployment resilience
def _get_stripe_key():
    return os.environ.get('STRIPE_API_KEY', '')

def _get_emergent_key():
    return os.environ.get('EMERGENT_LLM_KEY', '')

# ===== SECURITY: Rate Limiting =====
class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.analysis_requests: Dict[str, list] = defaultdict(list)
    
    def is_rate_limited(self, user_id: str, limit: int = 60, window: int = 60) -> bool:
        """Check if user exceeded rate limit (default: 60 requests per minute)"""
        now = time.time()
        # Clean old requests
        self.requests[user_id] = [t for t in self.requests[user_id] if now - t < window]
        
        if len(self.requests[user_id]) >= limit:
            return True
        
        self.requests[user_id].append(now)
        return False
    
    def is_analysis_limited(self, user_id: str, limit: int = 5, window: int = 300) -> bool:
        """Check analysis rate limit (5 analyses per 5 minutes to prevent abuse)"""
        now = time.time()
        self.analysis_requests[user_id] = [t for t in self.analysis_requests[user_id] if now - t < window]
        
        if len(self.analysis_requests[user_id]) >= limit:
            return True
        
        self.analysis_requests[user_id].append(now)
        return False

rate_limiter = RateLimiter()

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
    free_limit = FREE_ANALYSIS_LIMIT
    
    return {
        "analyses_used": analyses_count,
        "analyses_remaining": max(0, free_limit - analyses_count) if not is_subscribed else 999,
        "free_limit": free_limit,
        "is_subscribed": is_subscribed,
        "can_analyze": is_subscribed or analyses_count < free_limit
    }


@api_router.post("/usage/extend")
async def extend_free_trial(current_user: dict = Depends(get_current_user)):
    """Grant 3 bonus analyses for sharing (one-time only)"""
    user_id = current_user['user_id']
    
    usage = await db.user_usage.find_one({"user_id": user_id})
    if usage and usage.get("share_extension_used"):
        raise HTTPException(status_code=400, detail="Share extension already used")
    
    # Reduce the analyses_count by 3 (effectively giving 3 more free)
    current_count = usage.get('analyses_count', 0) if usage else 0
    new_count = max(0, current_count - 3)
    
    await db.user_usage.update_one(
        {"user_id": user_id},
        {"$set": {"analyses_count": new_count, "share_extension_used": True}},
        upsert=True
    )
    
    return {"message": "3 bonus analyses unlocked!", "analyses_remaining": max(0, FREE_ANALYSIS_LIMIT - new_count)}


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
    return {"status": "healthy", "service": "betrslip-api", "version": "2.1.0"}

@api_router.get("/health")
async def api_health_check():
    api_key = os.environ.get('ODDS_API_KEY', '')
    cache_count = await db.api_cache.count_documents({})
    return {
        "status": "healthy",
        "service": "betrslip-api",
        "version": "2.1.0",
        "odds_key_set": bool(api_key),
        "odds_key_len": len(api_key),
        "cache_entries": cache_count
    }


@api_router.get("/diagnostics")
async def diagnostics(current_user: dict = Depends(get_admin_user)):
    """Admin-only: Check API key and cache status"""
    api_key = os.environ.get('ODDS_API_KEY', '')
    cache_count = await db.api_cache.count_documents({})
    picks_count = await db.daily_picks.count_documents({"is_active": True})
    
    # Test the API key
    key_status = "not_set"
    if api_key:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://api.the-odds-api.com/v4/sports/?apiKey={api_key}",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    key_status = "valid" if resp.status == 200 else f"error_{resp.status}"
        except Exception as e:
            key_status = f"error_{str(e)[:50]}"
    
    return {
        "api_key_set": bool(api_key),
        "api_key_length": len(api_key),
        "api_key_prefix": api_key[:6] + "..." if api_key else "none",
        "api_key_status": key_status,
        "cache_entries": cache_count,
        "active_picks": picks_count,
        "env_file_exists": (ROOT_DIR / '.env').exists()
    }


@api_router.post("/admin/seed-cache")
async def seed_cache(current_user: dict = Depends(get_admin_user)):
    """Admin-only: Directly fetch and cache odds data from Odds API"""
    api_key = os.environ.get('ODDS_API_KEY', '')
    if not api_key:
        return {"success": False, "error": "ODDS_API_KEY not set"}
    
    results = {}
    sports = {
        'basketball_nba': 'h2h,spreads,totals',
        'icehockey_nhl': 'h2h,spreads,totals',
        'basketball_ncaab': 'h2h,spreads,totals'
    }
    
    async with aiohttp.ClientSession() as session:
        for sport_key, markets in sports.items():
            try:
                url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
                params = {
                    'apiKey': api_key,
                    'regions': 'us',
                    'markets': markets,
                    'oddsFormat': 'american',
                    'dateFormat': 'iso'
                }
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        sorted_markets = '_'.join(sorted(markets.split(',')))
                        cache_key = f"odds_cache_{sport_key}_{sorted_markets}"
                        await db.api_cache.update_one(
                            {"key": cache_key},
                            {"$set": {"key": cache_key, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}},
                            upsert=True
                        )
                        results[sport_key] = f"OK - {len(data)} games cached"
                    else:
                        body = await resp.text()
                        results[sport_key] = f"FAILED {resp.status}: {body[:100]}"
                await asyncio.sleep(1.5)
            except Exception as e:
                results[sport_key] = f"ERROR: {str(e)[:100]}"
    
    return {"success": True, "results": results}


# ===== BET SLIP ANALYSIS =====
class AnalysisResult(BaseModel):
    id: str
    image_url: str
    analysis: dict
    created_at: str

# Allowed image types for security
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/jpg'}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB max

@api_router.post("/analyze")
async def analyze_bet_slip(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Analyze a bet slip image using AI with security checks"""
    user_id = current_user['user_id']
    
    # ===== SECURITY: Rate limiting =====
    if rate_limiter.is_analysis_limited(user_id):
        raise HTTPException(
            status_code=429,
            detail="Too many analysis requests. Please wait a few minutes before trying again."
        )
    
    # ===== SECURITY: File validation =====
    # Check file type
    content_type = file.content_type or ''
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WEBP. Got: {content_type}"
        )
    
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: 10MB. Your file: {len(contents) / 1024 / 1024:.1f}MB"
        )
    
    if len(contents) < 1000:  # Less than 1KB is suspicious
        raise HTTPException(
            status_code=400,
            detail="File too small. Please upload a valid bet slip image."
        )
    
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
    
    # Encode image for AI
    base64_image = base64.b64encode(contents).decode('utf-8')
    
    # AI Analysis prompt - comprehensive for full data
    analysis_prompt = """You are an elite sports betting analyst and handicapper with 20+ years of experience. Your job is to give HONEST, DATA-DRIVEN analysis that protects bettors' bankrolls.

EXTRACT AND ANALYZE:
1. All bets visible (teams, spreads, totals, moneylines, props, odds)
2. Calculate REALISTIC win probabilities using implied odds + your edge assessment
3. Identify the sport(s) involved
4. For PARLAYS: analyze leg correlation (do legs help or hurt each other?)

PROBABILITY GUIDELINES (be CONSERVATIVE and honest):
- Single ML heavy favorite (-300+): 72-78% (but juice eats profit)
- Single ML favorite (-150 to -250): 58-68%
- Single ML underdog (+150 to +250): 28-38%
- Single spread bet: 45-55% (the market is efficient, most are near 50%)
- Over/Under: 48-54% (totals are the sharpest market)
- 2-leg parlay: multiply individual probs (typically 25-35%)
- 3-leg parlay: typically 12-22%
- 4+ leg parlay: typically under 10%
- Player props: 40-55% depending on market
- Same-game parlays: legs are NOT independent, reduce by 5-15% from naive multiplication

CLOSING LINE VALUE (CLV) - THE MOST IMPORTANT FACTOR:
- The closing line is the most accurate predictor of outcomes
- If the bettor got better odds than the current market, that's +CLV (good sign)
- If the bettor got worse odds, that's -CLV (bad sign)
- Bettors who consistently beat the closing line are long-term winners

EDGE ANALYSIS:
- Compare the bet's implied probability (from odds) vs your estimated true probability
- If true prob > implied prob = POSITIVE EV (+EV) = BET
- If true prob < implied prob = NEGATIVE EV (-EV) = PASS
- Most bets at sportsbooks are -EV by 3-5%. Only recommend if you see genuine edge.
- IMPORTANT: Don't inflate probabilities to make bets look good. Honesty saves bankrolls.

FOR PARLAYS SPECIFICALLY:
- Check if legs are correlated (e.g., same game over + favorite ML = correlated)
- Same-game parlays have HIDDEN correlation that reduces true odds
- Always suggest which legs are strongest and which to remove
- A 3-leg parlay should almost never exceed 25% probability

RESPOND IN THIS EXACT JSON FORMAT:
{
    "sport": "NBA/NFL/MLB/NHL/NCAAB/etc",
    "bet_type": "parlay/straight/teaser",
    "total_odds": "+450",
    "potential_payout": "$50 to win $225",
    "bets": [
        {
            "description": "Lakers -5.5 vs Celtics",
            "odds": "-110",
            "bet_type": "spread",
            "win_probability": 48,
            "ev_percent": -4.5,
            "leg_grade": "B",
            "reasoning": "Lakers struggling on road, Celtics 8-2 at home. Line slightly off."
        }
    ],
    "overall_probability": 22,
    "risk_level": "High",
    "kelly_fraction": 0.01,
    "recommendation": "PASS",
    "risk_factors": [
        "Parlay requires all legs to hit",
        "Correlated legs reduce true value"
    ],
    "positive_factors": [
        "Strong home team in leg 2",
        "Good line value on spread"
    ],
    "improvements": [
        "Remove weakest leg (Leg 3) to go from +450 to +180 with much better hit rate",
        "Consider taking Lakers ML instead of -5.5 spread",
        "Bet legs 1 and 2 as singles for better long-term profit"
    ],
    "strongest_leg": "Leg 2 - Celtics ML has the best edge",
    "weakest_leg": "Leg 3 - Prop bet is a coin flip with bad juice",
    "parlay_vs_straight": {
        "parlay_ev": -15.2,
        "straight_ev": -3.4,
        "recommendation": "Bet the 2 strongest legs as singles. Your bankroll will thank you."
    }
}

RECOMMENDATION THRESHOLDS:
- "STRONG BET": overall_probability >= 62% AND ev_percent > +5%
- "BET": overall_probability >= 55% AND ev_percent > 0%
- "SMALL/SKIP": overall_probability 45-55% OR ev_percent between -5% and 0%
- "PASS": overall_probability < 45% OR ev_percent < -5%

Be BRUTALLY honest. If a bet is bad, say so clearly. Most parlays lose. Your job is to protect the bettor's bankroll while identifying genuine opportunities. Grade each leg A/B/C/D/F."""

    try:
        chat = LlmChat(
            api_key=_get_emergent_key(),
            session_id=f"analysis_{uuid.uuid4()}",
            system_message="You are a professional sports handicapper and betting analyst with 15+ years of experience. You are brutally honest about win probabilities. You specialize in identifying value, detecting bad bets, and protecting bankrolls. You grade every leg and always suggest improvements."
        )
        
        # Create image content for vision analysis
        image_content = ImageContent(image_base64=base64_image)
        msg = UserMessage(text=analysis_prompt, file_contents=[image_content])
        
        logger.info(f"Sending image to AI for analysis (size: {len(base64_image)} chars)")
        response = await chat.send_message(msg)
        logger.info(f"AI response received (length: {len(response)} chars)")
        
        # Parse JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                analysis_data = json.loads(json_match.group())
                logger.info("Successfully parsed AI response as JSON")
            except json.JSONDecodeError as je:
                logger.error(f"JSON parse error: {je}")
                analysis_data = {
                    "raw_analysis": response,
                    "overall_probability": 50,
                    "risk_level": "Unknown",
                    "bets": [],
                    "key_factors": ["Unable to parse detailed analysis"],
                    "improvements": []
                }
        else:
            logger.warning("No JSON found in AI response, using fallback")
            analysis_data = {
                "raw_analysis": response,
                "overall_probability": 50,
                "risk_level": "Unknown", 
                "bets": [],
                "key_factors": ["Unable to parse detailed analysis"],
                "improvements": []
            }
        
    except Exception as e:
        logger.error(f"AI analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    # Extract and transform analysis data for frontend
    overall_prob = analysis_data.get('overall_probability', 50)
    kelly_fraction = analysis_data.get('kelly_fraction', 0)
    bets = analysis_data.get('bets', [])
    
    # Calculate expected value from bets if available
    ev_percent = 0
    if bets:
        ev_values = [b.get('ev_percent', 0) for b in bets if b.get('ev_percent') is not None]
        if ev_values:
            ev_percent = sum(ev_values) / len(ev_values)
    
    # Determine recommendation based on probability and EV
    if overall_prob >= 65 and ev_percent >= 0:
        recommendation = "STRONG BET"
    elif overall_prob >= 55:
        recommendation = "BET"
    elif overall_prob >= 45:
        recommendation = "SMALL/SKIP"
    else:
        recommendation = "PASS"
    
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
    if overall_prob >= 60:
        # Get user email for admin display
        bet_user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
        bet_user_email = bet_user.get("email", "Unknown") if bet_user else "Unknown"
        
        # Build a descriptive summary from individual bets
        bet_descriptions = [b.get('description', '') for b in bets if b.get('description')]
        bet_details = " | ".join(bet_descriptions[:3]) if bet_descriptions else analysis_data.get('sport', 'Bet Slip')
        
        await db.top_bets.insert_one({
            "id": str(uuid.uuid4()),
            "analysis_id": analysis_id,
            "user_id": user_id,
            "user_email": bet_user_email,
            "win_probability": overall_prob,
            "confidence_score": min(10, max(1, int(overall_prob / 10))),
            "expected_value": ev_percent,
            "kelly_percentage": kelly_fraction * 100,
            "recommendation": recommendation,
            "sport": analysis_data.get('sport', 'Unknown'),
            "bet_type": analysis_data.get('bet_type', 'parlay'),
            "bet_details": bet_details,
            "individual_bets": [
                {
                    "description": b.get('description', ''),
                    "individual_probability": b.get('win_probability', 50),
                    "odds": b.get('odds', ''),
                }
                for b in bets[:6]
            ],
            "positive_factors": analysis_data.get('positive_factors', [])[:5],
            "risk_factors": analysis_data.get('risk_factors', [])[:5],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Return data in format frontend expects with ALL rich data
    return {
        "id": analysis_id,
        # Core metrics
        "win_probability": overall_prob,
        "recommendation": recommendation,
        "expected_value": ev_percent,
        "kelly_percentage": kelly_fraction * 100,
        "confidence_score": min(10, max(1, int(overall_prob / 10))),
        "risk_level": analysis_data.get('risk_level', 'Medium'),
        
        # Bet details
        "sport": analysis_data.get('sport', 'Unknown'),
        "bet_type": analysis_data.get('bet_type', 'straight'),
        "total_odds": analysis_data.get('total_odds', ''),
        "potential_payout": analysis_data.get('potential_payout', ''),
        
        # Individual bets with full breakdown
        "bets": bets,
        "individual_bets": [
            {
                "description": b.get('description', ''),
                "odds": b.get('odds', ''),
                "bet_type": b.get('bet_type', 'spread'),
                "individual_probability": b.get('win_probability', 50),
                "ev_percent": b.get('ev_percent', 0),
                "reasoning": b.get('reasoning', b.get('analysis', ''))
            }
            for b in bets
        ],
        
        # Factors
        "risk_factors": analysis_data.get('risk_factors', []),
        "positive_factors": analysis_data.get('positive_factors', []),
        "key_factors": analysis_data.get('key_factors', []),
        
        # Improvement suggestions
        "improvements": analysis_data.get('improvements', []),
        "improvement_suggestions": [
            {
                "type": "tip",
                "title": imp,
                "description": imp,
                "impact": "Could improve win probability"
            }
            for imp in analysis_data.get('improvements', [])
        ],
        
        # Parlay comparison
        "parlay_vs_straight": analysis_data.get('parlay_vs_straight', None),
        
        # Full analysis for detailed view
        "analysis": analysis_data,
        
        # Usage info
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


# ===== USER STATS =====
@api_router.get("/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user's betting performance statistics"""
    user_id = current_user['user_id']
    
    # Get analyses with outcomes (capped for performance)
    analyses = await db.analyses.find(
        {"user_id": user_id, "outcome": {"$exists": True}}
    ).sort("created_at", -1).to_list(500)
    
    total_tracked = len(analyses)
    
    if total_tracked == 0:
        return {
            "total_tracked": 0,
            "bets_won": 0,
            "bets_lost": 0,
            "bets_push": 0,
            "win_rate": 0,
            "accuracy_rate": 0,
            "total_profit": 0,
            "roi": 0,
            "followed_recommendations": 0
        }
    
    bets_won = len([a for a in analyses if a.get('outcome') == 'won'])
    bets_lost = len([a for a in analyses if a.get('outcome') == 'lost'])
    bets_push = len([a for a in analyses if a.get('outcome') == 'push'])
    
    # Win rate (excluding pushes)
    win_loss_total = bets_won + bets_lost
    win_rate = round((bets_won / win_loss_total * 100), 1) if win_loss_total > 0 else 0
    
    # Calculate AI accuracy - AI is "accurate" if high probability bets won or low probability bets lost
    accurate_predictions = 0
    for a in analyses:
        prob = a.get('analysis', {}).get('overall_probability', 50)
        outcome = a.get('outcome')
        if outcome == 'push':
            continue
        if (prob >= 50 and outcome == 'won') or (prob < 50 and outcome == 'lost'):
            accurate_predictions += 1
    
    accuracy_rate = round((accurate_predictions / win_loss_total * 100), 1) if win_loss_total > 0 else 0
    
    # Calculate profit/loss (if stake/payout data exists)
    total_profit = 0
    total_stake = 0
    for a in analyses:
        stake = a.get('stake_amount', 0) or 0
        payout = a.get('payout_amount', 0) or 0
        total_stake += stake
        if a.get('outcome') == 'won':
            total_profit += (payout - stake)
        elif a.get('outcome') == 'lost':
            total_profit -= stake
    
    roi = round((total_profit / total_stake * 100), 1) if total_stake > 0 else 0
    
    # Count followed recommendations (bets where AI recommended "BET" and user won)
    followed_recommendations = 0
    for a in analyses:
        rec = (a.get('analysis', {}).get('recommendation', '') or '').lower()
        if ('bet' in rec or 'place' in rec or 'recommend' in rec) and a.get('outcome') == 'won':
            followed_recommendations += 1
    
    return {
        "total_tracked": total_tracked,
        "bets_won": bets_won,
        "bets_lost": bets_lost,
        "bets_push": bets_push,
        "win_rate": win_rate,
        "accuracy_rate": accuracy_rate,
        "total_profit": round(total_profit, 2),
        "roi": roi,
        "followed_recommendations": followed_recommendations
    }


# ===== PUBLIC STATS (for landing page social proof) =====
@api_router.get("/public-stats")
async def get_public_stats():
    """Get public statistics for landing page - no auth required"""
    # Total users
    total_users = await db.users.count_documents({})
    
    # Total analyses
    total_analyses = await db.analyses.count_documents({})
    
    # Pro users
    pro_users = await db.subscriptions.count_documents({"subscription_status": "active"})
    
    # Recent activity (analyses in last 24 hours)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    recent_analyses = await db.analyses.count_documents({
        "created_at": {"$gte": yesterday.isoformat()}
    })
    
    # Calculate AI accuracy from marked outcomes (capped for performance)
    outcomes = await db.analyses.find(
        {"outcome": {"$exists": True}},
        {"analysis.overall_probability": 1, "outcome": 1}
    ).sort("created_at", -1).to_list(500)
    
    accurate = 0
    total_marked = 0
    for o in outcomes:
        if o.get('outcome') in ['won', 'lost']:
            total_marked += 1
            prob = o.get('analysis', {}).get('overall_probability', 50)
            if (prob >= 50 and o.get('outcome') == 'won') or (prob < 50 and o.get('outcome') == 'lost'):
                accurate += 1
    
    ai_accuracy = round((accurate / total_marked * 100), 1) if total_marked > 0 else 67.5  # Default to decent accuracy
    
    return {
        "total_users": total_users,
        "total_analyses": total_analyses,
        "pro_users": pro_users,
        "analyses_today": recent_analyses,
        "ai_accuracy": ai_accuracy,
        "active_now": max(1, len(rate_limiter.requests))  # Approximate active users
    }


# ===== ADMIN ROUTES =====
@api_router.get("/admin/stats")
async def admin_get_stats(admin_user: dict = Depends(get_admin_user)):
    stats = await get_admin_stats(db)
    return stats

@api_router.get("/admin/users")
async def admin_get_users(
    skip: int = 0,
    limit: int = 500,
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


@api_router.post("/admin/users/{user_id}/reset-usage")
async def admin_reset_usage(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Reset a user's analysis count to 0 (fix free trial issues)"""
    await db.user_usage.update_one(
        {"user_id": user_id},
        {"$set": {"analyses_count": 0}},
        upsert=True
    )
    logger.info(f"Admin reset usage for user {user_id}")
    return {"message": "Usage reset to 0 — user now has 5 free analyses"}


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
    top_bets_raw = await db.top_bets.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich old-format entries with missing fields
    enriched = []
    for bet in top_bets_raw:
        # If old format, extract from analysis_summary
        summary = bet.get("analysis_summary", {})
        
        if not bet.get("user_email"):
            user = await db.users.find_one({"id": bet.get("user_id")}, {"_id": 0, "email": 1})
            bet["user_email"] = user.get("email", "Unknown") if user else "Unknown"
        
        if not bet.get("confidence_score"):
            prob = bet.get("win_probability", 50)
            bet["confidence_score"] = min(10, max(1, int(prob / 10)))
        
        if bet.get("expected_value") is None:
            bets_data = summary.get("bets", [])
            ev_vals = [b.get("ev_percent", 0) for b in bets_data if b.get("ev_percent") is not None]
            bet["expected_value"] = sum(ev_vals) / len(ev_vals) if ev_vals else 0
        
        if bet.get("kelly_percentage") is None:
            bet["kelly_percentage"] = summary.get("kelly_fraction", 0) * 100
        
        if not bet.get("recommendation"):
            prob = bet.get("win_probability", 50)
            ev = bet.get("expected_value", 0)
            if prob >= 65 and ev >= 0:
                bet["recommendation"] = "STRONG BET"
            elif prob >= 55:
                bet["recommendation"] = "BET"
            elif prob >= 45:
                bet["recommendation"] = "SMALL/SKIP"
            else:
                bet["recommendation"] = "PASS"
        
        if not bet.get("bet_details"):
            bets_data = summary.get("bets", [])
            descs = [b.get("description", "") for b in bets_data if b.get("description")]
            bet["bet_details"] = " | ".join(descs[:3]) if descs else summary.get("sport", "Bet Slip")
        
        if not bet.get("individual_bets"):
            bets_data = summary.get("bets", [])
            bet["individual_bets"] = [
                {
                    "description": b.get("description", ""),
                    "individual_probability": b.get("win_probability", 50),
                    "odds": b.get("odds", ""),
                }
                for b in bets_data[:6]
            ]
        
        if not bet.get("positive_factors"):
            bet["positive_factors"] = summary.get("positive_factors", [])[:5]
        if not bet.get("risk_factors"):
            bet["risk_factors"] = summary.get("risk_factors", [])[:5]
        if not bet.get("sport"):
            bet["sport"] = summary.get("sport", "Unknown")
        
        # Remove the heavy analysis_summary from response
        bet.pop("analysis_summary", None)
        enriched.append(bet)
    
    return {"top_bets": enriched}

@api_router.get("/admin/top-bets/stats")
async def admin_get_top_bets_stats(admin_user: dict = Depends(get_admin_user)):
    total = await db.top_bets.count_documents({})
    elite = await db.top_bets.count_documents({"win_probability": {"$gte": 80}})
    strong = await db.top_bets.count_documents({"win_probability": {"$gte": 70, "$lt": 80}})
    good = await db.top_bets.count_documents({"win_probability": {"$gte": 60, "$lt": 70}})
    avg_pipeline = [{"$group": {"_id": None, "avg_prob": {"$avg": "$win_probability"}}}]
    avg_result = await db.top_bets.aggregate(avg_pipeline).to_list(1)
    avg_prob = round(avg_result[0]['avg_prob'], 1) if avg_result else 0
    
    return {
        "total_top_bets": total,
        "elite_bets_80_plus": elite,
        "strong_bets_70_79": strong,
        "good_bets_60_69": good,
        "average_probability": avg_prob
    }


# ===== STRIPE WEBHOOK =====
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        stripe_checkout = StripeCheckout(api_key=_get_stripe_key(), webhook_url="")
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
            await asyncio.sleep(7200)  # Every 2 hours
            logger.info("Running scheduled auto-resolution...")
            resolver = AutoResolverService(db)
            result = await resolver.resolve_picks()
            logger.info(f"Auto-resolution: {result}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Auto-resolve error: {e}")
            await asyncio.sleep(300)


async def periodic_auto_generate_picks():
    """Background task to auto-generate new picks daily"""
    while True:
        try:
            # Wait 6 hours between generation attempts
            await asyncio.sleep(21600)
            
            logger.info("Checking if new picks need to be generated...")
            
            # Check if we have recent active picks (within 20 hours)
            twenty_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=20)).isoformat()
            recent_active = await db.daily_picks.count_documents({
                "is_active": True,
                "created_at": {"$gte": twenty_hours_ago}
            })
            
            if recent_active < 2:
                logger.info(f"Only {recent_active} recent picks found. Generating new picks...")
                smart_service = SmartPicksService(db)
                result = await smart_service.generate_smart_picks(force=True)
                logger.info(f"Auto-generation result: {result}")
            else:
                logger.info(f"Found {recent_active} recent active picks. Skipping generation.")
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Auto-generate picks error: {e}")
            await asyncio.sleep(600)


@app.on_event("startup")
async def startup_event():
    # Start auto-resolve task
    task1 = asyncio.create_task(periodic_auto_resolve())
    _background_tasks.append(task1)
    
    # Start auto-generate picks task
    task2 = asyncio.create_task(periodic_auto_generate_picks())
    _background_tasks.append(task2)
    
    logger.info("Started background tasks")
    
    # Schedule initial tasks to run AFTER server is ready (non-blocking)
    asyncio.create_task(delayed_startup_tasks())


async def delayed_startup_tasks():
    """Run startup tasks after a delay to ensure server is ready first"""
    await asyncio.sleep(10)
    
    # STEP 0a: Ensure admin account exists (critical for fresh DB / production Atlas)
    try:
        admin_email = os.environ.get('ADMIN_EMAIL', 'hundojeff@icloud.com')
        admin_user = await db.users.find_one({"email": admin_email})
        if not admin_user:
            from routes.deps import get_password_hash
            admin_password = os.environ.get('ADMIN_PASSWORD', 'Boo-boo600$')
            user_id = str(uuid.uuid4())
            await db.users.insert_one({
                "id": user_id,
                "email": admin_email,
                "password_hash": get_password_hash(admin_password),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_admin": True,
                "is_banned": False
            })
            await db.subscriptions.insert_one({
                "user_id": user_id,
                "email": admin_email,
                "subscription_status": "active",
                "subscription_start": datetime.now(timezone.utc).isoformat(),
                "granted_by_admin": True
            })
            await db.user_usage.insert_one({
                "user_id": user_id,
                "analyses_count": 0,
                "device_fingerprints": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Admin account auto-created for {admin_email}")
        else:
            logger.info(f"Admin account exists for {admin_email}")
    except Exception as e:
        logger.error(f"Failed to ensure admin account: {e}")

    # STEP 0b: Clean up duplicate bot_pick_history entries (keep 1 per date)
    try:
        pipeline = [
            {"$group": {"_id": "$date", "count": {"$sum": 1}, "ids": {"$push": "$id"}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        duplicates = await db.bot_pick_history.aggregate(pipeline).to_list(100)
        for dup in duplicates:
            remove_ids = dup['ids'][1:]
            await db.bot_pick_history.delete_many({"id": {"$in": remove_ids}})
            if remove_ids:
                logger.info(f"Cleaned {len(remove_ids)} duplicate bot picks for date {dup['_id']}")
    except Exception as e:
        logger.warning(f"Bot pick dedup cleanup: {e}")

    # STEP 0c: Auto-expire subscriptions older than 30 days
    try:
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        expired = await db.subscriptions.find({
            "subscription_status": "active",
            "subscription_start": {"$lt": thirty_days_ago}
        }).to_list(100)
        for sub in expired:
            # Skip admin user
            user = await db.users.find_one({"id": sub['user_id']}, {"_id": 0, "email": 1})
            if user and user.get('email') == os.environ.get('ADMIN_EMAIL', 'hundojeff@icloud.com'):
                continue
            await db.subscriptions.update_one(
                {"user_id": sub['user_id']},
                {"$set": {"subscription_status": "expired", "expired_at": datetime.now(timezone.utc).isoformat()}}
            )
            logger.info(f"Auto-expired subscription for user {sub['user_id']} (started: {sub.get('subscription_start')})")
    except Exception as e:
        logger.warning(f"Subscription expiry check: {e}")


    
    # STEP 0b: Log API key status for debugging
    api_key = os.environ.get('ODDS_API_KEY', '')
    if api_key:
        logger.info(f"ODDS_API_KEY is SET (length={len(api_key)}, starts with {api_key[:4]}...)")
    else:
        logger.error("ODDS_API_KEY is NOT SET - all odds features will be empty!")
    
    # STEP 1: Warm up odds cache (prevents empty dashboard on fresh deploy)
    # Use warmup mode so failures don't trigger circuit breaker for user requests
    try:
        from routes.odds_client import fetch_odds, fetch_events, set_warmup_mode, reset_circuit_breaker
        set_warmup_mode(True)
        logger.info("Starting odds cache warmup (warmup mode ON — failures won't trigger circuit breaker)...")
        
        # Sequentially fetch the most important sports data (skip if cache is fresh)
        for sport_key in ['basketball_nba', 'icehockey_nhl', 'basketball_ncaab']:
            try:
                # Check if MongoDB cache is fresh (< 60 min) to skip API call
                cache_key = f"odds_cache_{sport_key}_h2h_spreads_totals"
                cached = await db.api_cache.find_one({"key": cache_key})
                if cached and cached.get('updated_at'):
                    from datetime import datetime as dt, timezone as tz
                    try:
                        cache_time = dt.fromisoformat(cached['updated_at'].replace('Z', '+00:00'))
                        age = (dt.now(tz.utc) - cache_time).total_seconds()
                        if age < 3600:
                            logger.info(f"Skipping warmup for {sport_key} — cache is {int(age)}s old")
                            continue
                    except (ValueError, TypeError):
                        pass
                data = await fetch_odds(sport_key, 'h2h,spreads,totals', db=db)
                if data:
                    logger.info(f"Warmed cache for {sport_key}: {len(data)} games")
                else:
                    logger.warning(f"No data returned for {sport_key} during warmup")
            except Exception as e:
                logger.warning(f"Warmup fetch failed for {sport_key}: {e}")
            await asyncio.sleep(2)  # Respect rate limits
        
        # Fetch events for player props
        for sport_key in ['basketball_nba']:
            try:
                events = await fetch_events(sport_key, db=db)
                if events:
                    logger.info(f"Warmed events cache for {sport_key}: {len(events)} events")
            except Exception as e:
                logger.warning(f"Warmup events fetch failed for {sport_key}: {e}")
            await asyncio.sleep(2)
        
        # Reset circuit breaker after warmup so user requests get a clean slate
        reset_circuit_breaker()
        logger.info("Odds cache warmup completed — circuit breaker reset for live requests")
    except Exception as e:
        logger.warning(f"Cache warmup failed (non-critical): {e}")
        # Still reset circuit breaker even if warmup fails
        try:
            from routes.odds_client import reset_circuit_breaker
            reset_circuit_breaker()
        except Exception:
            pass
    
    # STEP 2: Auto-resolve old picks
    try:
        resolver = AutoResolverService(db)
        await resolver.resolve_picks()
        logger.info("Initial auto-resolve completed")
    except Exception as e:
        logger.warning(f"Initial auto-resolve failed: {e}")
    
    # STEP 3: Generate picks on startup if needed
    try:
        twenty_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=20)).isoformat()
        recent_count = await db.daily_picks.count_documents({
            "is_active": True,
            "created_at": {"$gte": twenty_hours_ago}
        })
        if recent_count < 2:
            logger.info("No recent picks found. Generating on startup...")
            smart_service = SmartPicksService(db)
            await smart_service.generate_smart_picks(force=True)
    except Exception as e:
        logger.warning(f"Initial picks generation failed: {e}")

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
# Include modular route files
app.include_router(auth.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(picks.router, prefix="/api")
app.include_router(streams.router, prefix="/api")
app.include_router(usa_sports.router, prefix="/api")
app.include_router(bankroll.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(referrals.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(admin_analytics.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(performance.router, prefix="/api")
app.include_router(parlay_builder.router, prefix="/api")
app.include_router(pro_tools.router, prefix="/api")
app.include_router(support.router, prefix="/api")

# Include main API router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== SECURITY: Add security headers =====
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
