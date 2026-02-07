"""
Advanced Analytics routes - Line Movements, Parlay Optimizer, Odds Comparison
Premium features for BetrSlip
"""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging
import aiohttp
import os
import random
import uuid

from .deps import db, get_current_user

router = APIRouter(tags=["Analytics"])
logger = logging.getLogger(__name__)

ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')


# ===== LINE MOVEMENT ALERTS =====
@router.get("/line-movements")
async def get_line_movements():
    """Get recent significant line movements"""
    # Generate realistic line movement data based on current games
    # In production, this would track actual historical odds changes
    
    movements = []
    
    # Simulated line movements based on typical sharp action patterns
    sample_movements = [
        {
            "game": "Lakers vs Celtics",
            "bet_type": "Spread",
            "old_line": "-3.5",
            "new_line": "-5.0",
            "change": -1.5,
            "direction": "down",
            "significance": "high",
            "insight": "Sharp money detected - 73% of dollars on Celtics"
        },
        {
            "game": "Chiefs vs Bills",
            "bet_type": "Total",
            "old_line": "48.5",
            "new_line": "51.0",
            "change": 2.5,
            "direction": "up",
            "significance": "high",
            "insight": "Weather forecast improved - expecting more scoring"
        },
        {
            "game": "Warriors vs Suns",
            "bet_type": "Moneyline",
            "old_line": "-150",
            "new_line": "-175",
            "change": -25,
            "direction": "down",
            "significance": "medium",
            "insight": "Key player confirmed to play"
        },
        {
            "game": "Eagles vs Cowboys",
            "bet_type": "Spread",
            "old_line": "-6.5",
            "new_line": "-7.5",
            "change": -1.0,
            "direction": "down",
            "significance": "medium",
            "insight": "Reverse line movement - public on Cowboys but line moving away"
        }
    ]
    
    # Randomize which movements to show
    num_to_show = random.randint(2, 4)
    movements = random.sample(sample_movements, min(num_to_show, len(sample_movements)))
    
    return {
        "success": True,
        "count": len(movements),
        "movements": movements,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


# ===== PARLAY OPTIMIZER =====
@router.get("/parlay-optimizer")
async def get_parlay_suggestions(current_user: dict = Depends(get_current_user)):
    """Get AI-optimized parlay suggestions"""
    
    # Get daily picks to use as parlay suggestions
    picks = await db.daily_picks.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("win_probability", -1).limit(6).to_list(6)
    
    suggestions = []
    
    for pick in picks:
        # Extract team name from title (e.g., "Boston Celtics +3.5 vs Los Angeles Lakers")
        title = pick.get('title', '')
        description = title if title else f"{pick.get('sport', 'NBA')} Pick"
        
        suggestions.append({
            "id": str(uuid.uuid4()),
            "description": description,
            "sport": pick.get('sport', 'NBA'),
            "bet_type": "Spread" if '+' in title or '-' in title else "Moneyline",
            "probability": pick.get('win_probability', 55),
            "ev": round(random.uniform(1, 8), 1),  # Simulated positive EV for picks
            "confidence": "high" if pick.get('win_probability', 0) >= 60 else "medium",
            "game": pick.get('title', ''),
            "odds": pick.get('odds', '-110')
        })
        })
    
    # Add some additional suggestions based on value
    additional = [
        {
            "id": str(uuid.uuid4()),
            "description": "Warriors -5.5 vs Suns",
            "sport": "NBA",
            "bet_type": "Spread",
            "probability": 58,
            "ev": 3.2,
            "confidence": "high",
            "game": "Warriors @ Suns",
            "odds": "-110"
        },
        {
            "id": str(uuid.uuid4()),
            "description": "Chiefs/Bills Over 49.5",
            "sport": "NFL",
            "bet_type": "Total",
            "probability": 54,
            "ev": 2.1,
            "confidence": "medium",
            "game": "Chiefs @ Bills",
            "odds": "-110"
        },
        {
            "id": str(uuid.uuid4()),
            "description": "Bruins ML vs Rangers",
            "sport": "NHL",
            "bet_type": "Moneyline",
            "probability": 62,
            "ev": 4.5,
            "confidence": "high",
            "game": "Bruins @ Rangers",
            "odds": "-135"
        }
    ]
    
    # Combine and sort by EV
    all_suggestions = suggestions + additional
    all_suggestions.sort(key=lambda x: x.get('ev', 0), reverse=True)
    
    return {
        "success": True,
        "count": len(all_suggestions),
        "suggestions": all_suggestions[:8]
    }


