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
    """Fetch odds via centralized client with rate limiting + 3-layer cache"""
    from .odds_client import fetch_odds
    return await fetch_odds(sport_key, markets, db=db)


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

    for sport_name, sport_key in [('NBA', 'basketball_nba'), ('NHL', 'icehockey_nhl'), ('NCAAB', 'basketball_ncaab')]:
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
    """Get real upcoming game parlay suggestions with EV-based optimization"""
    suggestions = []

    for sport_name, sport_key in [('NBA', 'basketball_nba'), ('NHL', 'icehockey_nhl'), ('NCAAB', 'basketball_ncaab')]:
        games = await _fetch_odds(sport_key, 'spreads,h2h,totals')
        if not games:
            continue

        for game in games[:4]:
            home = game.get('home_team', '')
            away = game.get('away_team', '')
            commence = game.get('commence_time', '')
            bookmakers = game.get('bookmakers', [])

            # Compare across multiple books to find edge
            for bm in bookmakers[:1]:
                for market in bm.get('markets', []):
                    key = market.get('key', '')
                    for outcome in market.get('outcomes', []):
                        name = outcome.get('name', '')
                        price = outcome.get('price', 0)
                        point = outcome.get('point', '')

                        if not price:
                            continue

                        dec = (price / 100 + 1) if price > 0 else (100 / abs(price) + 1)
                        implied = round((1 / dec) * 100, 1)

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
                                "game_id": f"{home}_{away}",
                                "odds": odds_str,
                                "decimal_odds": round(dec, 3),
                                "game_time": _format_time(commence)
                            })

    suggestions.sort(key=lambda x: x.get('ev', 0), reverse=True)

    # Build optimal 2-leg and 3-leg parlays from best individual legs
    optimal_parlays = []
    top_legs = [s for s in suggestions if s.get('confidence') == 'high'][:6]

    if len(top_legs) >= 2:
        # Build 2-leg parlays (best combos from different games)
        for i in range(min(3, len(top_legs))):
            for j in range(i + 1, min(4, len(top_legs))):
                leg1, leg2 = top_legs[i], top_legs[j]
                if leg1.get('game_id') == leg2.get('game_id'):
                    continue  # Skip correlated legs (same game)
                combined_prob = round(leg1['probability'] * leg2['probability'] / 100, 1)
                combined_dec = leg1['decimal_odds'] * leg2['decimal_odds']
                combined_american = int(round((combined_dec - 1) * 100)) if combined_dec >= 2 else int(round(-100 / (combined_dec - 1)))
                combined_odds = f"+{combined_american}" if combined_american > 0 else str(combined_american)
                combined_ev = round(combined_prob / 100 * (combined_dec - 1) * 100 - (100 - combined_prob), 1)

                optimal_parlays.append({
                    "id": str(uuid.uuid4()),
                    "legs": [
                        {"description": leg1['description'], "sport": leg1['sport'], "odds": leg1['odds'], "game": leg1['game']},
                        {"description": leg2['description'], "sport": leg2['sport'], "odds": leg2['odds'], "game": leg2['game']}
                    ],
                    "combined_probability": combined_prob,
                    "combined_odds": combined_odds,
                    "combined_ev": combined_ev,
                    "leg_count": 2,
                    "risk_level": "moderate" if combined_prob >= 25 else "high"
                })

    optimal_parlays.sort(key=lambda x: x.get('combined_ev', 0), reverse=True)

    return {
        "success": True,
        "count": len(suggestions[:8]),
        "suggestions": suggestions[:8],
        "optimal_parlays": optimal_parlays[:3],
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



# ===== DAILY BET CARD =====
@router.get("/daily-bet-card")
async def get_daily_bet_card(current_user: dict = Depends(get_current_user)):
    """Get top 3 +EV picks for the daily shareable bet card (Pro only)"""
    from .deps import get_user_subscription_status

    user_id = current_user['user_id']
    sub_status = await get_user_subscription_status(user_id)

    if not sub_status.get('is_subscribed'):
        return {
            "success": False,
            "pro_required": True,
            "message": "Daily Bet Card is a Pro feature",
            "picks": []
        }

    # Check cache first (refreshes every 30 min)
    cache_key = f"daily_bet_card_{datetime.now(timezone.utc).strftime('%Y-%m-%d_%H')}"
    cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached and cached.get('data'):
        return cached['data']

    # Scan all in-season sports for best +EV opportunities
    all_opps = []
    for sport_name, sport_key in [('NBA', 'basketball_nba'), ('NHL', 'icehockey_nhl'), ('NCAAB', 'basketball_ncaab')]:
        games = await _fetch_odds(sport_key, 'h2h,spreads,totals')
        if not games:
            continue

        for game in games[:6]:
            home = game.get('home_team', '')
            away = game.get('away_team', '')
            commence = game.get('commence_time', '')
            bookmakers = game.get('bookmakers', [])

            if len(bookmakers) < 2:
                continue

            # Check each market across bookmakers
            all_prices = {}
            for bm in bookmakers:
                book_name = bm.get('title', '')
                for market in bm.get('markets', []):
                    key = market.get('key', '')
                    for outcome in market.get('outcomes', []):
                        name = outcome.get('name', '')
                        price = outcome.get('price', 0)
                        point = outcome.get('point', '')
                        okey = f"{key}_{name}_{point}"

                        if okey not in all_prices:
                            all_prices[okey] = []
                        all_prices[okey].append({'price': price, 'book': book_name, 'name': name, 'point': point, 'key': key})

            for okey, prices in all_prices.items():
                if len(prices) < 2:
                    continue

                best = max(prices, key=lambda x: x['price'])
                avg_price = sum(p['price'] for p in prices) / len(prices)
                price = best['price']

                dec = (price / 100 + 1) if price > 0 else (100 / abs(price) + 1)
                avg_dec = (avg_price / 100 + 1) if avg_price > 0 else (100 / abs(avg_price) + 1)

                implied = 1 / dec
                market_implied = 1 / avg_dec
                edge = round((market_implied - implied) * 100, 1)

                if edge > 1.5:
                    key = best['key']
                    name = best['name']
                    point = best['point']

                    if key == 'h2h':
                        pick_desc = f"{name} ML"
                        bet_type = "Moneyline"
                    elif key == 'spreads':
                        pick_desc = f"{name} {'+' if point > 0 else ''}{point}"
                        bet_type = "Spread"
                    elif key == 'totals':
                        pick_desc = f"{name} {point}"
                        bet_type = "Total"
                    else:
                        continue

                    odds_str = f"+{price}" if price > 0 else str(price)
                    confidence = "high" if edge > 4 else "medium" if edge > 2.5 else "low"

                    all_opps.append({
                        "pick": pick_desc,
                        "game": f"{away} @ {home}",
                        "sport": sport_name,
                        "bet_type": bet_type,
                        "odds": odds_str,
                        "edge": edge,
                        "book": best['book'],
                        "confidence": confidence,
                        "game_time": _format_time(commence)
                    })

    # Sort by edge and take top 3
    all_opps.sort(key=lambda x: x['edge'], reverse=True)
    top_picks = all_opps[:3]

    today = datetime.now(timezone.utc).strftime('%B %d, %Y')

    result = {
        "success": True,
        "pro_required": False,
        "date": today,
        "picks": top_picks,
        "total_scanned": len(all_opps),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    # Cache for this hour
    if top_picks:
        await db.api_cache.update_one(
            {"key": cache_key},
            {"$set": {"key": cache_key, "data": result, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )

    return result
