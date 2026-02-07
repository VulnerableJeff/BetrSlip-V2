"""
USA Sports routes - Live scores and schedules for American sports
"""
from fastapi import APIRouter, HTTPException
import logging

from services.usa_sports_service import get_usa_sports_service

router = APIRouter(prefix="/usa-sports", tags=["USA Sports"])
logger = logging.getLogger(__name__)


@router.get("/games")
async def get_all_usa_games():
    """Get games for all USA sports (NBA, NFL, NHL, MLB, College)"""
    service = get_usa_sports_service()
    games = await service.get_all_games()
    
    total = sum(len(g) for g in games.values())
    
    return {
        "success": True,
        "total_games": total,
        "games": games
    }


@router.get("/games/{sport}")
async def get_sport_games(sport: str):
    """Get games for a specific sport"""
    valid_sports = ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAF', 'NCAAB']
    
    if sport.upper() not in valid_sports:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid sport. Valid options: {', '.join(valid_sports)}"
        )
    
    service = get_usa_sports_service()
    games = await service.get_sport_games(sport.upper())
    
    return {
        "success": True,
        "sport": sport.upper(),
        "count": len(games),
        "games": games
    }
