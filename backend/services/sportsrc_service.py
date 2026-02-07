"""
SportSRC API Service - Live Sports Data & Streaming
Provides live matches, scores, and stream embed URLs
"""
import os
import logging
import aiohttp
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

SPORTSRC_API_KEY = os.environ.get('SPORTSRC_API_KEY', '')
SPORTSRC_BASE_URL = "https://api.sportsrc.org/v2/"


class SportSRCService:
    """Service for fetching live sports data and streams from SportSRC API"""
    
    def __init__(self):
        self.api_key = SPORTSRC_API_KEY
        self.headers = {"X-API-KEY": self.api_key}
    
    async def get_account_info(self) -> Dict:
        """Get API account status and usage"""
        if not self.api_key:
            return {"error": "No API key configured"}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SPORTSRC_BASE_URL}?type=account",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return {"error": f"API returned status {response.status}"}
        except Exception as e:
            logger.error(f"SportSRC account check error: {e}")
            return {"error": str(e)}
    
    async def get_live_matches(self, sport: str = "football") -> Dict:
        """Get all live/in-progress matches"""
        if not self.api_key:
            return {"success": False, "error": "No API key configured", "data": []}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SPORTSRC_BASE_URL}?type=matches&sport={sport}&status=inprogress",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data
                    return {"success": False, "error": f"API error: {response.status}", "data": []}
        except Exception as e:
            logger.error(f"SportSRC live matches error: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    async def get_upcoming_matches(self, sport: str = "football") -> Dict:
        """Get upcoming matches"""
        if not self.api_key:
            return {"success": False, "error": "No API key configured", "data": []}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SPORTSRC_BASE_URL}?type=matches&sport={sport}&status=upcoming",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return {"success": False, "error": f"API error: {response.status}", "data": []}
        except Exception as e:
            logger.error(f"SportSRC upcoming matches error: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    async def get_match_details(self, match_id: str) -> Dict:
        """Get detailed match info including stream URLs"""
        if not self.api_key:
            return {"success": False, "error": "No API key configured"}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{SPORTSRC_BASE_URL}?type=detail&id={match_id}",
                    headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    return {"success": False, "error": f"API error: {response.status}"}
        except Exception as e:
            logger.error(f"SportSRC match details error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_all_live_with_streams(self) -> List[Dict]:
        """Get all live matches with their stream URLs - optimized for frontend"""
        live_data = await self.get_live_matches()
        
        if not live_data.get('success') or not live_data.get('data'):
            return []
        
        matches_with_streams = []
        
        for league_group in live_data.get('data', []):
            league_info = league_group.get('league', {})
            
            for match in league_group.get('matches', []):
                match_id = match.get('id')
                
                # Get stream URLs for this match
                details = await self.get_match_details(match_id)
                
                streams = []
                if details.get('success') and details.get('data', {}).get('sources'):
                    streams = [
                        {
                            "id": s.get('id'),
                            "streamNo": s.get('streamNo'),
                            "embedUrl": s.get('embedUrl'),
                            "hd": s.get('hd', False),
                            "source": s.get('source', 'unknown')
                        }
                        for s in details['data']['sources'][:4]  # Limit to 4 streams
                    ]
                
                venue_data = details.get('data', {}).get('info', {}) if details.get('success') else {}
                venue = venue_data.get('venue', {}) if venue_data else {}
                
                matches_with_streams.append({
                    "id": match_id,
                    "title": match.get('title'),
                    "league": {
                        "name": league_info.get('name'),
                        "country": league_info.get('country'),
                        "logo": league_info.get('logo'),
                        "flag": league_info.get('flag')
                    },
                    "teams": match.get('teams'),
                    "score": match.get('score', {}).get('display', '0 - 0'),
                    "status": match.get('status_detail', 'Live'),
                    "timestamp": match.get('timestamp'),
                    "venue": venue.get('stadium', '') if venue else '',
                    "streams": streams,
                    "has_streams": len(streams) > 0
                })
        
        return matches_with_streams


# Singleton instance
_service_instance = None

def get_sportsrc_service() -> SportSRCService:
    """Get or create SportSRC service instance"""
    global _service_instance
    if _service_instance is None:
        _service_instance = SportSRCService()
    return _service_instance
