"""
Stream Sources Service - Aggregates multiple streaming sources for live games
"""
import os
import logging
import aiohttp
from typing import List, Dict, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')

# Popular free streaming sources (legal aggregators and official sources)
STREAM_SOURCES = {
    'NBA': [
        {'name': 'NBA League Pass', 'url': 'https://www.nba.com/watch', 'type': 'official'},
        {'name': 'ESPN', 'url': 'https://www.espn.com/watch/', 'type': 'official'},
        {'name': 'TNT Sports', 'url': 'https://www.tntdrama.com/sports', 'type': 'official'},
    ],
    'NFL': [
        {'name': 'NFL+', 'url': 'https://www.nfl.com/plus/', 'type': 'official'},
        {'name': 'ESPN', 'url': 'https://www.espn.com/watch/', 'type': 'official'},
        {'name': 'CBS Sports', 'url': 'https://www.cbssports.com/live/', 'type': 'official'},
        {'name': 'Fox Sports', 'url': 'https://www.foxsports.com/live', 'type': 'official'},
    ],
    'NHL': [
        {'name': 'ESPN+', 'url': 'https://www.espn.com/watch/', 'type': 'official'},
        {'name': 'NHL.tv', 'url': 'https://www.nhl.com/subscribe', 'type': 'official'},
    ],
    'MLB': [
        {'name': 'MLB.tv', 'url': 'https://www.mlb.com/tv', 'type': 'official'},
        {'name': 'ESPN', 'url': 'https://www.espn.com/watch/', 'type': 'official'},
    ],
    'UFC': [
        {'name': 'ESPN+ UFC', 'url': 'https://plus.espn.com/ufc', 'type': 'official'},
    ],
    'Soccer': [
        {'name': 'ESPN+', 'url': 'https://www.espn.com/watch/', 'type': 'official'},
        {'name': 'Peacock', 'url': 'https://www.peacocktv.com/sports', 'type': 'official'},
    ]
}

# Network to streaming platform mapping
NETWORK_STREAMS = {
    'ESPN': 'https://www.espn.com/watch/',
    'ESPN+': 'https://plus.espn.com/',
    'TNT': 'https://www.tntdrama.com/watchtnt',
    'ABC': 'https://abc.com/watch-live',
    'CBS': 'https://www.cbssports.com/live/',
    'FOX': 'https://www.foxsports.com/live',
    'NBC': 'https://www.nbcsports.com/live',
    'NBCSN': 'https://www.nbcsports.com/live',
    'NFL Network': 'https://www.nfl.com/network/watch',
    'NBA TV': 'https://www.nba.com/watch/nba-tv',
    'MLB Network': 'https://www.mlb.com/network/live',
    'NHL Network': 'https://www.nhl.com/info/network',
}


class StreamSourcesService:
    """Service to find and aggregate streaming sources for live games"""
    
    def __init__(self):
        self.session = None
    
    async def get_live_games_with_streams(self) -> List[Dict]:
        """Get live games with streaming source suggestions"""
        games = []
        
        if not ODDS_API_KEY:
            return games
        
        sport_mapping = {
            'basketball_nba': 'NBA',
            'americanfootball_nfl': 'NFL',
            'icehockey_nhl': 'NHL',
            'baseball_mlb': 'MLB'
        }
        
        async with aiohttp.ClientSession() as session:
            for sport_key, sport_name in sport_mapping.items():
                try:
                    # Get scores (includes live games)
                    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/scores"
                    params = {'apiKey': ODDS_API_KEY, 'daysFrom': 1}
                    
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status == 200:
                            api_games = await resp.json()
                            
                            for game in api_games:
                                # Check if game is live (has scores but not completed)
                                is_live = game.get('scores') and not game.get('completed')
                                is_upcoming = not game.get('scores') and not game.get('completed')
                                
                                if is_live or is_upcoming:
                                    scores = game.get('scores', [])
                                    score_str = ""
                                    if len(scores) >= 2:
                                        score_str = f"{scores[0].get('score', 0)} - {scores[1].get('score', 0)}"
                                    
                                    # Get streaming sources for this sport
                                    stream_sources = STREAM_SOURCES.get(sport_name, [])
                                    
                                    # Determine broadcast network (mock - would need real data)
                                    network = self._guess_network(sport_name, game)
                                    stream_url = NETWORK_STREAMS.get(network, stream_sources[0]['url'] if stream_sources else None)
                                    
                                    games.append({
                                        'id': game.get('id'),
                                        'title': f"{game.get('away_team', '')} vs {game.get('home_team', '')}",
                                        'sport': sport_name,
                                        'score': score_str if is_live else None,
                                        'quarter': 'LIVE' if is_live else 'Upcoming',
                                        'is_live': is_live,
                                        'commence_time': game.get('commence_time'),
                                        'network': network,
                                        'stream_url': None,  # Embed URLs require partnerships
                                        'external_url': stream_url,
                                        'stream_sources': stream_sources[:3],
                                        'home_team': game.get('home_team'),
                                        'away_team': game.get('away_team')
                                    })
                                    
                except Exception as e:
                    logger.error(f"Error fetching {sport_name} games: {e}")
                    continue
        
        # Sort: live games first, then by start time
        games.sort(key=lambda x: (not x.get('is_live', False), x.get('commence_time', '')))
        
        return games[:15]  # Limit to 15 games
    
    def _guess_network(self, sport: str, game: dict) -> str:
        """Guess the broadcast network based on sport and game time"""
        # In reality, this would come from the API or a schedule database
        # For now, return common networks per sport
        networks = {
            'NBA': ['ESPN', 'TNT', 'NBA TV', 'ABC'],
            'NFL': ['CBS', 'FOX', 'ESPN', 'NBC', 'NFL Network'],
            'NHL': ['ESPN', 'ESPN+', 'NHL Network'],
            'MLB': ['ESPN', 'FOX', 'MLB Network'],
        }
        import random
        sport_networks = networks.get(sport, ['ESPN'])
        return random.choice(sport_networks)
    
    def get_stream_sources_for_sport(self, sport: str) -> List[Dict]:
        """Get available streaming sources for a sport"""
        return STREAM_SOURCES.get(sport, [])
    
    def get_network_stream_url(self, network: str) -> Optional[str]:
        """Get streaming URL for a broadcast network"""
        return NETWORK_STREAMS.get(network)


async def get_stream_sources_service() -> StreamSourcesService:
    return StreamSourcesService()
