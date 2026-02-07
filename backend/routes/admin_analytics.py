"""
Admin Analytics Dashboard Routes
- Revenue metrics
- User growth charts
- Conversion rates
- AI accuracy tracking
- Daily/weekly/monthly trends
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

from .deps import db, get_admin_user

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])
logger = logging.getLogger(__name__)


@router.get("/overview")
async def get_analytics_overview(admin_user: dict = Depends(get_admin_user)):
    """Get high-level analytics overview"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # User metrics
    total_users = await db.users.count_documents({})
    users_today = await db.users.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    users_this_week = await db.users.count_documents({
        "created_at": {"$gte": week_ago.isoformat()}
    })
    users_this_month = await db.users.count_documents({
        "created_at": {"$gte": month_ago.isoformat()}
    })
    
    # Subscription metrics
    active_subscriptions = await db.subscriptions.count_documents({"subscription_status": "active"})
    
    # Revenue calculation ($5/month per subscriber)
    total_transactions = await db.payment_transactions.count_documents({"payment_status": "paid"})
    estimated_revenue = active_subscriptions * 5  # Current MRR
    
    # Analysis metrics
    total_analyses = await db.analyses.count_documents({})
    analyses_today = await db.analyses.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    analyses_this_week = await db.analyses.count_documents({
        "created_at": {"$gte": week_ago.isoformat()}
    })
    
    # Conversion rate (free to paid)
    conversion_rate = round((active_subscriptions / total_users * 100), 1) if total_users > 0 else 0
    
    # AI accuracy
    outcomes = await db.analyses.find(
        {"outcome": {"$exists": True}},
        {"analysis.overall_probability": 1, "outcome": 1}
    ).to_list(1000)
    
    accurate = 0
    total_decided = 0
    for o in outcomes:
        if o.get('outcome') in ['won', 'lost']:
            total_decided += 1
            prob = o.get('analysis', {}).get('overall_probability', 50)
            if (prob >= 50 and o.get('outcome') == 'won') or (prob < 50 and o.get('outcome') == 'lost'):
                accurate += 1
    
    ai_accuracy = round((accurate / total_decided * 100), 1) if total_decided > 0 else 0
    
    # Daily picks performance
    picks_won = await db.daily_picks.count_documents({"outcome": "won"})
    picks_lost = await db.daily_picks.count_documents({"outcome": "lost"})
    picks_total = picks_won + picks_lost
    picks_win_rate = round((picks_won / picks_total * 100), 1) if picks_total > 0 else 0
    
    return {
        "users": {
            "total": total_users,
            "today": users_today,
            "this_week": users_this_week,
            "this_month": users_this_month
        },
        "subscriptions": {
            "active": active_subscriptions,
            "conversion_rate": conversion_rate
        },
        "revenue": {
            "mrr": estimated_revenue,
            "total_transactions": total_transactions
        },
        "analyses": {
            "total": total_analyses,
            "today": analyses_today,
            "this_week": analyses_this_week
        },
        "ai_performance": {
            "accuracy": ai_accuracy,
            "total_decided": total_decided,
            "picks_win_rate": picks_win_rate,
            "picks_record": f"{picks_won}-{picks_lost}"
        }
    }


@router.get("/user-growth")
async def get_user_growth(
    days: int = 30,
    admin_user: dict = Depends(get_admin_user)
):
    """Get user growth data for charts"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Aggregate users by day
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.users.aggregate(pipeline).to_list(100)
    
    # Fill in missing days with 0
    data = []
    current = start_date
    result_dict = {r['_id']: r['count'] for r in results}
    
    while current <= now:
        date_str = current.strftime('%Y-%m-%d')
        data.append({
            "date": date_str,
            "users": result_dict.get(date_str, 0)
        })
        current += timedelta(days=1)
    
    return {"data": data}


@router.get("/analyses-trend")
async def get_analyses_trend(
    days: int = 30,
    admin_user: dict = Depends(get_admin_user)
):
    """Get analyses trend data for charts"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.analyses.aggregate(pipeline).to_list(100)
    
    data = []
    current = start_date
    result_dict = {r['_id']: r['count'] for r in results}
    
    while current <= now:
        date_str = current.strftime('%Y-%m-%d')
        data.append({
            "date": date_str,
            "analyses": result_dict.get(date_str, 0)
        })
        current += timedelta(days=1)
    
    return {"data": data}


