"""
P/L Performance Tracker & Leaderboard Routes
- Track cumulative profit/loss
- ROI calculations
- Public leaderboard
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import logging

from .deps import db, get_current_user

router = APIRouter(tags=["performance"])
logger = logging.getLogger(__name__)


@router.get("/performance/my-stats")
async def get_my_performance(current_user: dict = Depends(get_current_user)):
    """Get user's P/L performance data"""
    user_id = current_user['user_id']

    analyses = await db.analyses.find(
        {"user_id": user_id, "outcome": {"$in": ["won", "lost", "push"]}},
        {"_id": 0, "outcome": 1, "stake_amount": 1, "payout_amount": 1,
         "created_at": 1, "analysis": 1}
    ).sort("created_at", 1).to_list(500)

    cumulative_pl = 0
    total_staked = 0
    wins = 0
    losses = 0
    pushes = 0
    streak = 0
    best_streak = 0
    pl_data = []

    for a in analyses:
        stake = a.get('stake_amount', 10)  # default $10 if not set
        payout = a.get('payout_amount', 0)
        outcome = a.get('outcome')

        if outcome == 'won':
            pl = (payout or stake * 1.9) - stake  # default ~-110 odds payout
            wins += 1
            streak = max(streak + 1, 1)
        elif outcome == 'lost':
            pl = -stake
            losses += 1
            streak = min(streak - 1, -1)
        else:  # push
            pl = 0
            pushes += 1
            streak = 0

        best_streak = max(best_streak, abs(streak))
        cumulative_pl += pl
        total_staked += stake

        pl_data.append({
            "date": a.get('created_at', ''),
            "pl": round(cumulative_pl, 2),
            "outcome": outcome
        })

    total_bets = wins + losses + pushes
    roi = round((cumulative_pl / total_staked * 100), 1) if total_staked > 0 else 0
    win_rate = round((wins / (wins + losses) * 100), 1) if (wins + losses) > 0 else 0

    # AI accuracy - how often AI's prediction aligned with outcome
    ai_correct = 0
    for a in analyses:
        prob = a.get('analysis', {}).get('overall_probability', 50)
        outcome = a.get('outcome')
        if outcome == 'won' and prob >= 50:
            ai_correct += 1
        elif outcome == 'lost' and prob < 50:
            ai_correct += 1
    ai_accuracy = round((ai_correct / total_bets * 100), 1) if total_bets > 0 else 0

    return {
        "total_bets": total_bets,
        "wins": wins,
        "losses": losses,
        "pushes": pushes,
        "win_rate": win_rate,
        "cumulative_pl": round(cumulative_pl, 2),
        "total_staked": round(total_staked, 2),
        "roi": roi,
        "best_streak": best_streak,
        "ai_accuracy": ai_accuracy,
        "pl_chart": pl_data
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """Public leaderboard - top performers by ROI"""
    pipeline = [
        {"$match": {"outcome": {"$in": ["won", "lost"]}}},
        {"$group": {
            "_id": "$user_id",
            "total_bets": {"$sum": 1},
            "wins": {"$sum": {"$cond": [{"$eq": ["$outcome", "won"]}, 1, 0]}},
            "losses": {"$sum": {"$cond": [{"$eq": ["$outcome", "lost"]}, 1, 0]}}
        }},
        {"$match": {"total_bets": {"$gte": 3}}},  # minimum 3 bets
        {"$addFields": {
            "win_rate": {
                "$round": [{"$multiply": [{"$divide": ["$wins", "$total_bets"]}, 100]}, 1]
            }
        }},
        {"$sort": {"win_rate": -1, "total_bets": -1}},
        {"$limit": 20}
    ]

    results = await db.analyses.aggregate(pipeline).to_list(20)

    leaderboard = []
    for i, item in enumerate(results):
        user = await db.users.find_one({"id": item['_id']}, {"_id": 0, "email": 1})
        email = user.get('email', 'user') if user else 'user'
        # Anonymize
        if '@' in email:
            parts = email.split('@')
            anon = parts[0][:3] + '***'
        else:
            anon = email[:3] + '***'

        sub = await db.subscriptions.find_one({"user_id": item['_id']}, {"_id": 0, "subscription_status": 1})

        leaderboard.append({
            "rank": i + 1,
            "user": anon,
            "total_bets": item['total_bets'],
            "wins": item['wins'],
            "losses": item['losses'],
            "win_rate": item['win_rate'],
            "is_pro": sub.get('subscription_status') == 'active' if sub else False
        })

    return {"leaderboard": leaderboard}


@router.get("/ev-scanner")
async def get_ev_opportunities(current_user: dict = Depends(get_current_user)):
    """Scan for +EV betting opportunities using real odds data"""
    import aiohttp
    import os

    ODDS_API_KEY = os.environ.get('ODDS_API_KEY', '')
    opportunities = []

    # Try real odds first, with caching
    sport_keys = ['basketball_nba', 'americanfootball_nfl', 'baseball_mlb']
    for sport_key in sport_keys:
        cache_key = f"odds_cache_{sport_key}_h2h_spreads"
        games = None

        if ODDS_API_KEY:
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
                    params = {
                        'apiKey': ODDS_API_KEY,
                        'regions': 'us',
                        'markets': 'h2h,spreads',
                        'oddsFormat': 'american'
                    }
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status == 200:
                            games = await resp.json()
                            if games:
                                await db.api_cache.update_one(
                                    {"key": cache_key},
                                    {"$set": {"key": cache_key, "data": games, "updated_at": datetime.now(timezone.utc).isoformat()}},
                                    upsert=True
                                )
            except Exception as e:
                logging.getLogger(__name__).error(f"EV scan error for {sport_key}: {e}")

        # Fallback to cache
        if not games:
            cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
            if cached:
                games = cached.get('data', [])

        if games:
            for game in games[:6]:
                opp = _analyze_game_ev(game)
                if opp:
                    opportunities.extend(opp)

    if not opportunities:
        return {
            "count": 0,
            "opportunities": [],
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "source": "unavailable",
            "message": "No live odds data available right now. Try again later."
        }

    opportunities.sort(key=lambda x: x['best_edge'], reverse=True)

    return {
        "count": len(opportunities),
        "opportunities": opportunities[:10],
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": "live"
    }


def _analyze_game_ev(game):
    """Analyze a game's odds for +EV opportunities"""
    results = []
    home = game.get('home_team', '')
    away = game.get('away_team', '')
    sport = game.get('sport_title', game.get('sport_key', 'Unknown'))
    bookmakers = game.get('bookmakers', [])

    if len(bookmakers) < 2:
        return results

    for market_type in ['h2h', 'spreads']:
        # Collect all odds for each outcome
        outcome_odds = {}

        for bm in bookmakers:
            book = bm.get('title', '')
            for market in bm.get('markets', []):
                if market.get('key') != market_type:
                    continue
                for outcome in market.get('outcomes', []):
                    name = outcome.get('name', '')
                    price = outcome.get('price', 0)
                    point = outcome.get('point', '')
                    key = f"{name} {point}".strip() if point else name

                    if key not in outcome_odds:
                        outcome_odds[key] = []
                    outcome_odds[key].append({'book': book, 'odds': price, 'point': point})

        # Find best odds and calculate true probability (no-vig)
        for outcome_key, odds_list in outcome_odds.items():
            if len(odds_list) < 2:
                continue

            best = max(odds_list, key=lambda x: x['odds'])

            # Calculate average implied probability as "true" probability estimate
            implied_probs = []
            for o in odds_list:
                dec = (o['odds'] / 100 + 1) if o['odds'] > 0 else (100 / abs(o['odds']) + 1)
                implied_probs.append(1 / dec)

            avg_implied = sum(implied_probs) / len(implied_probs)
            true_prob = round(avg_implied * 100, 1)

            # Best odds implied
            best_dec = (best['odds'] / 100 + 1) if best['odds'] > 0 else (100 / abs(best['odds']) + 1)
            best_implied = 1 / best_dec
            edge = round((avg_implied - best_implied) * 100, 1)

            if edge > 0:
                book_odds = {}
                for o in odds_list:
                    dec = (o['odds'] / 100 + 1) if o['odds'] > 0 else (100 / abs(o['odds']) + 1)
                    imp = round((1 / dec) * 100, 1)
                    o_edge = round((avg_implied - 1/dec) * 100, 1)
                    odds_str = f"+{o['odds']}" if o['odds'] > 0 else str(o['odds'])
                    book_odds[o['book']] = {
                        "decimal": round(dec, 2),
                        "american": odds_str,
                        "implied_prob": imp,
                        "edge": o_edge
                    }

                best_american = f"+{best['odds']}" if best['odds'] > 0 else str(best['odds'])
                true_american = int(round(-100 * avg_implied / (1 - avg_implied))) if avg_implied > 0.5 else int(round(100 * (1 - avg_implied) / avg_implied))
                true_odds_str = f"+{true_american}" if true_american > 0 else str(true_american)

                results.append({
                    "game": f"{home} vs {away}" if not best.get('point') else f"{outcome_key} ({home} vs {away})",
                    "sport": sport,
                    "true_probability": true_prob,
                    "true_odds": true_odds_str,
                    "best_book": best['book'],
                    "best_edge": edge,
                    "best_odds": best_american,
                    "book_odds": book_odds,
                    "kelly_bet": round(max(0, (avg_implied * best_dec - 1) / (best_dec - 1)) * 100, 1)
                })

    return results


async def _fallback_ev_scan():
    """Fallback EV scan using daily picks"""
    import random
    picks = await db.daily_picks.find(
        {"is_active": True}, {"_id": 0}
    ).sort("win_probability", -1).limit(10).to_list(10)

    opportunities = []
    sportsbooks = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'PointsBet']

    for pick in picks:
        prob = pick.get('win_probability', 50) / 100
        title = pick.get('title', 'Unknown')
        sport = pick.get('sport', 'Unknown')
        true_decimal = round(1 / prob, 2) if prob > 0 else 2.0
        true_american = int(round((true_decimal - 1) * 100)) if true_decimal >= 2 else int(round(-100 / (true_decimal - 1)))

        book_odds = {}
        best_book = ''
        best_value = -100

        for book in sportsbooks:
            variance = random.uniform(-0.08, 0.05)
            book_decimal = round(true_decimal + variance, 2)
            book_american = int(round((book_decimal - 1) * 100)) if book_decimal >= 2 else int(round(-100 / (book_decimal - 1)))
            implied_prob = 1 / book_decimal
            edge = round((prob - implied_prob) * 100, 1)

            book_odds[book] = {
                "decimal": book_decimal,
                "american": f"{'+' if book_american > 0 else ''}{book_american}",
                "implied_prob": round(implied_prob * 100, 1),
                "edge": edge
            }
            if edge > best_value:
                best_value = edge
                best_book = book

        if best_value > 0:
            opportunities.append({
                "game": title,
                "sport": sport,
                "true_probability": round(prob * 100, 1),
                "true_odds": f"{'+' if true_american > 0 else ''}{true_american}",
                "best_book": best_book,
                "best_edge": best_value,
                "best_odds": book_odds[best_book]['american'],
                "book_odds": book_odds,
                "kelly_bet": round(max(0, (prob * true_decimal - 1) / (true_decimal - 1)) * 100, 1)
            })

    return opportunities
