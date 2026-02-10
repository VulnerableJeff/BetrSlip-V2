"""
Arbitrage Scanner + Player Props + Game Plans Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import aiohttp
import os
import logging
import uuid

from .deps import db, get_current_user

router = APIRouter(tags=["pro-tools"])
logger = logging.getLogger(__name__)

ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')
BASE_URL = 'https://api.the-odds-api.com/v4'

SPORT_KEYS = {
    'NFL': 'americanfootball_nfl',
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb',
    'NHL': 'icehockey_nhl',
    'NCAAF': 'americanfootball_ncaaf',
    'NCAAB': 'basketball_ncaab'
}

BOOKMAKERS = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet', 'bovada']


async def fetch_odds_from_api(sport_key: str, markets: str = 'h2h,spreads,totals'):
    """Fetch live odds from The Odds API with MongoDB caching"""
    cache_key = f"odds_cache_{sport_key}_{markets.replace(',','_')}"

    if ODDS_API_KEY:
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{BASE_URL}/sports/{sport_key}/odds"
                params = {
                    'apiKey': ODDS_API_KEY,
                    'regions': 'us',
                    'markets': markets,
                    'oddsFormat': 'american'
                }
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data:
                            await db.api_cache.update_one(
                                {"key": cache_key},
                                {"$set": {"key": cache_key, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}},
                                upsert=True
                            )
                        return data
                    logger.warning(f"Odds API returned {resp.status} for {sport_key}")
        except Exception as e:
            logger.error(f"Error fetching odds for {sport_key}: {e}")

    # Fallback: serve cached data
    cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get('data'):
        return cached['data']

    return None


# ==================== ARBITRAGE SCANNER ====================

@router.get("/arbitrage-scanner")
async def scan_arbitrage(current_user: dict = Depends(get_current_user)):
    """Scan for arbitrage opportunities across sportsbooks"""
    arb_opportunities = []

    for sport_name, sport_key in list(SPORT_KEYS.items())[:4]:  # NBA, NHL, NCAAB, NCAAF
        games = await fetch_odds_from_api(sport_key, 'h2h')
        if not games:
            continue

        for game in games[:10]:
            home = game.get('home_team', '')
            away = game.get('away_team', '')
            commence = game.get('commence_time', '')
            bookmakers = game.get('bookmakers', [])

            if len(bookmakers) < 2:
                continue

            # Find best odds for each outcome
            best_home = {'odds': -9999, 'book': ''}
            best_away = {'odds': -9999, 'book': ''}

            for bm in bookmakers:
                book_name = bm.get('title', bm.get('key', ''))
                for market in bm.get('markets', []):
                    if market.get('key') != 'h2h':
                        continue
                    for outcome in market.get('outcomes', []):
                        name = outcome.get('name', '')
                        price = outcome.get('price', 0)
                        if name == home and price > best_home['odds']:
                            best_home = {'odds': price, 'book': book_name}
                        elif name == away and price > best_away['odds']:
                            best_away = {'odds': price, 'book': book_name}

            # Calculate arbitrage
            if best_home['odds'] != -9999 and best_away['odds'] != -9999:
                h_dec = (best_home['odds'] / 100 + 1) if best_home['odds'] > 0 else (100 / abs(best_home['odds']) + 1)
                a_dec = (best_away['odds'] / 100 + 1) if best_away['odds'] > 0 else (100 / abs(best_away['odds']) + 1)

                arb_pct = (1 / h_dec + 1 / a_dec) * 100

                if arb_pct < 100:  # True arbitrage
                    profit_pct = round(100 - arb_pct, 2)
                    stake_home = round(100 / h_dec, 2)
                    stake_away = round(100 / a_dec, 2)

                    arb_opportunities.append({
                        "game": f"{home} vs {away}",
                        "sport": sport_name,
                        "commence_time": commence,
                        "profit_percentage": profit_pct,
                        "home": {
                            "team": home,
                            "odds": best_home['odds'],
                            "book": best_home['book'],
                            "stake": stake_home
                        },
                        "away": {
                            "team": away,
                            "odds": best_away['odds'],
                            "book": best_away['book'],
                            "stake": stake_away
                        },
                        "total_investment": round(stake_home + stake_away, 2),
                        "guaranteed_return": 100.00
                    })
                elif arb_pct < 102:  # Near-arbitrage (low vig)
                    arb_opportunities.append({
                        "game": f"{home} vs {away}",
                        "sport": sport_name,
                        "commence_time": commence,
                        "profit_percentage": round(100 - arb_pct, 2),
                        "is_near_arb": True,
                        "home": {
                            "team": home,
                            "odds": best_home['odds'],
                            "book": best_home['book']
                        },
                        "away": {
                            "team": away,
                            "odds": best_away['odds'],
                            "book": best_away['book']
                        }
                    })

    arb_opportunities.sort(key=lambda x: x['profit_percentage'], reverse=True)

    return {
        "count": len(arb_opportunities),
        "opportunities": arb_opportunities[:15],
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


# ==================== PLAYER PROPS ====================

PROP_MARKETS = {
    'NBA': 'player_points,player_rebounds,player_assists,player_threes',
    'NCAAB': 'player_points,player_rebounds,player_assists',
    'NFL': 'player_passing_yards,player_rushing_yards,player_receiving_yards,player_touchdowns',
    'NCAAF': 'player_passing_yards,player_rushing_yards,player_receiving_yards',
    'NHL': 'player_points,player_goals,player_assists,player_shots_on_goal',
    'MLB': 'player_hits,player_home_runs,player_pitcher_strikeouts',
}


async def _fetch_events(sport_key: str) -> list:
    """Fetch upcoming events for a sport"""
    cache_key = f"events_cache_{sport_key}"
    if ODDS_API_KEY:
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{BASE_URL}/sports/{sport_key}/events"
                params = {'apiKey': ODDS_API_KEY}
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=12)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data:
                            await db.api_cache.update_one(
                                {"key": cache_key},
                                {"$set": {"key": cache_key, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}},
                                upsert=True
                            )
                        return data
        except Exception as e:
            logger.error(f"Error fetching events for {sport_key}: {e}")

    cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get('data'):
        return cached['data']
    return []


async def _fetch_event_props(sport_key: str, event_id: str, markets: str) -> dict | None:
    """Fetch player props for a specific event using the event-level endpoint"""
    cache_key = f"props_cache_{event_id}_{markets.replace(',','_')}"
    if ODDS_API_KEY:
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{BASE_URL}/sports/{sport_key}/events/{event_id}/odds"
                params = {
                    'apiKey': ODDS_API_KEY,
                    'regions': 'us',
                    'markets': markets,
                    'oddsFormat': 'american'
                }
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=12)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data:
                            await db.api_cache.update_one(
                                {"key": cache_key},
                                {"$set": {"key": cache_key, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}},
                                upsert=True
                            )
                        return data
                    logger.warning(f"Props API returned {resp.status} for event {event_id}")
        except Exception as e:
            logger.error(f"Error fetching props for event {event_id}: {e}")

    cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get('data'):
        return cached['data']
    return None


@router.get("/player-props")
async def get_player_props(
    sport: str = "NBA",
    current_user: dict = Depends(get_current_user)
):
    """Get player prop opportunities using event-level Odds API endpoint"""
    sport_upper = sport.upper()
    sport_key = SPORT_KEYS.get(sport_upper, 'basketball_nba')
    prop_markets = PROP_MARKETS.get(sport_upper, 'player_points')

    props = []

    # Step 1: Get events for the sport
    events = await _fetch_events(sport_key)
    if not events:
        return {
            "count": 0,
            "props": [],
            "sport": sport_upper,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "unavailable",
            "message": f"No upcoming {sport_upper} events found"
        }

    # Step 2: Fetch props for first few events (limit API usage)
    for event in events[:3]:
        event_id = event.get('id', '')
        home = event.get('home_team', '')
        away = event.get('away_team', '')

        event_data = await _fetch_event_props(sport_key, event_id, prop_markets)
        if not event_data:
            continue

        for bm in event_data.get('bookmakers', [])[:3]:
            book = bm.get('title', '')
            for market in bm.get('markets', []):
                market_key = market.get('key', '')
                for outcome in market.get('outcomes', []):
                    player = outcome.get('description', outcome.get('name', ''))
                    point = outcome.get('point', 0)
                    price = outcome.get('price', 0)
                    over_under = outcome.get('name', 'Over')

                    if player and point and price:
                        dec = (price / 100 + 1) if price > 0 else (100 / abs(price) + 1)
                        implied = round((1 / dec) * 100, 1)

                        props.append({
                            "player": player,
                            "game": f"{away} @ {home}",
                            "market": market_key.replace('player_', '').replace('_', ' ').title(),
                            "line": point,
                            "over_under": over_under,
                            "odds": price,
                            "implied_probability": implied,
                            "book": book,
                            "sport": sport_upper
                        })

    props.sort(key=lambda x: x.get('implied_probability', 100))

    return {
        "count": len(props),
        "props": props[:30],
        "sport": sport_upper,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "live" if props else "unavailable",
        "message": None if props else f"No player props available for {sport_upper} right now"
    }


# ==================== CUSTOM GAME PLANS ====================

class GamePlanRequest(BaseModel):
    risk_tolerance: str = "medium"  # low, medium, high
    bankroll: float = 1000.0
    preferred_sports: list = ["NBA", "NFL"]
    bet_types: list = ["spread", "moneyline"]
    daily_budget: Optional[float] = None


@router.post("/game-plan")
async def create_game_plan(
    request: GamePlanRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a personalized betting game plan"""
    user_id = current_user['user_id']

    # Get user's historical performance
    analyses = await db.analyses.find(
        {"user_id": user_id, "outcome": {"$in": ["won", "lost"]}},
        {"_id": 0}
    ).to_list(100)

    wins = sum(1 for a in analyses if a.get('outcome') == 'won')
    losses = sum(1 for a in analyses if a.get('outcome') == 'lost')
    total = wins + losses
    win_rate = round(wins / total * 100, 1) if total > 0 else 0

    # Get active picks
    picks = await db.daily_picks.find(
        {"is_active": True}, {"_id": 0}
    ).sort("win_probability", -1).limit(10).to_list(10)

    # Risk profile mapping
    risk_profiles = {
        "low": {"max_bet_pct": 2, "min_prob": 55, "max_legs": 2, "label": "Conservative"},
        "medium": {"max_bet_pct": 5, "min_prob": 48, "max_legs": 3, "label": "Balanced"},
        "high": {"max_bet_pct": 10, "min_prob": 40, "max_legs": 5, "label": "Aggressive"}
    }
    profile = risk_profiles.get(request.risk_tolerance, risk_profiles['medium'])

    daily_budget = request.daily_budget or (request.bankroll * profile['max_bet_pct'] / 100)
    max_single_bet = round(daily_budget * 0.4, 2)

    # Filter picks by user preferences
    filtered_picks = [
        p for p in picks
        if p.get('win_probability', 0) >= profile['min_prob']
        and p.get('sport', '').upper() in [s.upper() for s in request.preferred_sports]
    ]

    # Build recommendations
    recommendations = []
    running_total = 0

    for pick in filtered_picks:
        prob = pick.get('win_probability', 50)
        odds = pick.get('odds', '-110')

        # Kelly-based stake
        try:
            odds_val = int(str(odds).replace('+', ''))
            decimal = (odds_val / 100 + 1) if odds_val > 0 else (100 / abs(odds_val) + 1)
        except (ValueError, ZeroDivisionError):
            decimal = 1.91

        kelly = max(0, ((prob / 100) * decimal - 1) / (decimal - 1))
        suggested_stake = round(min(max_single_bet, request.bankroll * kelly * 0.25), 2)  # Quarter Kelly

        if running_total + suggested_stake > daily_budget:
            break

        running_total += suggested_stake
        recommendations.append({
            "pick": pick.get('title', 'Unknown'),
            "sport": pick.get('sport', 'Unknown'),
            "odds": odds,
            "win_probability": prob,
            "suggested_stake": suggested_stake,
            "kelly_fraction": round(kelly * 100, 1),
            "reasoning": pick.get('reasoning', '')
        })

    # Save game plan
    plan = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "risk_tolerance": request.risk_tolerance,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.game_plans.insert_one(plan)

    return {
        "profile": {
            "label": profile['label'],
            "risk_tolerance": request.risk_tolerance,
            "bankroll": request.bankroll,
            "daily_budget": round(daily_budget, 2),
            "max_single_bet": max_single_bet
        },
        "performance": {
            "total_bets": total,
            "win_rate": win_rate,
            "record": f"{wins}W-{losses}L"
        },
        "recommendations": recommendations,
        "total_action": round(running_total, 2),
        "rules": [
            f"Never bet more than {profile['max_bet_pct']}% of bankroll on a single bet",
            f"Daily budget: ${round(daily_budget, 2)}",
            f"Focus on bets with {profile['min_prob']}%+ win probability",
            f"Maximum parlay legs: {profile['max_legs']}",
            "Track all bets and adjust strategy monthly"
        ],
        "plan_id": plan['id']
    }
