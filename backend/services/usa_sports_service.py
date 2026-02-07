"""
USA Sports Service - Live scores and schedules for NBA, NFL, NHL, MLB, College
Uses ESPN's free public API endpoints
"""
import logging
import aiohttp
from typing import Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

# ESPN API endpoints (free, no key required)
ESPN_ENDPOINTS = {
    'NBA': 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    'NFL': 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    'NHL': 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    'MLB': 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    'NCAAF': 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    'NCAAB': 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
}


class USASportsService:
    """Service for fetching USA sports data from ESPN API"""
    
    async def get_all_games(self) -> Dict[str, List[Dict]]:
        """Fetch games for all sports"""
        all_games = {}
        
        async with aiohttp.ClientSession() as session:
            for sport, url in ESPN_ENDPOINTS.items():
                try:
                    games = await self._fetch_sport_games(session, sport, url)
                    all_games[sport] = games
                except Exception as e:
                    logger.error(f"Error fetching {sport}: {e}")
                    all_games[sport] = []
        
        return all_games
    
    async def get_sport_games(self, sport: str) -> List[Dict]:
        """Fetch games for a specific sport"""
        url = ESPN_ENDPOINTS.get(sport.upper())
        if not url:
            return []
        
        async with aiohttp.ClientSession() as session:
            return await self._fetch_sport_games(session, sport, url)
    
    async def _fetch_sport_games(self, session: aiohttp.ClientSession, sport: str, url: str) -> List[Dict]:
        """Fetch and parse games from ESPN API"""
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    logger.warning(f"ESPN API returned {response.status} for {sport}")
                    return []
                
                data = await response.json()
                events = data.get('events', [])
                
                games = []
                for event in events[:15]:  # Limit to 15 games per sport
                    game = self._parse_event(event)
                    if game:
                        games.append(game)
                
                return games
                
        except Exception as e:
            logger.error(f"Error fetching {sport} from ESPN: {e}")
            return []
    
    def _parse_event(self, event: Dict) -> Dict:
        """Parse ESPN event data into our format"""
        try:
            competitions = event.get('competitions', [])
            if not competitions:
                return None
            
            competition = competitions[0]
            competitors = competition.get('competitors', [])
            
            if len(competitors) < 2:
                return None
            
            # ESPN lists home team first, away second (usually)
            home_team = None
            away_team = None
            
            for comp in competitors:
                if comp.get('homeAway') == 'home':
                    home_team = comp
                else:
                    away_team = comp
            
            # Fallback if homeAway not specified
            if not home_team or not away_team:
                home_team = competitors[0]
                away_team = competitors[1]
            
            # Get status
            status_obj = competition.get('status', {})
            status_type = status_obj.get('type', {})
            status_detail = status_type.get('shortDetail', status_type.get('description', 'Scheduled'))
            
            # Get broadcast info
            broadcasts = competition.get('broadcasts', [])
            broadcast_names = []
            for b in broadcasts:
                for name in b.get('names', []):
                    broadcast_names.append(name)
            broadcast = ', '.join(broadcast_names[:3]) if broadcast_names else None
            
            # Get game time
            game_date = event.get('date', '')
            try:
                dt = datetime.fromisoformat(game_date.replace('Z', '+00:00'))
                time_str = dt.strftime('%I:%M %p ET')
            except:
                time_str = ''
            
            return {
                'id': event.get('id'),
                'name': event.get('name', ''),
                'homeTeam': home_team.get('team', {}).get('displayName', 'TBD'),
                'homeLogo': home_team.get('team', {}).get('logo', ''),
                'homeScore': home_team.get('score', ''),
                'homeRecord': home_team.get('records', [{}])[0].get('summary', '') if home_team.get('records') else '',
                'awayTeam': away_team.get('team', {}).get('displayName', 'TBD'),
                'awayLogo': away_team.get('team', {}).get('logo', ''),
                'awayScore': away_team.get('score', ''),
                'awayRecord': away_team.get('records', [{}])[0].get('summary', '') if away_team.get('records') else '',
                'status': status_detail,
                'time': time_str,
                'broadcast': broadcast,
                'venue': competition.get('venue', {}).get('fullName', ''),
            }
            
        except Exception as e:
            logger.error(f"Error parsing event: {e}")
            return None


# Singleton
_service = None

def get_usa_sports_service() -> USASportsService:
    global _service
    if _service is None:
        _service = USASportsService()
    return _service