# ===== ODDS COMPARISON =====
@router.get("/odds-comparison")
async def get_odds_comparison(sport: str = Query(default="NBA")):
    """Compare odds across multiple sportsbooks"""
    
    # Simulated odds comparison data
    # In production, this would fetch from Odds API with multiple bookmakers
    
    sport_games = {
        "NBA": [
            {
                "game": "Lakers vs Celtics",
                "time": "7:30 PM ET",
                "odds": {
                    "DraftKings": {"spread": -3.5, "ml": -150, "total": 224.5},
                    "FanDuel": {"spread": -3.0, "ml": -145, "total": 225.0},
                    "BetMGM": {"spread": -3.5, "ml": -155, "total": 224.0},
                    "Caesars": {"spread": -3.0, "ml": -140, "total": 224.5}
                },
                "best_spread": -3.0,
                "best_value": {"book": "FanDuel", "type": "spread"},
                "edge": 2.3
            },
            {
                "game": "Warriors vs Suns",
                "time": "10:00 PM ET",
                "odds": {
                    "DraftKings": {"spread": -5.5, "ml": -220, "total": 230.0},
                    "FanDuel": {"spread": -5.5, "ml": -215, "total": 229.5},
                    "BetMGM": {"spread": -5.0, "ml": -210, "total": 230.5},
                    "Caesars": {"spread": -5.5, "ml": -225, "total": 230.0}
                },
                "best_spread": -5.0,
                "best_value": {"book": "BetMGM", "type": "spread"},
                "edge": 1.8
            }
        ],
        "NFL": [
            {
                "game": "Chiefs vs Bills",
                "time": "Sunday 6:30 PM ET",
                "odds": {
                    "DraftKings": {"spread": -2.5, "ml": -135, "total": 49.5},
                    "FanDuel": {"spread": -2.5, "ml": -130, "total": 50.0},
                    "BetMGM": {"spread": -3.0, "ml": -140, "total": 49.5},
                    "Caesars": {"spread": -2.5, "ml": -132, "total": 49.0}
                },
                "best_spread": -2.5,
                "best_value": {"book": "FanDuel", "type": "moneyline"},
                "edge": 3.1
            }
        ],
        "NHL": [
            {
                "game": "Bruins vs Rangers",
                "time": "7:00 PM ET",
                "odds": {
                    "DraftKings": {"spread": -1.5, "ml": -145, "total": 5.5},
                    "FanDuel": {"spread": -1.5, "ml": -140, "total": 5.5},
                    "BetMGM": {"spread": -1.5, "ml": -150, "total": 6.0},
                    "Caesars": {"spread": -1.5, "ml": -142, "total": 5.5}
                },
                "best_spread": -1.5,
                "best_value": {"book": "FanDuel", "type": "moneyline"},
                "edge": 1.5
            }
        ],
        "MLB": [
            {
                "game": "Yankees vs Red Sox",
                "time": "7:05 PM ET",
                "odds": {
                    "DraftKings": {"spread": -1.5, "ml": -165, "total": 8.5},
                    "FanDuel": {"spread": -1.5, "ml": -160, "total": 8.5},
                    "BetMGM": {"spread": -1.5, "ml": -170, "total": 9.0},
                    "Caesars": {"spread": -1.5, "ml": -162, "total": 8.5}
                },
                "best_spread": -1.5,
                "best_value": {"book": "FanDuel", "type": "moneyline"},
                "edge": 2.0
            }
        ]
    }
    
    comparisons = sport_games.get(sport.upper(), [])
    
    return {
        "success": True,
        "sport": sport.upper(),
        "count": len(comparisons),
        "comparisons": comparisons
    }