@router.get("/revenue-trend")
async def get_revenue_trend(
    days: int = 30,
    admin_user: dict = Depends(get_admin_user)
):
    """Get revenue trend data"""
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    pipeline = [
        {"$match": {
            "payment_status": "paid",
            "created_at": {"$gte": start_date.isoformat()}
        }},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "count": {"$sum": 1},
            "revenue": {"$sum": 5}  # $5 per subscription
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.payment_transactions.aggregate(pipeline).to_list(100)
    
    data = []
    current = start_date
    result_dict = {r['_id']: r for r in results}
    
    while current <= now:
        date_str = current.strftime('%Y-%m-%d')
        day_data = result_dict.get(date_str, {"count": 0, "revenue": 0})
        data.append({
            "date": date_str,
            "transactions": day_data.get("count", 0),
            "revenue": day_data.get("revenue", 0)
        })
        current += timedelta(days=1)
    
    return {"data": data}


@router.get("/top-users")
async def get_top_users(
    limit: int = 10,
    admin_user: dict = Depends(get_admin_user)
):
    """Get most active users by analyses"""
    pipeline = [
        {"$group": {
            "_id": "$user_id",
            "analyses_count": {"$sum": 1}
        }},
        {"$sort": {"analyses_count": -1}},
        {"$limit": limit}
    ]
    
    results = await db.analyses.aggregate(pipeline).to_list(limit)
    
    users = []
    for r in results:
        user = await db.users.find_one({"id": r['_id']}, {"_id": 0, "email": 1})
        sub = await db.subscriptions.find_one({"user_id": r['_id']}, {"_id": 0, "subscription_status": 1})
        
        users.append({
            "user_id": r['_id'],
            "email": user.get('email', 'Unknown') if user else 'Unknown',
            "analyses_count": r['analyses_count'],
            "is_pro": sub.get('subscription_status') == 'active' if sub else False
        })
    
    return {"users": users}


@router.get("/sport-breakdown")
async def get_sport_breakdown(admin_user: dict = Depends(get_admin_user)):
    """Get analyses breakdown by sport"""
    pipeline = [
        {"$match": {"analysis.sport": {"$exists": True}}},
        {"$group": {
            "_id": "$analysis.sport",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}}
    ]
    
    results = await db.analyses.aggregate(pipeline).to_list(20)
    
    return {
        "breakdown": [
            {"sport": r['_id'] or 'Unknown', "count": r['count']}
            for r in results
        ]
    }


@router.get("/picks-performance")
async def get_picks_performance(admin_user: dict = Depends(get_admin_user)):
    """Get detailed picks performance analytics"""
    # By sport
    sport_pipeline = [
        {"$match": {"outcome": {"$in": ["won", "lost"]}}},
        {"$group": {
            "_id": "$sport",
            "total": {"$sum": 1},
            "won": {"$sum": {"$cond": [{"$eq": ["$outcome", "won"]}, 1, 0]}}
        }}
    ]
    
    by_sport = await db.daily_picks.aggregate(sport_pipeline).to_list(20)
    
    sport_stats = []
    for s in by_sport:
        win_rate = round((s['won'] / s['total'] * 100), 1) if s['total'] > 0 else 0
        sport_stats.append({
            "sport": s['_id'],
            "total": s['total'],
            "won": s['won'],
            "lost": s['total'] - s['won'],
            "win_rate": win_rate
        })
    
    # By confidence level
    conf_pipeline = [
        {"$match": {"outcome": {"$in": ["won", "lost"]}}},
        {"$bucket": {
            "groupBy": "$confidence",
            "boundaries": [0, 5, 7, 9, 11],
            "default": "other",
            "output": {
                "total": {"$sum": 1},
                "won": {"$sum": {"$cond": [{"$eq": ["$outcome", "won"]}, 1, 0]}}
            }
        }}
    ]
    
    by_confidence = await db.daily_picks.aggregate(conf_pipeline).to_list(10)
    
    confidence_stats = []
    for c in by_confidence:
        if c['_id'] == "other":
            continue
        win_rate = round((c['won'] / c['total'] * 100), 1) if c['total'] > 0 else 0
        confidence_stats.append({
            "confidence_range": f"{c['_id']}-{c['_id']+2}",
            "total": c['total'],
            "won": c['won'],
            "win_rate": win_rate
        })
    
    return {
        "by_sport": sport_stats,
        "by_confidence": confidence_stats
    }


@router.get("/activity-heatmap")
async def get_activity_heatmap(admin_user: dict = Depends(get_admin_user)):
    """Get user activity by hour of day and day of week"""
    pipeline = [
        {"$addFields": {
            "parsed_date": {"$dateFromString": {"dateString": "$created_at"}}
        }},
        {"$addFields": {
            "hour": {"$hour": "$parsed_date"},
            "day_of_week": {"$dayOfWeek": "$parsed_date"}
        }},
        {"$group": {
            "_id": {"hour": "$hour", "day": "$day_of_week"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.analyses.aggregate(pipeline).to_list(200)
    
    # Create heatmap data
    days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    heatmap = []
    
    result_dict = {(r['_id']['day'], r['_id']['hour']): r['count'] for r in results}
    
    for day_idx in range(1, 8):  # MongoDB dayOfWeek: 1=Sun, 7=Sat
        for hour in range(24):
            heatmap.append({
                "day": days[day_idx - 1],
                "hour": hour,
                "count": result_dict.get((day_idx, hour), 0)
            })
    
    return {"heatmap": heatmap}


@router.get("/funnel")
async def get_conversion_funnel(admin_user: dict = Depends(get_admin_user)):
    """Get conversion funnel data"""
    total_users = await db.users.count_documents({})
    users_with_analysis = await db.analyses.distinct("user_id")
    users_with_multiple = await db.analyses.aggregate([
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 3}}}
    ]).to_list(None)
    active_subscribers = await db.subscriptions.count_documents({"subscription_status": "active"})
    
    return {
        "funnel": [
            {"stage": "Registered", "count": total_users, "percentage": 100},
            {"stage": "First Analysis", "count": len(users_with_analysis), 
             "percentage": round(len(users_with_analysis) / total_users * 100, 1) if total_users > 0 else 0},
            {"stage": "3+ Analyses", "count": len(users_with_multiple),
             "percentage": round(len(users_with_multiple) / total_users * 100, 1) if total_users > 0 else 0},
            {"stage": "Pro Subscriber", "count": active_subscribers,
             "percentage": round(active_subscribers / total_users * 100, 1) if total_users > 0 else 0}
        ]
    }
