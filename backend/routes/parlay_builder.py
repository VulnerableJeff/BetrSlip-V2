"""
Parlay Builder Routes
- Build custom parlays from selections
- Calculate combined odds and EV
- Correlation warnings
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import math

from .deps import db, get_current_user

router = APIRouter(prefix="/parlay-builder", tags=["parlay-builder"])
logger = logging.getLogger(__name__)


class ParlayLeg(BaseModel):
    description: str
    odds: str  # American odds e.g. "-110", "+150"
    sport: str = "Unknown"
    game: str = ""
    probability: float = 50.0


class BuildParlayRequest(BaseModel):
    legs: List[ParlayLeg]
    stake: float = 10.0


def american_to_decimal(odds_str: str) -> float:
    try:
        odds = int(odds_str.replace('+', ''))
        if odds > 0:
            return 1 + (odds / 100)
        else:
            return 1 + (100 / abs(odds))
    except (ValueError, ZeroDivisionError):
        return 1.91  # default -110


def decimal_to_american(decimal_odds: float) -> str:
    if decimal_odds >= 2.0:
        american = int(round((decimal_odds - 1) * 100))
        return f"+{american}"
    else:
        american = int(round(-100 / (decimal_odds - 1)))
        return str(american)


@router.post("/calculate")
async def calculate_parlay(
    request: BuildParlayRequest,
    current_user: dict = Depends(get_current_user)
):
    """Calculate parlay odds, payout, and EV"""
    if len(request.legs) < 2:
        raise HTTPException(status_code=400, detail="Parlay requires at least 2 legs")
    if len(request.legs) > 15:
        raise HTTPException(status_code=400, detail="Maximum 15 legs allowed")

    combined_decimal = 1.0
    combined_prob = 1.0
    legs_analysis = []
    correlation_warnings = []

    # Check for correlations (same game)
    games_seen = {}
    for i, leg in enumerate(request.legs):
        game_key = leg.game.lower().strip() if leg.game else ''
        if game_key and game_key in games_seen:
            correlation_warnings.append(
                f"Legs {games_seen[game_key]+1} and {i+1} are from the same game - may be correlated"
            )
        if game_key:
            games_seen[game_key] = i

    for leg in request.legs:
        decimal = american_to_decimal(leg.odds)
        prob = leg.probability / 100
        implied = 1 / decimal
        edge = round((prob - implied) * 100, 1)

        combined_decimal *= decimal
        combined_prob *= prob

        legs_analysis.append({
            "description": leg.description,
            "odds": leg.odds,
            "decimal_odds": round(decimal, 2),
            "probability": leg.probability,
            "implied_probability": round(implied * 100, 1),
            "edge": edge,
            "sport": leg.sport
        })

    # Calculate parlay metrics
    payout = round(request.stake * combined_decimal, 2)
    profit = round(payout - request.stake, 2)
    parlay_prob = round(combined_prob * 100, 2)
    implied_parlay = round((1 / combined_decimal) * 100, 2)
    parlay_ev = round((combined_prob * profit - (1 - combined_prob) * request.stake), 2)
    parlay_ev_pct = round((parlay_ev / request.stake) * 100, 1)

    # Kelly for the parlay
    kelly = round(max(0, (combined_prob * combined_decimal - 1) / (combined_decimal - 1)) * 100, 1)

    # Individual bets comparison
    individual_ev = 0
    for leg in legs_analysis:
        dec = leg['decimal_odds']
        p = leg['probability'] / 100
        leg_ev = p * (dec - 1) * request.stake - (1 - p) * request.stake
        individual_ev += leg_ev
    individual_ev = round(individual_ev, 2)

    return {
        "legs": legs_analysis,
        "leg_count": len(request.legs),
        "stake": request.stake,
        "combined_odds": decimal_to_american(combined_decimal),
        "combined_decimal": round(combined_decimal, 2),
        "parlay_probability": parlay_prob,
        "implied_probability": implied_parlay,
        "potential_payout": payout,
        "potential_profit": profit,
        "expected_value": parlay_ev,
        "ev_percentage": parlay_ev_pct,
        "kelly_percentage": kelly,
        "individual_ev_total": individual_ev,
        "parlay_vs_individual": "Parlay" if parlay_ev > individual_ev else "Individual bets",
        "correlation_warnings": correlation_warnings,
        "recommendation": "BET" if parlay_ev > 0 and kelly > 0 else "PASS"
    }


@router.post("/save")
async def save_parlay(
    request: BuildParlayRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save a built parlay"""
    user_id = current_user['user_id']

    parlay = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "legs": [leg.dict() for leg in request.legs],
        "stake": request.stake,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.saved_parlays.insert_one(parlay)
    return {"message": "Parlay saved", "id": parlay['id']}


@router.get("/my-parlays")
async def get_my_parlays(current_user: dict = Depends(get_current_user)):
    """Get user's saved parlays"""
    user_id = current_user['user_id']
    parlays = await db.saved_parlays.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    return {"parlays": parlays}
