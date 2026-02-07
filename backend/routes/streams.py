"""
Live Streams routes - Real-time sports streaming integration via SportSRC API
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import logging

from .deps import get_current_user
from services.sportsrc_service import get_sportsrc_service

router = APIRouter(tags=["Live Streams"])
logger = logging.getLogger(__name__)


@router.get("/streams/live")
async def get_live_streams():
    """Get all currently live matches with stream links - public endpoint"""
    service = get_sportsrc_service()
    matches = await service.get_all_live_with_streams()
    
    return {
        "success": True,
        "count": len(matches),
        "matches": matches
    }


@router.get("/streams/upcoming")
async def get_upcoming_streams():
    """Get upcoming matches"""
    service = get_sportsrc_service()
    data = await service.get_upcoming_matches()
    
    if not data.get('success'):
        return {"success": False, "error": data.get('error', 'Failed to fetch'), "matches": []}
    
    # Flatten the league-grouped structure
    matches = []
    for league_group in data.get('data', []):
        league_info = league_group.get('league', {})
        for match in league_group.get('matches', []):
            matches.append({
                "id": match.get('id'),
                "title": match.get('title'),
                "league": {
                    "name": league_info.get('name'),
                    "country": league_info.get('country'),
                    "logo": league_info.get('logo')
                },
                "teams": match.get('teams'),
                "timestamp": match.get('timestamp'),
                "status": match.get('status', 'upcoming')
            })
    
    return {
        "success": True,
        "count": len(matches),
        "matches": matches[:20]  # Limit to 20 upcoming
    }


@router.get("/streams/match/{match_id}")
async def get_match_streams(match_id: str):
    """Get detailed match info with all stream URLs"""
    service = get_sportsrc_service()
    data = await service.get_match_details(match_id)
    
    if not data.get('success'):
        raise HTTPException(status_code=404, detail="Match not found or API error")
    
    match_info = data.get('data', {}).get('match_info', {})
    sources = data.get('data', {}).get('sources', [])
    info = data.get('data', {}).get('info', {})
    
    return {
        "success": True,
        "match": {
            "id": match_info.get('id'),
            "title": match_info.get('title'),
            "status": match_info.get('status'),
            "status_detail": match_info.get('status_detail'),
            "teams": match_info.get('teams'),
            "score": match_info.get('score'),
            "league": match_info.get('league'),
            "venue": info.get('venue', {}),
            "referee": info.get('referee', {}),
            "managers": info.get('managers', {})
        },
        "streams": [
            {
                "id": s.get('id'),
                "streamNo": s.get('streamNo'),
                "embedUrl": s.get('embedUrl'),
                "hd": s.get('hd', False),
                "source": s.get('source', 'unknown'),
                "language": s.get('language', '')
            }
            for s in sources
        ]
    }


@router.get("/streams/status")
async def get_streams_api_status():
    """Check SportSRC API status and usage"""
    service = get_sportsrc_service()
    data = await service.get_account_info()
    
    return {
        "success": True,
        "api_status": data
    }
