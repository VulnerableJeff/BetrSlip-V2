"""
Auto Resolver Service - Automatically resolves pick outcomes from game scores
"""

import os
import re
import logging
import aiohttp
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


def _get_odds_api_key():
    """Read ODDS_API_KEY at runtime, not import time."""
    return os.environ.get('ODDS_API_KEY', '')

SPORT_KEYS = [
    'americanfootball_nfl',
    'basketball_nba',
    'basketball_ncaab',
    'baseball_mlb',
    'icehockey_nhl'
]


class AutoResolverService:
    """Service to automatically resolve pick outcomes"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def fetch_completed_scores(self, days_back: int = 3) -> List[Dict]:
        """Fetch completed game scores from The Odds API"""
        if not _get_odds_api_key():
            logger.warning("No ODDS_API_KEY found for score fetching")
            return []
        
        all_scores = []
        
        async with aiohttp.ClientSession() as session:
            for sport in SPORT_KEYS:
                try:
                    url = f"https://api.the-odds-api.com/v4/sports/{sport}/scores"
                    params = {
                        'apiKey': _get_odds_api_key(),
                        'daysFrom': days_back
                    }
                    
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as response:
                        if response.status == 200:
                            games = await response.json()
                            for game in games:
                                if game.get('completed', False):
                                    game['sport_key'] = sport
                                    all_scores.append(game)
                except Exception as e:
                    logger.error(f"Error fetching {sport} scores: {e}")
                    continue
        
        return all_scores
    
    def normalize_team_name(self, name: str) -> str:
        """Normalize team name for matching"""
        if not name:
            return ""
        name = name.lower().strip()
        # Remove city prefixes
        name = re.sub(r'^(los angeles|la|new york|ny|san francisco|sf|golden state|gs)\s+', '', name)
        # Remove common suffixes
        name = re.sub(r'\s+(fc|sc|city|united)$', '', name)
        return name
    
    def parse_pick_details(self, title: str) -> Optional[Dict]:
        """Parse pick title to extract team, bet type, and line"""
        title_lower = title.lower()
        
        # Spread pattern: "Team -3.5 vs Opponent" or "Team +3.5 vs Opponent"
        spread_match = re.search(r'(.+?)\s+([\+\-]\d+\.?\d*)\s+vs\s+(.+)', title_lower)
        if spread_match:
            return {
                'type': 'spread',
                'team': spread_match.group(1).strip(),
                'spread': float(spread_match.group(2)),
                'opponent': spread_match.group(3).strip()
            }
        
        # Moneyline pattern: "Team ML vs Opponent"
        ml_match = re.search(r'(.+?)\s+ml\s+vs\s+(.+)', title_lower)
        if ml_match:
            return {
                'type': 'moneyline',
                'team': ml_match.group(1).strip(),
                'opponent': ml_match.group(2).strip()
            }
        
        # Simple "Team vs Opponent" pattern
        vs_match = re.search(r'(.+?)\s+vs\s+(.+)', title_lower)
        if vs_match:
            return {
                'type': 'moneyline',
                'team': vs_match.group(1).strip(),
                'opponent': vs_match.group(2).strip()
            }
        
        return None
    
    def determine_outcome(self, pick_details: Dict, game_scores: Dict) -> Optional[str]:
        """Determine if a pick won, lost, or pushed based on game scores"""
        if not pick_details or not game_scores:
            return None
        
        home_team = self.normalize_team_name(game_scores.get('home_team', ''))
        away_team = self.normalize_team_name(game_scores.get('away_team', ''))
        
        scores = game_scores.get('scores', [])
        if not scores or len(scores) < 2:
            return None
        
        home_score = None
        away_score = None
        for score in scores:
            score_team = self.normalize_team_name(score.get('name', ''))
            if score_team == home_team or home_team in score_team or score_team in home_team:
                home_score = int(score.get('score', 0))
            elif score_team == away_team or away_team in score_team or score_team in away_team:
                away_score = int(score.get('score', 0))
        
        if home_score is None or away_score is None:
            return None
        
        pick_team = self.normalize_team_name(pick_details.get('team', ''))
        
        # Match pick team to home or away
        picked_home = pick_team in home_team or home_team in pick_team
        picked_away = pick_team in away_team or away_team in pick_team
        
        if not picked_home and not picked_away:
            for word in pick_team.split():
                if len(word) > 3:
                    if word in home_team:
                        picked_home = True
                        break
                    elif word in away_team:
                        picked_away = True
                        break
        
        if not picked_home and not picked_away:
            return None
        
        picked_score = home_score if picked_home else away_score
        opponent_score = away_score if picked_home else home_score
        
        bet_type = pick_details.get('type', 'moneyline')
        
        if bet_type == 'spread':
            spread = pick_details.get('spread', 0)
            adjusted_score = picked_score + spread
            
            if adjusted_score > opponent_score:
                return 'won'
            elif adjusted_score < opponent_score:
                return 'lost'
            else:
                return 'push'
        else:  # moneyline
            if picked_score > opponent_score:
                return 'won'
            elif picked_score < opponent_score:
                return 'lost'
            else:
                return 'push'
    
    def match_pick_to_game(self, pick: Dict, completed_games: List[Dict]) -> Optional[Dict]:
        """Find the matching completed game for a pick"""
        pick_details = self.parse_pick_details(pick.get('title', ''))
        if not pick_details:
            return None
        
        pick_team = self.normalize_team_name(pick_details.get('team', ''))
        pick_opponent = self.normalize_team_name(pick_details.get('opponent', ''))
        pick_sport = pick.get('sport', '').lower()
        
        sport_map = {
            'nfl': 'americanfootball_nfl',
            'nba': 'basketball_nba',
            'mlb': 'baseball_mlb',
            'nhl': 'icehockey_nhl',
            'football': 'americanfootball_nfl',
            'basketball': 'basketball_nba',
            'baseball': 'baseball_mlb',
            'hockey': 'icehockey_nhl'
        }
        
        expected_sport = sport_map.get(pick_sport, '')
        
        for game in completed_games:
            game_sport = game.get('sport_key', '')
            
            if expected_sport and game_sport != expected_sport:
                continue
            
            home_team = self.normalize_team_name(game.get('home_team', ''))
            away_team = self.normalize_team_name(game.get('away_team', ''))
            
            team_match = (
                pick_team in home_team or home_team in pick_team or
                pick_team in away_team or away_team in pick_team
            )
            
            opponent_match = (
                pick_opponent in home_team or home_team in pick_opponent or
                pick_opponent in away_team or away_team in pick_opponent
            )
            
            if team_match and opponent_match:
                return game
            
            if team_match:
                for word in pick_team.split():
                    if len(word) > 4 and (word in home_team or word in away_team):
                        return game
        
        return None
    
    async def resolve_picks(self) -> Dict:
        """Automatically resolve pending pick outcomes from daily_picks AND bot_pick_history"""
        try:
            # Get pending picks from daily_picks
            pending_picks = await self.db.daily_picks.find({
                "$or": [
                    {"outcome": {"$exists": False}},
                    {"outcome": None},
                    {"outcome": "pending"}
                ]
            }, {"_id": 0}).to_list(100)

            # Also get pending picks from bot_pick_history (Bet of the Day)
            pending_bot_picks = await self.db.bot_pick_history.find({
                "$or": [
                    {"outcome": {"$exists": False}},
                    {"outcome": None}
                ]
            }, {"_id": 0}).to_list(50)

            all_pending = len(pending_picks) + len(pending_bot_picks)
            if all_pending == 0:
                return {"message": "No pending picks to resolve", "resolved": 0}
            
            # Fetch completed game scores
            completed_games = await self.fetch_completed_scores()
            if not completed_games:
                return {"message": "No completed game scores available", "resolved": 0}
            
            resolved_count = 0
            resolved_picks = []
            
            # Resolve daily_picks
            for pick in pending_picks:
                matching_game = self.match_pick_to_game(pick, completed_games)
                
                if matching_game:
                    pick_details = self.parse_pick_details(pick.get('title', ''))
                    
                    if pick_details:
                        outcome = self.determine_outcome(pick_details, matching_game)
                        
                        if outcome:
                            await self.db.daily_picks.update_one(
                                {"id": pick['id']},
                                {"$set": {
                                    "outcome": outcome,
                                    "outcome_updated_at": datetime.now(timezone.utc).isoformat(),
                                    "outcome_updated_by": "Auto-Resolver",
                                    "matched_game": {
                                        "home_team": matching_game.get('home_team'),
                                        "away_team": matching_game.get('away_team'),
                                        "scores": matching_game.get('scores'),
                                        "completed_at": matching_game.get('commence_time')
                                    }
                                }}
                            )
                            resolved_count += 1
                            resolved_picks.append({
                                "title": pick.get('title'),
                                "outcome": outcome,
                                "game": f"{matching_game.get('away_team')} @ {matching_game.get('home_team')}"
                            })
                            logger.info(f"Auto-resolved daily_pick '{pick.get('title')}' as {outcome}")

            # Resolve bot_pick_history (Bet of the Day picks)
            for pick in pending_bot_picks:
                # Build a compatible pick object for matching
                game_str = pick.get('game', '')
                pick_name = pick.get('pick', '')

                # Try to match game
                matching_game = None
                for game in completed_games:
                    if not game.get('completed'):
                        continue
                    home = game.get('home_team', '')
                    away = game.get('away_team', '')
                    if (home in game_str or away in game_str or
                        home in pick_name or away in pick_name):
                        matching_game = game
                        break

                if matching_game:
                    pick_details = self.parse_pick_details(pick_name)

                    if pick_details:
                        outcome = self.determine_outcome(pick_details, matching_game)

                        if outcome:
                            await self.db.bot_pick_history.update_one(
                                {"id": pick['id']},
                                {"$set": {
                                    "outcome": outcome,
                                    "outcome_updated_at": datetime.now(timezone.utc).isoformat()
                                }}
                            )
                            resolved_count += 1
                            resolved_picks.append({
                                "title": pick_name,
                                "outcome": outcome,
                                "source": "bet_of_day"
                            })
                            logger.info(f"Auto-resolved bot_pick '{pick_name}' as {outcome}")
            
            return {
                "message": f"Auto-resolved {resolved_count} picks",
                "resolved": resolved_count,
                "picks": resolved_picks
            }
            
        except Exception as e:
            logger.error(f"Error in resolve_picks: {e}")
            return {"message": f"Error: {str(e)}", "resolved": 0}


async def get_auto_resolver_service(db: AsyncIOMotorDatabase) -> AutoResolverService:
    """Factory function to create AutoResolverService"""
    return AutoResolverService(db)
