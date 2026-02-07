"""
Referral Program Routes
- Generate unique referral codes
- Track referrals and conversions
- Award 1 week free Pro to referrers when referee subscribes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import hashlib

from .deps import db, get_current_user, get_admin_user

router = APIRouter(prefix="/referrals", tags=["referrals"])


def generate_referral_code(user_id: str) -> str:
    """Generate a unique, short referral code"""
    hash_input = f"{user_id}-{datetime.now().timestamp()}"
    hash_obj = hashlib.md5(hash_input.encode())
    return hash_obj.hexdigest()[:8].upper()


class ReferralCodeResponse(BaseModel):
    code: str
    referral_link: str
    total_referrals: int
    successful_referrals: int
    rewards_earned: int


@router.get("/my-code")
async def get_my_referral_code(current_user: dict = Depends(get_current_user)):
    """Get or create user's referral code"""
    user_id = current_user['user_id']
    
    # Check if user already has a referral code
    existing = await db.referral_codes.find_one({"user_id": user_id}, {"_id": 0})
    
    if existing:
        code = existing['code']
    else:
        # Generate new code
        code = generate_referral_code(user_id)
        await db.referral_codes.insert_one({
            "user_id": user_id,
            "email": current_user.get('email', ''),
            "code": code,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Count referrals
    total_referrals = await db.referrals.count_documents({"referrer_id": user_id})
    successful_referrals = await db.referrals.count_documents({
        "referrer_id": user_id,
        "converted": True
    })
    
    # Count rewards earned (weeks of free Pro)
    rewards = await db.referral_rewards.count_documents({"user_id": user_id})
    
    return {
        "code": code,
        "referral_link": f"https://betrslip.com?ref={code}",
        "total_referrals": total_referrals,
        "successful_referrals": successful_referrals,
        "rewards_earned": rewards
    }


class ApplyReferralRequest(BaseModel):
    code: str


@router.post("/apply")
async def apply_referral_code(
    request: ApplyReferralRequest,
    current_user: dict = Depends(get_current_user)
):
    """Apply a referral code when signing up"""
    user_id = current_user['user_id']
    code = request.code.upper().strip()
    
    # Check if user already used a referral code
    existing = await db.referrals.find_one({"referee_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="You've already used a referral code")
    
    # Find the referral code
    referral_code = await db.referral_codes.find_one({"code": code})
    if not referral_code:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    referrer_id = referral_code['user_id']
    
    # Can't refer yourself
    if referrer_id == user_id:
        raise HTTPException(status_code=400, detail="You can't use your own referral code")
    
    # Record the referral
    await db.referrals.insert_one({
        "id": str(uuid.uuid4()),
        "referrer_id": referrer_id,
        "referee_id": user_id,
        "referee_email": current_user.get('email', ''),
        "code": code,
        "converted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Referral code applied! Your referrer will get 1 week free Pro when you subscribe."}


async def process_referral_reward(user_id: str):
    """
    Called when a user subscribes - check if they were referred and reward the referrer
    """
    # Find if this user was referred
    referral = await db.referrals.find_one({"referee_id": user_id, "converted": False})
    
    if not referral:
        return None
    
    referrer_id = referral['referrer_id']
    
    # Mark referral as converted
    await db.referrals.update_one(
        {"referee_id": user_id},
        {"$set": {"converted": True, "converted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Award 1 week free Pro to referrer
    reward_end = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Check if referrer already has subscription
    existing_sub = await db.subscriptions.find_one({"user_id": referrer_id})
    
    if existing_sub and existing_sub.get('subscription_status') == 'active':
        # Extend their subscription by 1 week
        current_end = existing_sub.get('subscription_end')
        if current_end:
            try:
                current_end_dt = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
                reward_end = current_end_dt + timedelta(days=7)
            except:
                pass
        
        await db.subscriptions.update_one(
            {"user_id": referrer_id},
            {"$set": {"subscription_end": reward_end.isoformat()}}
        )
    else:
        # Grant new 1-week Pro subscription
        await db.subscriptions.update_one(
            {"user_id": referrer_id},
            {"$set": {
                "user_id": referrer_id,
                "subscription_status": "active",
                "subscription_start": datetime.now(timezone.utc).isoformat(),
                "subscription_end": reward_end.isoformat(),
                "source": "referral_reward"
            }},
            upsert=True
        )
    
    # Record the reward
    await db.referral_rewards.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": referrer_id,
        "referee_id": user_id,
        "reward_type": "1_week_pro",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return referrer_id


@router.get("/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers (public)"""
    pipeline = [
        {"$match": {"converted": True}},
        {"$group": {"_id": "$referrer_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    results = await db.referrals.aggregate(pipeline).to_list(10)
    
    leaderboard = []
    for i, item in enumerate(results):
        # Get referrer info (anonymized)
        referrer = await db.users.find_one({"id": item['_id']}, {"_id": 0, "email": 1})
        email = referrer.get('email', 'user') if referrer else 'user'
        # Anonymize email
        if '@' in email:
            parts = email.split('@')
            anonymized = parts[0][:2] + '***@' + parts[1]
        else:
            anonymized = email[:2] + '***'
        
        leaderboard.append({
            "rank": i + 1,
            "user": anonymized,
            "referrals": item['count']
        })
    
    return {"leaderboard": leaderboard}


@router.get("/admin/stats")
async def get_referral_stats(admin_user: dict = Depends(get_admin_user)):
    """Get referral program statistics (admin only)"""
    total_codes = await db.referral_codes.count_documents({})
    total_referrals = await db.referrals.count_documents({})
    converted_referrals = await db.referrals.count_documents({"converted": True})
    total_rewards = await db.referral_rewards.count_documents({})
    
    # Recent referrals
    recent = await db.referrals.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    conversion_rate = round((converted_referrals / total_referrals * 100), 1) if total_referrals > 0 else 0
    
    return {
        "total_codes_generated": total_codes,
        "total_referrals": total_referrals,
        "converted_referrals": converted_referrals,
        "conversion_rate": conversion_rate,
        "total_rewards_given": total_rewards,
        "recent_referrals": recent
    }
