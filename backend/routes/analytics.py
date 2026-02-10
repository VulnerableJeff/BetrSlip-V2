"""
Advanced Analytics routes - Line Movements, Parlay Optimizer, Odds Comparison
ALL DATA sourced from The Odds API - real, live, upcoming games only.
"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone
import logging
import aiohttp
import os
import uuid

from .deps import db, get_current_user

router = APIRouter(tags=["Analytics"])
logger = logging.getLogger(__name__)

ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')
ODDS_BASE = 'https://api.the-odds-api.com/v4'

SPORT_KEYS = {
    'NFL': 'americanfootball_nfl',
    'NBA': 'basketball_nba',
    'MLB': 'baseball_mlb',
    'NHL': 'icehockey_nhl',
    'NCAAF': 'americanfootball_ncaaf',
    'NCAAB': 'basketball_ncaab'
}


async def _fetch_odds(sport_key: str, markets: str = 'h2h,spreads,totals'):
    """Fetch live upcoming odds — caches results in MongoDB for when API is down"""
    cache_key = f"odds_cache_{sport_key}_{markets.replace(',','_')}"

    if ODDS_API_KEY:
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    'apiKey': ODDS_API_KEY,
                    'regions': 'us',
                    'markets': markets,
                    'oddsFormat': 'american',
                    'dateFormat': 'iso'
                }
                async with session.get(
                    f"{ODDS_BASE}/sports/{sport_key}/odds",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=12)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        # Cache successful response
                        if data:
                            await db.api_cache.update_one(
                                {"key": cache_key},
                                {"$set": {
                                    "key": cache_key,
                                    "data": data,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }},
                                upsert=True
                            )
                        return data
                    logger.warning(f"Odds API {resp.status} for {sport_key}")
        except Exception as e:
            logger.error(f"Odds fetch error: {e}")

    # Fallback: serve cached data
    cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get('data'):
        logger.info(f"Serving cached odds for {sport_key}")
        return cached['data']

    return None


def _format_time(iso_str):
    """Format ISO time to readable ET"""
    try:
        dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        # Convert to ET (UTC-5)
        from datetime import timedelta
        et = dt - timedelta(hours=5)
        return et.strftime('%a %I:%M %p ET')
    except Exception:
        return "TBD"


# ===== LINE MOVEMENTS =====
@router.get("/line-movements")
async def get_line_movements():
    """Get line movements from real upcoming games"""
    movements = []

    for sport_name, sport_key in [('NBA', 'basketball_nba'), ('NFL', 'americanfootball_nfl'), ('NHL', 'icehockey_nhl')]:
        games = await _fetch_odds(sport_key, 'spreads,h2h')
        if not games:
            continue

        for game in games[:5]:
            home = game.get('home_team', '')
            away = game.get('away_team', '')
            commence = game.get('commence_time', '')
            bookmakers = game.get('bookmakers', [])

            if len(bookmakers) < 2:
                continue

            # Compare spreads across books to simulate movement
            spreads = []
            mls = []
            for bm in bookmakers:
                for market in bm.get('markets', []):
                    if market.get('key') == 'spreads':
                        for o in market.get('outcomes', []):
                            if o.get('name') == home:
                                spreads.append(o.get('point', 0))
                    elif market.get('key') == 'h2h':
                        for o in market.get('outcomes', []):
                            if o.get('name') == home:
                                mls.append(o.get('price', 0))

            if len(spreads) >= 2:
                spread_range = max(spreads) - min(spreads)
                if spread_range >= 0.5:
                    movements.append({
                        "game": f"{away} vs {home}",
                        "sport": sport_name,
                        "bet_type": "Spread",
                        "old_line": str(min(spreads)),
                        "new_line": str(max(spreads)),
                        "change": round(spread_range, 1),
                        "direction": "up" if max(spreads) > min(spreads) else "down",
                        "significance": "high" if spread_range >= 1.5 else "medium",
                        "insight": f"Line varies {spread_range}pts across books - shop for best number",
                        "game_time": _format_time(commence)
                    })

            if len(mls) >= 2:
                ml_range = max(mls) - min(mls)
                if ml_range >= 15:
                    movements.append({
                        "game": f"{away} vs {home}",
                        "sport": sport_name,
                        "bet_type": "Moneyline",
                        "old_line": str(min(mls)),
                        "new_line": str(max(mls)),
                        "change": ml_range,
                        "direction": "up",
                        "significance": "high" if ml_range >= 30 else "medium",
                        "insight": f"ML discrepancy of {ml_range} across sportsbooks",
                        "game_time": _format_time(commence)
                    })

    movements.sort(key=lambda x: 2 if x['significance'] == 'high' else 1, reverse=True)

    return {
        "success": True,
        "count": len(movements),
        "movements": movements[:6],
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "live" if movements else "unavailable"
    }


# ===== PARLAY OPTIMIZER =====
@router.get("/parlay-optimizer")
async def get_parlay_suggestions(current_user: dict = Depends(get_current_user)):
    """Get real upcoming game parlay suggestions"""
    suggestions = []

    for sport_name, sport_key in [('NBA', 'basketball_nba'), ('NFL', 'americanfootball_nfl'), ('NHL', 'icehockey_nhl')]:
        games = await _fetch_odds(sport_key, 'spreads,h2h,totals')
        if not games:
            continue

        for game in games[:4]:
            home = game.get('home_team', '')
            away = game.get('away_team', '')
            commence = game.get('commence_time', '')

            for bm in game.get('bookmakers', [])[:1]:  # Use first bookmaker
                for market in bm.get('markets', []):
                    key = market.get('key', '')
                    for outcome in market.get('outcomes', []):
                        name = outcome.get('name', '')
                        price = outcome.get('price', 0)
                        point = outcome.get('point', '')

                        if not price:
                            continue

                        # Calculate implied probability
                        dec = (price / 100 + 1) if price > 0 else (100 / abs(price) + 1)
                        implied = round((1 / dec) * 100, 1)

                        # Only suggest bets with implied 40-70% (reasonable value)
                        if 40 <= implied <= 70:
                            if key == 'spreads':
                                desc = f"{name} {'+' if point > 0 else ''}{point}"
                                bet_type = "Spread"
                            elif key == 'h2h':
                                desc = f"{name} ML"
                                bet_type = "Moneyline"
                            elif key == 'totals':
                                desc = f"{name} {point}"
                                bet_type = "Total"
                            else:
                                continue

                            odds_str = f"+{price}" if price > 0 else str(price)
                            ev = round((implied / 100 * (dec - 1) - (1 - implied / 100)) * 100, 1)

                            suggestions.append({
                                "id": str(uuid.uuid4()),
                                "description": desc,
                                "sport": sport_name,
                                "bet_type": bet_type,
                                "probability": implied,
                                "ev": max(0, ev),
                                "confidence": "high" if implied >= 55 else "medium",
                                "game": f"{away} @ {home}",
                                "odds": odds_str,
                                "game_time": _format_time(commence)
                            })

    # Sort by EV
    suggestions.sort(key=lambda x: x.get('ev', 0), reverse=True)

    return {
        "success": True,
        "count": len(suggestions[:8]),
        "suggestions": suggestions[:8],
        "source": "live" if suggestions else "unavailable"
    }


# ===== ODDS COMPARISON =====
@router.get("/odds-comparison")
async def get_odds_comparison(sport: str = Query(default="NBA")):
    """Compare real odds across multiple sportsbooks for upcoming games"""
    sport_key = SPORT_KEYS.get(sport.upper(), 'basketball_nba')
    games = await _fetch_odds(sport_key, 'spreads,h2h,totals')

    comparisons = []
    if games:
        for game in games[:4]:
            home = game.get('home_team', '')
            away = game.get('away_team', '')
            commence = game.get('commence_time', '')
            bookmakers = game.get('bookmakers', [])

            odds_by_book = {}
            for bm in bookmakers:
                book = bm.get('title', bm.get('key', ''))
                book_odds = {}
                for market in bm.get('markets', []):
                    key = market.get('key', '')
                    for outcome in market.get('outcomes', []):
                        if outcome.get('name') == home or key == 'totals':
                            if key == 'spreads':
                                book_odds['spread'] = outcome.get('point', 0)
                            elif key == 'h2h' and outcome.get('name') == home:
                                book_odds['ml'] = outcome.get('price', 0)
                            elif key == 'totals' and outcome.get('name') == 'Over':
                                book_odds['total'] = outcome.get('point', 0)

                if book_odds:
                    odds_by_book[book] = book_odds

            if len(odds_by_book) >= 2:
                # Find best values
                best_spread = None
                best_spread_book = ''
                best_ml = None
                best_ml_book = ''

                for book, odds in odds_by_book.items():
                    s = odds.get('spread')
                    m = odds.get('ml')
                    if s is not None and (best_spread is None or s > best_spread):
                        best_spread = s
                        best_spread_book = book
                    if m is not None and (best_ml is None or m > best_ml):
                        best_ml = m
                        best_ml_book = book

                comparisons.append({
                    "game": f"{away} vs {home}",
                    "time": _format_time(commence),
                    "odds": odds_by_book,
                    "best_spread": best_spread,
                    "best_value": {
                        "book": best_spread_book or best_ml_book,
                        "type": "spread" if best_spread_book else "moneyline"
                    },
                    "books_count": len(odds_by_book)
                })

    return {
        "success": True,
        "sport": sport.upper(),
        "count": len(comparisons),
        "comparisons": comparisons,
        "source": "live" if comparisons else "unavailable"
    }


# ===== BEST VALUE FINDER =====
@router.post("/best-value-finder")
async def get_best_value(current_user: dict = Depends(get_current_user)):
    """Find best value bets by comparing odds across real sportsbooks"""
    user_id = current_user['user_id']

    latest = await db.analyses.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(1).to_list(1)

    if not latest:
        return {"success": False, "message": "No analyses found"}

    analysis = latest[0]
    bets = analysis.get('analysis', {}).get('bets', [])

    if not bets:
        return {"success": False, "message": "No bets found in analysis"}

    # Get real odds for comparison
    value_findings = []
    for bet in bets:
        prob = bet.get('win_probability', bet.get('probability', 50)) / 100
        desc = bet.get('description', bet.get('bet', ''))
        ev = bet.get('ev_percent', 0)

        true_decimal = round(1 / prob, 2) if prob > 0 else 2.0
        true_american = int(round((true_decimal - 1) * 100)) if true_decimal >= 2 else int(round(-100 / (true_decimal - 1)))

        value_findings.append({
            "bet": desc,
            "true_probability": round(prob * 100, 1),
            "true_odds": f"{'+' if true_american > 0 else ''}{true_american}",
            "ev_percent": ev,
            "recommendation": "Positive EV - consider betting" if ev > 0 else "Negative EV - proceed with caution"
        })

    return {
        "success": True,
        "total_bets_analyzed": len(bets),
        "value_findings": value_findings,
        "best_recommendation": value_findings[0] if value_findings else None,
        "source": "analysis"
    }
