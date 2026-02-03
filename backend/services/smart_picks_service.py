"""
Smart Picks Service - Enhanced AI-powered sports betting analysis
Includes historical performance tracking, learning from past picks, and advanced analytics
Now with enhanced sports intelligence for smarter predictions
"""

import os
import re
import json
import logging
import aiohttp
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Sport mappings
SPORT_KEYS = {
    'NFL': 'americanfootball_nfl',
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb',
    'NHL': 'icehockey_nhl',
    'NCAAF': 'americanfootball_ncaaf',
    'NCAAB': 'basketball_ncaab'
}

SPORT_NAMES = {v: k for k, v in SPORT_KEYS.items()}


class SmartPicksService:
    """Enhanced AI picks service with learning capabilities and advanced analytics"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._intelligence = None
    
    async def _get_intelligence(self):
        """Lazy load enhanced intelligence service"""
        if self._intelligence is None:
            from services.enhanced_sports_intelligence import EnhancedSportsIntelligence
            self._intelligence = EnhancedSportsIntelligence(self.db)
        return self._intelligence
    
    async def get_historical_performance(self) -> Dict:
        """Get historical performance stats to inform AI decisions"""
        # Overall stats
        won = await self.db.daily_picks.count_documents({"outcome": "won"})
        lost = await self.db.daily_picks.count_documents({"outcome": "lost"})
        total = won + lost
        
        # Performance by sport
        sport_performance = {}
        for sport in ['NFL', 'NBA', 'MLB', 'NHL']:
            sport_won = await self.db.daily_picks.count_documents({"outcome": "won", "sport": sport})
            sport_lost = await self.db.daily_picks.count_documents({"outcome": "lost", "sport": sport})
            sport_total = sport_won + sport_lost
            if sport_total > 0:
                sport_performance[sport] = {
                    "won": sport_won,
                    "lost": sport_lost,
                    "win_rate": round(sport_won / sport_total * 100, 1)
                }
        
        # Performance by bet type (spread vs moneyline)
        spread_picks = await self.db.daily_picks.find(
            {"title": {"$regex": r"[\+\-]\d+\.?\d*", "$options": "i"}, "outcome": {"$in": ["won", "lost"]}}
        ).to_list(500)
        spread_won = sum(1 for p in spread_picks if p.get('outcome') == 'won')
        spread_total = len(spread_picks)
        
        ml_picks = await self.db.daily_picks.find(
            {"title": {"$regex": r"ML", "$options": "i"}, "outcome": {"$in": ["won", "lost"]}}
        ).to_list(500)
        ml_won = sum(1 for p in ml_picks if p.get('outcome') == 'won')
        ml_total = len(ml_picks)
        
        # Performance by confidence level
        confidence_performance = {}
        for conf_range in [(8, 10, "high"), (6, 7, "medium"), (1, 5, "low")]:
            min_conf, max_conf, label = conf_range
            conf_picks = await self.db.daily_picks.find({
                "confidence": {"$gte": min_conf, "$lte": max_conf},
                "outcome": {"$in": ["won", "lost"]}
            }).to_list(500)
            conf_won = sum(1 for p in conf_picks if p.get('outcome') == 'won')
            conf_total = len(conf_picks)
            if conf_total > 0:
                confidence_performance[label] = {
                    "won": conf_won,
                    "total": conf_total,
                    "win_rate": round(conf_won / conf_total * 100, 1)
                }
        
        # Recent losing streaks by team/pattern (to avoid)
        recent_losses = await self.db.daily_picks.find(
            {"outcome": "lost"}
        ).sort("outcome_updated_at", -1).limit(20).to_list(20)
        
        losing_patterns = []
        for loss in recent_losses:
            title = loss.get('title', '')
            # Extract team name
            team_match = re.search(r'^([A-Za-z\s]+?)(?:\s+[\+\-]|\s+ML)', title)
            if team_match:
                losing_patterns.append(team_match.group(1).strip())
        
        return {
            "overall": {
                "won": won,
                "lost": lost,
                "total": total,
                "win_rate": round(won / total * 100, 1) if total > 0 else 0
            },
            "by_sport": sport_performance,
            "by_bet_type": {
                "spread": {"won": spread_won, "total": spread_total, "win_rate": round(spread_won / spread_total * 100, 1) if spread_total > 0 else 0},
                "moneyline": {"won": ml_won, "total": ml_total, "win_rate": round(ml_won / ml_total * 100, 1) if ml_total > 0 else 0}
            },
            "by_confidence": confidence_performance,
            "recent_losing_teams": list(set(losing_patterns))[:5]
        }
    
    async def fetch_live_odds(self) -> List[Dict]:
        """Fetch live odds from The Odds API with enhanced data"""
        if not ODDS_API_KEY:
            logger.warning("No ODDS_API_KEY found")
            return []
        
        sports = list(SPORT_KEYS.values())[:4]  # NFL, NBA, MLB, NHL
        all_games = []
        
        async with aiohttp.ClientSession() as session:
            for sport in sports:
                try:
                    url = f"https://api.the-odds-api.com/v4/sports/{sport}/odds"
                    params = {
                        'apiKey': ODDS_API_KEY,
                        'regions': 'us',
                        'markets': 'spreads,h2h,totals',
                        'oddsFormat': 'american'
                    }
                    
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as response:
                        if response.status == 200:
                            games = await response.json()
                            for game in games[:8]:  # More games per sport
                                game['sport_key'] = sport
                                game['sport_name'] = SPORT_NAMES.get(sport, sport)
                                all_games.append(game)
                except Exception as e:
                    logger.error(f"Error fetching {sport} odds: {e}")
                    continue
        
        return all_games
    
    async def get_team_recent_form(self, team_name: str, sport: str) -> Optional[Dict]:
        """Get team's recent form from ESPN API"""
        # This would integrate with ESPN API for recent game results
        # For now, return None - can be enhanced later
        return None
    
    async def generate_smart_picks(self, force: bool = False) -> Dict:
        """Generate AI picks with enhanced intelligence"""
        try:
            # Check if we already have recent picks
            if not force:
                twenty_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=20)).isoformat()
                recent_count = await self.db.daily_picks.count_documents({
                    "is_active": True,
                    "created_at": {"$gte": twenty_hours_ago},
                    "auto_generated": True
                })
                if recent_count >= 3:
                    return {"message": "Recent picks already exist", "generated": False}
            
            # Get historical performance for learning
            performance = await self.get_historical_performance()
            
            # Fetch live odds
            games = await self.fetch_live_odds()
            if not games:
                return {"message": "No upcoming games found", "generated": False}
            
            # Get enhanced intelligence for top games
            intel = await self._get_intelligence()
            enhanced_games = []
            for game in games[:6]:  # Get intelligence for top 6 games
                try:
                    game_context = await intel.get_game_context({
                        'home_team': game.get('home_team', ''),
                        'away_team': game.get('away_team', ''),
                        'sport': game.get('sport_name', '')
                    })
                    game['intelligence'] = game_context
                    enhanced_games.append(game)
                except Exception as e:
                    logger.warning(f"Error getting intelligence for game: {e}")
                    enhanced_games.append(game)
            
            # Build enhanced prompt with learning context
            picks = await self._analyze_with_ai(enhanced_games, performance)
            
            if not picks:
                return {"message": "AI analysis failed", "generated": False}
            
            # Deactivate old auto-generated picks
            await self.db.daily_picks.update_many(
                {"auto_generated": True},
                {"$set": {"is_active": False}}
            )
            
            # Create new picks with enhanced data
            created_picks = []
            for pick in picks[:3]:
                new_pick = {
                    "id": str(__import__('uuid').uuid4()),
                    "title": pick.get('title', 'Unknown Bet'),
                    "description": pick.get('description', ''),
                    "win_probability": float(pick.get('win_probability', 60)),
                    "odds": str(pick.get('odds', '-110')),
                    "sport": pick.get('sport', 'NFL'),
                    "confidence": int(pick.get('confidence', 7)),
                    "reasoning": pick.get('reasoning', []),
                    "risk_factors": pick.get('risk_factors', []),
                    "game_time": pick.get('game_time', 'TBD'),
                    "edge_analysis": pick.get('edge_analysis', ''),
                    "historical_context": pick.get('historical_context', ''),
                    "matchup_data": pick.get('matchup_data', {}),
                    "weather_impact": pick.get('weather_impact', ''),
                    "public_betting": pick.get('public_betting', ''),
                    "created_by": "Smart AI Generator v3 (Enhanced)",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "is_active": True,
                    "auto_generated": True,
                    "model_version": "v3_enhanced_intel"
                }
                await self.db.daily_picks.insert_one(new_pick)
                created_picks.append(new_pick['title'])
            
            return {
                "message": f"Generated {len(created_picks)} smart picks with enhanced intelligence",
                "generated": True,
                "picks": created_picks,
                "performance_context": performance.get('overall', {}),
                "version": "v3_enhanced"
            }
            
        except Exception as e:
            logger.error(f"Error generating smart picks: {e}")
            return {"message": f"Error: {str(e)}", "generated": False}
    
    async def _analyze_with_ai(self, games: List[Dict], performance: Dict) -> List[Dict]:
        """Enhanced AI analysis with learning context and game intelligence"""
        if not EMERGENT_LLM_KEY:
            logger.error("No EMERGENT_LLM_KEY found")
            return []
        
        # Format games for analysis
        games_text = self._format_games_for_ai(games)
        
        # Build learning context
        learning_context = self._build_learning_context(performance)
        
        prompt = f"""You are an ELITE sports betting analyst with access to historical performance data. Your goal is to find the HIGHEST PROBABILITY winning bets.

## YOUR HISTORICAL PERFORMANCE (LEARN FROM THIS):
{learning_context}

## TODAY'S AVAILABLE GAMES:
{games_text}

## YOUR TASK:
Select the TOP 3 BEST BETS with the highest probability of winning. Apply what you've learned from historical performance.

## SELECTION CRITERIA (PRIORITIZE):
1. **Avoid recent losing patterns** - Don't pick teams/bet types that have been losing
2. **Favor high-performing sports** - Pick from sports with better historical win rates
3. **Calibrate confidence properly** - If high confidence picks have been losing, be more conservative
4. **Look for value** - Find bets where true probability exceeds implied odds probability
5. **Consider key factors**: Home advantage, rest days, injuries, recent form, head-to-head history

## ADVANCED ANALYSIS REQUIRED:
- Calculate implied probability from odds
- Estimate true probability based on team strength, matchup, and situational factors
- Identify any edge (true prob - implied prob)
- Only pick bets with positive expected value

## OUTPUT FORMAT (JSON):
{{
  "analysis_summary": "Brief overview of today's betting landscape",
  "picks": [
    {{
      "sport": "NBA/NFL/MLB/NHL",
      "title": "Team Name -3.5 vs Opponent" or "Team Name ML vs Opponent",
      "description": "One compelling sentence about why this bet wins",
      "win_probability": 62,
      "odds": "-110",
      "confidence": 8,
      "reasoning": [
        "Key reason 1 with specific data",
        "Key reason 2 with specific data", 
        "Key reason 3 with specific data"
      ],
      "risk_factors": ["Main risk to watch"],
      "game_time": "Today 7:30 PM ET",
      "edge_analysis": "Implied prob: 52.4%, Our estimate: 62%, Edge: +9.6%",
      "historical_context": "Similar picks have won X% of the time"
    }}
  ]
}}

IMPORTANT RULES:
- Be REALISTIC with probabilities (most good bets are 55-68%)
- NEVER exceed 75% probability unless it's a massive mismatch
- Include specific stats and data in reasoning
- Acknowledge and avoid your recent losing patterns
- Quality over quantity - only pick bets you genuinely believe in"""

        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"smart_picks_{__import__('uuid').uuid4()}",
                system_message="You are an elite sports betting analyst who learns from past performance and makes data-driven picks."
            )
            
            msg = UserMessage(text=prompt)
            response = await chat.send_message(msg)
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
                return result.get('picks', [])
            
        except Exception as e:
            logger.error(f"Error in AI analysis: {e}")
        
        return []
    
    def _format_games_for_ai(self, games: List[Dict]) -> str:
        """Format games data for AI analysis"""
        output = ""
        for i, game in enumerate(games):
            sport = game.get('sport_name', 'Unknown')
            home = game.get('home_team', 'Unknown')
            away = game.get('away_team', 'Unknown')
            commence = game.get('commence_time', '')
            
            # Parse commence time
            try:
                dt = datetime.fromisoformat(commence.replace('Z', '+00:00'))
                time_str = dt.strftime('%A %I:%M %p ET')
            except:
                time_str = commence
            
            output += f"\n{i+1}. [{sport}] {away} @ {home}"
            output += f"\n   Time: {time_str}"
            
            # Extract odds from bookmakers
            for bookmaker in game.get('bookmakers', [])[:2]:
                bookie_name = bookmaker.get('title', 'Unknown')
                for market in bookmaker.get('markets', []):
                    if market['key'] == 'spreads':
                        for outcome in market.get('outcomes', []):
                            point = outcome.get('point', 0)
                            price = outcome.get('price', 0)
                            sign = '+' if point > 0 else ''
                            output += f"\n   Spread: {outcome['name']} {sign}{point} ({price})"
                    elif market['key'] == 'h2h':
                        for outcome in market.get('outcomes', []):
                            price = outcome.get('price', 0)
                            output += f"\n   ML: {outcome['name']} ({price})"
                    elif market['key'] == 'totals':
                        for outcome in market.get('outcomes', []):
                            point = outcome.get('point', 0)
                            price = outcome.get('price', 0)
                            output += f"\n   Total: {outcome['name']} {point} ({price})"
                break  # Only use first bookmaker
            output += "\n"
        
        return output
    
    def _build_learning_context(self, performance: Dict) -> str:
        """Build learning context from historical performance"""
        overall = performance.get('overall', {})
        by_sport = performance.get('by_sport', {})
        by_bet = performance.get('by_bet_type', {})
        by_conf = performance.get('by_confidence', {})
        losing_teams = performance.get('recent_losing_teams', [])
        
        context = f"""### Overall Performance:
- Record: {overall.get('won', 0)}-{overall.get('lost', 0)} ({overall.get('win_rate', 0)}% win rate)

### Performance by Sport:"""
        
        for sport, stats in by_sport.items():
            context += f"\n- {sport}: {stats['won']}-{stats['lost']} ({stats['win_rate']}%)"
        
        context += "\n\n### Performance by Bet Type:"
        spread = by_bet.get('spread', {})
        ml = by_bet.get('moneyline', {})
        if spread.get('total', 0) > 0:
            context += f"\n- Spreads: {spread.get('win_rate', 0)}% win rate"
        if ml.get('total', 0) > 0:
            context += f"\n- Moneylines: {ml.get('win_rate', 0)}% win rate"
        
        context += "\n\n### Performance by Confidence Level:"
        for level, stats in by_conf.items():
            context += f"\n- {level.title()} confidence: {stats.get('win_rate', 0)}% win rate ({stats.get('total', 0)} picks)"
        
        if losing_teams:
            context += f"\n\n### AVOID THESE (Recent Losses):\n- Teams/picks to be cautious about: {', '.join(losing_teams)}"
        
        return context


async def get_smart_picks_service(db: AsyncIOMotorDatabase) -> SmartPicksService:
    """Factory function to create SmartPicksService"""
    return SmartPicksService(db)
