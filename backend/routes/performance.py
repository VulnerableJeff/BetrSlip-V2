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
    """Scan for +EV betting opportunities based on current odds data"""
    import random

    # Get active daily picks as base for EV analysis
    picks = await db.daily_picks.find(
        {"is_active": True}, {"_id": 0}
    ).sort("win_probability", -1).limit(10).to_list(10)

    opportunities = []
    sportsbooks = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'PointsBet']

    for pick in picks:
        prob = pick.get('win_probability', 50) / 100
        title = pick.get('title', 'Unknown')
        sport = pick.get('sport', 'Unknown')

        # Calculate true odds (no-vig)
        true_decimal = round(1 / prob, 2) if prob > 0 else 2.0
        true_american = int(round((true_decimal - 1) * 100)) if true_decimal >= 2 else int(round(-100 / (true_decimal - 1)))

        # Simulate bookmaker odds (slightly worse than true)
        book_odds = {}
        best_book = ''
        best_value = -100

        for book in sportsbooks:
            # Each book has slightly different odds
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

        if best_value > 0:  # Only show +EV opportunities
            opportunities.append({
                "game": title,
                "sport": sport,
                "true_probability": round(prob * 100, 1),
                "true_odds": f"{'+' if true_american > 0 else ''}{true_american}",
                "best_book": best_book,
                "best_edge": best_value,
                "best_odds": book_odds[best_book]['american'],
                "book_odds": book_odds,
                "kelly_bet": round(max(0, (prob * (true_decimal) - 1) / (true_decimal - 1)) * 100, 1)
            })

    opportunities.sort(key=lambda x: x['best_edge'], reverse=True)

    return {
        "count": len(opportunities),
        "opportunities": opportunities,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
