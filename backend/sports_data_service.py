import os
import aiohttp
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone, timedelta
import json
import re

logger = logging.getLogger(__name__)

# The Odds API configuration
ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')
ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

# ESPN API base
ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

# In-memory cache
_cache = {}
CACHE_DURATION = timedelta(minutes=5)  # Cache for 5 minutes

# Team ID mappings for ESPN API
ESPN_NFL_TEAMS = {
    'chiefs': {'id': '12', 'name': 'Kansas City Chiefs'},
    'bills': {'id': '2', 'name': 'Buffalo Bills'},
    'cowboys': {'id': '6', 'name': 'Dallas Cowboys'},
    'eagles': {'id': '21', 'name': 'Philadelphia Eagles'},
    'packers': {'id': '9', 'name': 'Green Bay Packers'},
    '49ers': {'id': '25', 'name': 'San Francisco 49ers'},
    'niners': {'id': '25', 'name': 'San Francisco 49ers'},
    'ravens': {'id': '33', 'name': 'Baltimore Ravens'},
    'bengals': {'id': '4', 'name': 'Cincinnati Bengals'},
    'browns': {'id': '5', 'name': 'Cleveland Browns'},
    'steelers': {'id': '23', 'name': 'Pittsburgh Steelers'},
    'patriots': {'id': '17', 'name': 'New England Patriots'},
    'dolphins': {'id': '15', 'name': 'Miami Dolphins'},
    'jets': {'id': '20', 'name': 'New York Jets'},
    'raiders': {'id': '13', 'name': 'Las Vegas Raiders'},
    'chargers': {'id': '24', 'name': 'Los Angeles Chargers'},
    'rams': {'id': '14', 'name': 'Los Angeles Rams'},
    'seahawks': {'id': '26', 'name': 'Seattle Seahawks'},
    'broncos': {'id': '7', 'name': 'Denver Broncos'},
    'saints': {'id': '18', 'name': 'New Orleans Saints'},
    'falcons': {'id': '1', 'name': 'Atlanta Falcons'},
    'panthers': {'id': '29', 'name': 'Carolina Panthers'},
    'buccaneers': {'id': '27', 'name': 'Tampa Bay Buccaneers'},
    'bucs': {'id': '27', 'name': 'Tampa Bay Buccaneers'},
    'lions': {'id': '8', 'name': 'Detroit Lions'},
    'bears': {'id': '3', 'name': 'Chicago Bears'},
    'vikings': {'id': '16', 'name': 'Minnesota Vikings'},
    'texans': {'id': '34', 'name': 'Houston Texans'},
    'colts': {'id': '11', 'name': 'Indianapolis Colts'},
    'jaguars': {'id': '30', 'name': 'Jacksonville Jaguars'},
    'titans': {'id': '10', 'name': 'Tennessee Titans'},
    'commanders': {'id': '28', 'name': 'Washington Commanders'},
    'giants': {'id': '19', 'name': 'New York Giants'},
    'cardinals': {'id': '22', 'name': 'Arizona Cardinals'},
}

ESPN_NBA_TEAMS = {
    'lakers': {'id': '13', 'name': 'Los Angeles Lakers'},
    'warriors': {'id': '9', 'name': 'Golden State Warriors'},
    'celtics': {'id': '2', 'name': 'Boston Celtics'},
    'nets': {'id': '17', 'name': 'Brooklyn Nets'},
    'bucks': {'id': '15', 'name': 'Milwaukee Bucks'},
    'heat': {'id': '14', 'name': 'Miami Heat'},
    'suns': {'id': '21', 'name': 'Phoenix Suns'},
    'nuggets': {'id': '7', 'name': 'Denver Nuggets'},
    'sixers': {'id': '20', 'name': 'Philadelphia 76ers'},
    '76ers': {'id': '20', 'name': 'Philadelphia 76ers'},
    'knicks': {'id': '18', 'name': 'New York Knicks'},
    'bulls': {'id': '4', 'name': 'Chicago Bulls'},
    'clippers': {'id': '12', 'name': 'LA Clippers'},
    'mavericks': {'id': '6', 'name': 'Dallas Mavericks'},
    'mavs': {'id': '6', 'name': 'Dallas Mavericks'},
    'grizzlies': {'id': '29', 'name': 'Memphis Grizzlies'},
    'thunder': {'id': '25', 'name': 'Oklahoma City Thunder'},
    'timberwolves': {'id': '16', 'name': 'Minnesota Timberwolves'},
    'wolves': {'id': '16', 'name': 'Minnesota Timberwolves'},
    'cavaliers': {'id': '5', 'name': 'Cleveland Cavaliers'},
    'cavs': {'id': '5', 'name': 'Cleveland Cavaliers'},
}


