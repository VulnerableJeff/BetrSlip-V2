import os
import aiohttp
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
import json

logger = logging.getLogger(__name__)

# The Odds API configuration
ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')
ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

# In-memory cache
_cache = {}
CACHE_DURATION = timedelta(minutes=5)  # Cache for 5 minutes


class SportsDataService:
    """Service to fetch real-time sports data for bet analysis"""
    
    @staticmethod
    async def get_live_odds(sport: str = 'americanfootball_nfl') -> Optional[Dict]:
        """
        Fetch live odds from The Odds API
        Supports: americanfootball_nfl, basketball_nba, baseball_mlb, etc.
        """
        cache_key = f'odds_{sport}'
        
        # Check cache first
        if cache_key in _cache:
            cached_data, cached_time = _cache[cache_key]
            if datetime.now(timezone.utc) - cached_time < CACHE_DURATION:
                logger.info(f"Using cached odds for {sport}")
                return cached_data
        
        if not ODDS_API_KEY:
            logger.warning("ODDS_API_KEY not set, skipping live odds fetch")
            return None
        
        try:
            url = f'{ODDS_API_BASE}/sports/{sport}/odds/'
            params = {
                'apiKey': ODDS_API_KEY,
                'regions': 'us',
                'markets': 'h2h,spreads,totals',
                'oddsFormat': 'american'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Cache the result
                        _cache[cache_key] = (data, datetime.now(timezone.utc))
                        logger.info(f"Fetched {len(data)} live odds for {sport}")
                        return data
                    else:
                        logger.error(f"Odds API error: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error fetching odds: {str(e)}")
            return None
    
    @staticmethod
    async def find_matching_games(team_names: List[str], sport: str = 'americanfootball_nfl') -> List[Dict]:
        """Find games matching team names from bet slip"""
        odds_data = await SportsDataService.get_live_odds(sport)
        if not odds_data:
            return []
        
        matching_games = []
        for game in odds_data:
            home_team = game.get('home_team', '').lower()
            away_team = game.get('away_team', '').lower()
            
            for team_name in team_names:
                team_lower = team_name.lower()
                # Fuzzy matching for team names
                if (team_lower in home_team or team_lower in away_team or
                    home_team in team_lower or away_team in team_lower):
                    matching_games.append(game)
                    break
        
        return matching_games
    
    @staticmethod
    def extract_team_names(bet_details: str) -> List[str]:
        """Extract team names from bet details text"""
        # Common team name patterns
        common_teams = [
            'chiefs', 'bills', 'cowboys', 'eagles', 'packers', '49ers', 'ravens', 
            'bengals', 'dolphins', 'jets', 'patriots', 'steelers', 'browns', 'raiders',
            'lakers', 'warriors', 'celtics', 'nets', 'bucks', 'heat', 'suns', 'nuggets',
            'yankees', 'red sox', 'dodgers', 'astros', 'mets', 'cubs', 'braves'
        ]
        
        found_teams = []
        bet_lower = bet_details.lower() if bet_details else ''
        
        for team in common_teams:
            if team in bet_lower:
                found_teams.append(team)
        
        return found_teams
    
    @staticmethod
    async def enrich_bet_analysis(individual_bets: List[Dict], bet_details: str) -> Dict:
        """
        Enrich bet analysis with real-time sports data
        Returns additional context for AI analysis
        """
        enrichment = {
            'live_odds_available': False,
            'market_context': [],
            'sharp_indicators': [],
            'consensus_data': []
        }
        
        # Extract team names
        team_names = SportsDataService.extract_team_names(bet_details)
        if not team_names:
            return enrichment
        
        # Try to match with NFL first, then NBA, then MLB
        sports_to_try = [
            'americanfootball_nfl',
            'basketball_nba', 
            'baseball_mlb'
        ]
        
        for sport in sports_to_try:
            matching_games = await SportsDataService.find_matching_games(team_names, sport)
            if matching_games:
                enrichment['live_odds_available'] = True
                
                for game in matching_games:
                    game_context = {
                        'home_team': game.get('home_team'),
                        'away_team': game.get('away_team'),
                        'commence_time': game.get('commence_time'),
                        'bookmakers_count': len(game.get('bookmakers', []))
                    }
                    
                    # Analyze bookmaker consensus
                    bookmakers = game.get('bookmakers', [])
                    if bookmakers:
                        # Get average odds across bookmakers
                        all_odds = []
                        for bookmaker in bookmakers:
                            for market in bookmaker.get('markets', []):
                                for outcome in market.get('outcomes', []):
                                    all_odds.append({
                                        'bookmaker': bookmaker.get('title'),
                                        'market': market.get('key'),
                                        'team': outcome.get('name'),
                                        'price': outcome.get('price'),
                                        'point': outcome.get('point')
                                    })
                        
                        game_context['odds_sample'] = all_odds[:5]  # First 5 for context
                        
                        # Check for line movement (simplified)
                        if len(bookmakers) > 3:
                            enrichment['sharp_indicators'].append(
                                f"Multiple books ({len(bookmakers)}) carrying this game - high liquidity"
                            )
                    
                    enrichment['market_context'].append(game_context)
                
                break  # Found matching sport, stop searching
        
        return enrichment


async def get_enhanced_context_for_analysis(individual_bets: List[Dict], bet_details: str) -> str:
    """
    Get enhanced context string to add to AI prompt
    """
    enrichment = await SportsDataService.enrich_bet_analysis(individual_bets, bet_details)
    
    if not enrichment['live_odds_available']:
        return ""
    
    context_parts = ["\\n\\nREAL-TIME MARKET DATA:"]
    
    # Add market context
    for game_data in enrichment['market_context']:
        context_parts.append(f"\\nGame: {game_data['away_team']} @ {game_data['home_team']}")
        context_parts.append(f"Books offering: {game_data['bookmakers_count']}")
        
        if game_data.get('odds_sample'):
            context_parts.append("Current market odds sample:")
            for odds in game_data['odds_sample'][:3]:
                context_parts.append(
                    f"  - {odds['bookmaker']}: {odds['team']} {odds['market']} {odds.get('price', 'N/A')}"
                )
    
    # Add sharp indicators
    if enrichment['sharp_indicators']:
        context_parts.append("\\nMarket indicators:")
        for indicator in enrichment['sharp_indicators']:
            context_parts.append(f"  - {indicator}")
    
    context_parts.append("\\nConsider this real-time market data in your probability assessment.")
    
    return "\\n".join(context_parts)