class SportsDataService:
    """Service to fetch real-time sports data for bet analysis"""
    
    @staticmethod
    def get_team_info(team_name: str) -> Optional[Dict]:
        """Get ESPN team ID and league from team name"""
        team_lower = team_name.lower().strip()
        
        # Check NFL teams
        for key, info in ESPN_NFL_TEAMS.items():
            if key in team_lower or team_lower in key:
                return {'id': info['id'], 'name': info['name'], 'league': 'nfl', 'sport': 'football'}
        
        # Check NBA teams
        for key, info in ESPN_NBA_TEAMS.items():
            if key in team_lower or team_lower in key:
                return {'id': info['id'], 'name': info['name'], 'league': 'nba', 'sport': 'basketball'}
        
        return None
    
    @staticmethod
    async def get_team_record(team_name: str) -> Optional[Dict]:
        """Get team's current season record"""
        team_info = SportsDataService.get_team_info(team_name)
        if not team_info:
            return None
        
        cache_key = f"record_{team_info['id']}_{team_info['league']}"
        if cache_key in _cache:
            cached_data, cached_time = _cache[cache_key]
            if datetime.now(timezone.utc) - cached_time < CACHE_DURATION:
                return cached_data
        
        try:
            url = f"{ESPN_API_BASE}/{team_info['sport']}/{team_info['league']}/teams/{team_info['id']}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        team = data.get('team', {})
                        
                        record_items = team.get('record', {}).get('items', [])
                        record_data = {
                            'team_name': team.get('displayName', team_name),
                            'overall': None,
                            'home': None,
                            'away': None,
                            'conference': None,
                            'division': None,
                            'streak': None
                        }
                        
                        for item in record_items:
                            desc = item.get('description', '').lower()
                            summary = item.get('summary', '')
                            
                            if not desc or desc == '':
                                record_data['overall'] = summary
                            elif 'home' in desc:
                                record_data['home'] = summary
                            elif 'away' in desc:
                                record_data['away'] = summary
                            elif 'conference' in desc:
                                record_data['conference'] = summary
                            elif 'division' in desc:
                                record_data['division'] = summary
                        
                        # Get standing info
                        standing = team.get('standingSummary', '')
                        record_data['standing'] = standing
                        
                        _cache[cache_key] = (record_data, datetime.now(timezone.utc))
                        return record_data
        except Exception as e:
            logger.error(f"Error fetching team record: {str(e)}")
        
        return None
    
    @staticmethod
    async def get_recent_games(team_name: str, limit: int = 5) -> List[Dict]:
        """Get team's recent game results (last N games)"""
        team_info = SportsDataService.get_team_info(team_name)
        if not team_info:
            return []
        
        cache_key = f"schedule_{team_info['id']}_{team_info['league']}"
        if cache_key in _cache:
            cached_entry = _cache[cache_key]
            if isinstance(cached_entry, tuple) and len(cached_entry) == 2:
                cached_data, cached_time = cached_entry
                if datetime.now(timezone.utc) - cached_time < CACHE_DURATION:
                    return cached_data[:limit]
        
        try:
            url = f"{ESPN_API_BASE}/{team_info['sport']}/{team_info['league']}/teams/{team_info['id']}/schedule"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        events = data.get('events', [])
                        
                        recent_games = []
                        for event in events:
                            competition = event.get('competitions', [{}])[0]
                            status = competition.get('status', {}).get('type', {})
                            
                            # Only include completed games
                            if status.get('completed', False):
                                competitors = competition.get('competitors', [])
                                
                                home_team = None
                                away_team = None
                                for comp in competitors:
                                    # Handle score as either dict or int/string
                                    score_val = comp.get('score', 0)
                                    if isinstance(score_val, dict):
                                        score_val = int(score_val.get('value', 0))
                                    else:
                                        try:
                                            score_val = int(score_val) if score_val else 0
                                        except (ValueError, TypeError):
                                            score_val = 0
                                    
                                    team_data = {
                                        'name': comp.get('team', {}).get('displayName', ''),
                                        'score': score_val,
                                        'winner': comp.get('winner', False)
                                    }
                                    
                                    if comp.get('homeAway') == 'home':
                                        home_team = team_data
                                    else:
                                        away_team = team_data
                                
                                if home_team and away_team:
                                    # Determine if our team won
                                    our_team_home = team_info['name'].lower() in home_team['name'].lower()
                                    our_team = home_team if our_team_home else away_team
                                    opponent = away_team if our_team_home else home_team
                                    
                                    game_result = {
                                        'date': event.get('date', ''),
                                        'opponent': opponent['name'],
                                        'home_away': 'home' if our_team_home else 'away',
                                        'score': f"{our_team['score']}-{opponent['score']}",
                                        'result': 'W' if our_team['winner'] else 'L',
                                        'point_diff': our_team['score'] - opponent['score']
                                    }
                                    recent_games.append(game_result)
                        
                        # Sort by date descending and take last N games
                        recent_games.sort(key=lambda x: x['date'], reverse=True)
                        _cache[cache_key] = (recent_games, datetime.now(timezone.utc))
                        return recent_games[:limit]
        except Exception as e:
            logger.error(f"Error fetching recent games: {str(e)}")
        
        return []
    
    @staticmethod
    async def get_team_stats(team_name: str) -> Optional[Dict]:
        """Get key team statistics"""
        team_info = SportsDataService.get_team_info(team_name)
        if not team_info:
            return None
        
        cache_key = f"stats_{team_info['id']}_{team_info['league']}"
        if cache_key in _cache:
            cached_entry = _cache[cache_key]
            if isinstance(cached_entry, tuple) and len(cached_entry) == 2:
                cached_data, cached_time = cached_entry
                if datetime.now(timezone.utc) - cached_time < CACHE_DURATION:
                    return cached_data
        
        try:
            url = f"{ESPN_API_BASE}/{team_info['sport']}/{team_info['league']}/teams/{team_info['id']}/statistics"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        stats = {
                            'team_name': team_info['name'],
                            'league': team_info['league'].upper(),
                            'key_stats': {}
                        }
                        
                        # Parse stats from results
                        results = data.get('results', {}).get('stats', {})
                        if not results:
                            results = data.get('stats', {})
                        
                        categories = results.get('categories', []) if isinstance(results, dict) else []
                        
                        # Key stats to extract
                        important_stats = [
                            'pointsPerGame', 'pointsAllowedPerGame', 'totalPointsPerGame',
                            'yardsPerGame', 'passingYardsPerGame', 'rushingYardsPerGame',
                            'turnovers', 'takeaways', 'thirdDownConvPct', 'redZoneEfficiency',
                            'offensiveRebounds', 'defensiveRebounds', 'assists', 'steals', 'blocks'
                        ]
                        
                        for category in categories:
                            for stat in category.get('stats', []):
                                stat_name = stat.get('name', '')
                                if stat_name in important_stats or 'PerGame' in stat_name:
                                    display_name = stat.get('displayName', stat_name)
                                    value = stat.get('value', stat.get('displayValue', 'N/A'))
                                    stats['key_stats'][display_name] = value
                        
                        _cache[cache_key] = stats
                        return stats
        except Exception as e:
            logger.error(f"Error fetching team stats: {str(e)}")
        
        return None
    
    @staticmethod
    def calculate_form_rating(recent_games: List[Dict]) -> Dict:
        """Calculate team form from recent games"""
        if not recent_games:
            return {'form': 'Unknown', 'wins': 0, 'losses': 0, 'avg_margin': 0}
        
        wins = sum(1 for g in recent_games if g['result'] == 'W')
        losses = len(recent_games) - wins
        avg_margin = sum(g['point_diff'] for g in recent_games) / len(recent_games)
        
        # Form string (last 5 results)
        form_str = ''.join(g['result'] for g in recent_games[:5])
        
        # Rating
        win_pct = wins / len(recent_games)
        if win_pct >= 0.8:
            rating = 'Hot 🔥'
        elif win_pct >= 0.6:
            rating = 'Good'
        elif win_pct >= 0.4:
            rating = 'Mixed'
        elif win_pct >= 0.2:
            rating = 'Struggling'
        else:
            rating = 'Cold ❄️'
        
        return {
            'form': form_str,
            'rating': rating,
            'wins': wins,
            'losses': losses,
            'avg_margin': round(avg_margin, 1),
            'games_analyzed': len(recent_games)
        }
    
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
    Includes: live odds, team records, recent form, key stats
    """
    context_parts = []
    
    # Extract team names
    team_names = SportsDataService.extract_team_names(bet_details)
    
    # Get enhanced team data for each team found
    if team_names:
        context_parts.append("\n\n📊 TEAM DATA & ANALYSIS:")
        
        for team_name in team_names[:2]:  # Limit to 2 teams
            team_context = []
            
            # Get team record
            record = await SportsDataService.get_team_record(team_name)
            if record:
                team_context.append(f"\n**{record['team_name']}**")
                if record.get('overall'):
                    team_context.append(f"  Record: {record['overall']}")
                if record.get('home'):
                    team_context.append(f"  Home: {record['home']} | Away: {record.get('away', 'N/A')}")
                if record.get('standing'):
                    team_context.append(f"  Standing: {record['standing']}")
            
            # Get recent games (form)
            recent_games = await SportsDataService.get_recent_games(team_name, limit=5)
            if recent_games:
                form = SportsDataService.calculate_form_rating(recent_games)
                team_context.append(f"  Last 5: {form['form']} ({form['rating']})")
                team_context.append(f"  Recent margin: {'+' if form['avg_margin'] > 0 else ''}{form['avg_margin']} pts/game")
                
                # Show last 3 games
                team_context.append("  Recent results:")
                for game in recent_games[:3]:
                    team_context.append(f"    {game['result']} vs {game['opponent']} ({game['score']})")
            
            # Get key stats
            stats = await SportsDataService.get_team_stats(team_name)
            if stats and stats.get('key_stats'):
                key_stats = stats['key_stats']
                team_context.append("  Key Stats:")
                stat_count = 0
                for stat_name, value in key_stats.items():
                    if stat_count < 5:  # Limit to 5 most relevant stats
                        team_context.append(f"    - {stat_name}: {value}")
                        stat_count += 1
            
            if team_context:
                context_parts.extend(team_context)
    
    # Get live odds data
    enrichment = await SportsDataService.enrich_bet_analysis(individual_bets, bet_details)
    
    if enrichment['live_odds_available']:
        context_parts.append("\n\n📈 REAL-TIME MARKET DATA:")
        
        # Add market context
        for game_data in enrichment['market_context']:
            context_parts.append(f"\nGame: {game_data['away_team']} @ {game_data['home_team']}")
            context_parts.append(f"Books offering: {game_data['bookmakers_count']}")
            
            if game_data.get('odds_sample'):
                context_parts.append("Current market odds sample:")
                for odds in game_data['odds_sample'][:3]:
                    context_parts.append(
                        f"  - {odds['bookmaker']}: {odds['team']} {odds['market']} {odds.get('price', 'N/A')}"
                    )
        
        # Add sharp indicators
        if enrichment['sharp_indicators']:
            context_parts.append("\nMarket indicators:")
            for indicator in enrichment['sharp_indicators']:
                context_parts.append(f"  - {indicator}")
    
    if context_parts:
        context_parts.append("\n\n⚠️ Use this data to adjust your probability assessment. Consider recent form, head-to-head history, and market sentiment.")
    
    return "\n".join(context_parts)
