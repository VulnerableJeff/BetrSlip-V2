"""
Admin Dashboard & Subscription System for BetrSlip
- Admin user management (view users, ban/unban)
- Device fingerprinting to prevent VPN abuse
- Usage tracking (5 free analyses)
- Stripe subscription ($5/month)
"""

import os
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from fastapi import HTTPException, Request
import logging

logger = logging.getLogger(__name__)

# Configuration
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'hundojeff@icloud.com')
FREE_ANALYSIS_LIMIT = int(os.environ.get('FREE_ANALYSIS_LIMIT', '5'))
SUBSCRIPTION_PRICE = float(os.environ.get('SUBSCRIPTION_PRICE', '5.00'))


# ===== MODELS =====

class DeviceFingerprint(BaseModel):
    """Device fingerprint to track unique devices"""
    fingerprint_hash: str
    user_agent: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    ip_address: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSubscription(BaseModel):
    """User subscription status"""
    user_id: str
    email: str
    is_subscribed: bool = False
    subscription_id: Optional[str] = None
    subscription_status: Optional[str] = None  # "active", "canceled", "past_due"
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None


class UserUsage(BaseModel):
    """Track user's free analysis usage"""
    user_id: str
    analyses_count: int = 0
    device_fingerprints: List[str] = []  # List of fingerprint hashes
    last_analysis_at: Optional[datetime] = None


class AdminUserView(BaseModel):
    """Admin view of a user"""
    id: str
    email: str
    created_at: datetime
    is_banned: bool = False
    ban_reason: Optional[str] = None
    banned_at: Optional[datetime] = None
    analyses_count: int = 0
    is_subscribed: bool = False
    subscription_status: Optional[str] = None
    last_login: Optional[datetime] = None
    device_fingerprints: List[Dict] = []
    ip_addresses: List[str] = []


# ===== DEVICE FINGERPRINTING =====

def generate_device_fingerprint(request: Request, client_data: dict = None) -> str:
    """
    Generate a device fingerprint hash from request headers and client data.
    This helps prevent users from creating multiple accounts to bypass limits.
    """
    # Collect fingerprint components
    components = []
    
    # From request headers
    user_agent = request.headers.get('user-agent', '')
    accept_language = request.headers.get('accept-language', '')
    accept_encoding = request.headers.get('accept-encoding', '')
    
    components.append(user_agent)
    components.append(accept_language)
    components.append(accept_encoding)
    
    # From client-side data (sent from frontend)
    if client_data:
        components.append(str(client_data.get('screen_resolution', '')))
        components.append(str(client_data.get('timezone', '')))
        components.append(str(client_data.get('platform', '')))
        components.append(str(client_data.get('canvas_hash', '')))
        components.append(str(client_data.get('webgl_hash', '')))
    
    # Create hash
    fingerprint_string = '|'.join(components)
    fingerprint_hash = hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    return fingerprint_hash


def get_client_ip(request: Request) -> str:
    """Get the real client IP address, handling proxies"""
    # Check for forwarded headers (common with proxies/load balancers)
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        # Take the first IP in the chain
        return forwarded.split(',')[0].strip()
    
    real_ip = request.headers.get('x-real-ip')
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    return request.client.host if request.client else 'unknown'


# ===== USAGE TRACKING =====

async def check_usage_limit(db, user_id: str, device_fingerprint: str, ip_address: str) -> dict:
    """
    Check if user has exceeded free analysis limit.
    Also checks if the device fingerprint is associated with banned accounts.
    
    Returns:
        {
            "allowed": bool,
            "reason": str,
            "analyses_remaining": int,
            "is_subscribed": bool
        }
    """
    # Check if user is banned
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return {"allowed": False, "reason": "User not found", "analyses_remaining": 0, "is_subscribed": False}
    
    if user.get('is_banned', False):
        return {
            "allowed": False, 
            "reason": "Your account has been suspended. Contact support for assistance.",
            "analyses_remaining": 0,
            "is_subscribed": False
        }
    
    # Check if user has active subscription
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    if subscription and subscription.get('subscription_status') == 'active':
        return {
            "allowed": True,
            "reason": "Active subscription",
            "analyses_remaining": -1,  # Unlimited
            "is_subscribed": True
        }
    
    # Check device fingerprint against banned accounts
    banned_with_fingerprint = await db.users.find_one({
        "is_banned": True,
        "device_fingerprints": device_fingerprint
    }, {"_id": 0})
    
    if banned_with_fingerprint:
        return {
            "allowed": False,
            "reason": "This device is associated with a suspended account.",
            "analyses_remaining": 0,
            "is_subscribed": False
        }
    
    # Check usage count
    usage = await db.user_usage.find_one({"user_id": user_id}, {"_id": 0})
    
    if not usage:
        # New user, create usage record
        usage = {
            "user_id": user_id,
            "analyses_count": 0,
            "device_fingerprints": [device_fingerprint],
            "ip_addresses": [ip_address],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_usage.insert_one(usage)
    else:
        # Update device fingerprint and IP if new
        update_fields = {}
        if device_fingerprint not in usage.get('device_fingerprints', []):
            update_fields["$addToSet"] = {"device_fingerprints": device_fingerprint}
        if ip_address not in usage.get('ip_addresses', []):
            if "$addToSet" in update_fields:
                update_fields["$addToSet"]["ip_addresses"] = ip_address
            else:
                update_fields["$addToSet"] = {"ip_addresses": ip_address}
        
        if update_fields:
            await db.user_usage.update_one({"user_id": user_id}, update_fields)
    
    analyses_count = usage.get('analyses_count', 0)
    analyses_remaining = max(0, FREE_ANALYSIS_LIMIT - analyses_count)
    
    if analyses_count >= FREE_ANALYSIS_LIMIT:
        return {
            "allowed": False,
            "reason": f"You've used all {FREE_ANALYSIS_LIMIT} free analyses. Subscribe for unlimited access at ${SUBSCRIPTION_PRICE}/month.",
            "analyses_remaining": 0,
            "is_subscribed": False,
            "show_subscription": True
        }
    
    return {
        "allowed": True,
        "reason": f"{analyses_remaining} free analyses remaining",
        "analyses_remaining": analyses_remaining,
        "is_subscribed": False
    }


async def increment_usage(db, user_id: str):
    """Increment the user's analysis count"""
    await db.user_usage.update_one(
        {"user_id": user_id},
        {
            "$inc": {"analyses_count": 1},
            "$set": {"last_analysis_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )


async def update_device_fingerprint(db, user_id: str, fingerprint: str, ip_address: str):
    """Store device fingerprint and IP for user"""
    await db.users.update_one(
        {"id": user_id},
        {
            "$addToSet": {
                "device_fingerprints": fingerprint,
                "ip_addresses": ip_address
            },
            "$set": {"last_login": datetime.now(timezone.utc).isoformat()}
        }
    )


# ===== ADMIN FUNCTIONS =====

def is_admin(email: str) -> bool:
    """Check if user is admin"""
    return email.lower() == ADMIN_EMAIL.lower()


async def get_all_users(db, skip: int = 0, limit: int = 50) -> List[dict]:
    """Get all users with their stats for admin dashboard"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for user in users:
        # Get usage stats
        usage = await db.user_usage.find_one({"user_id": user['id']}, {"_id": 0})
        
        # Get subscription status
        subscription = await db.subscriptions.find_one({"user_id": user['id']}, {"_id": 0})
        
        result.append({
            "id": user['id'],
            "email": user['email'],
            "created_at": user.get('created_at'),
            "is_banned": user.get('is_banned', False),
            "ban_reason": user.get('ban_reason'),
            "banned_at": user.get('banned_at'),
            "analyses_count": usage.get('analyses_count', 0) if usage else 0,
            "is_subscribed": subscription.get('subscription_status') == 'active' if subscription else False,
            "subscription_status": subscription.get('subscription_status') if subscription else None,
            "last_login": user.get('last_login'),
            "device_fingerprints": user.get('device_fingerprints', []),
            "ip_addresses": user.get('ip_addresses', [])
        })
    
    return result


async def get_admin_stats(db) -> dict:
    """Get overall statistics for admin dashboard"""
    total_users = await db.users.count_documents({})
    banned_users = await db.users.count_documents({"is_banned": True})
    active_subscribers = await db.subscriptions.count_documents({"subscription_status": "active"})
    total_analyses = await db.bet_analyses.count_documents({})
    
    # Get recent signups (last 7 days)
    seven_days_ago = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    # Note: This is a simplified query, in production you'd need proper date handling
    
    return {
        "total_users": total_users,
        "banned_users": banned_users,
        "active_subscribers": active_subscribers,
        "total_analyses": total_analyses,
        "free_analysis_limit": FREE_ANALYSIS_LIMIT,
        "subscription_price": SUBSCRIPTION_PRICE
    }


async def ban_user(db, user_id: str, reason: str = None) -> bool:
    """Ban a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_banned": True,
                "ban_reason": reason or "Violated terms of service",
                "banned_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return result.modified_count > 0


async def unban_user(db, user_id: str) -> bool:
    """Unban a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {
            "$set": {"is_banned": False},
            "$unset": {"ban_reason": "", "banned_at": ""}
        }
    )
    return result.modified_count > 0


# ===== SUBSCRIPTION FUNCTIONS =====

async def create_subscription_record(db, user_id: str, email: str, stripe_customer_id: str, subscription_id: str):
    """Create or update subscription record"""
    subscription_data = {
        "user_id": user_id,
        "email": email,
        "stripe_customer_id": stripe_customer_id,
        "subscription_id": subscription_id,
        "subscription_status": "active",
        "subscription_start": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": subscription_data},
        upsert=True
    )


async def update_subscription_status(db, user_id: str, status: str):
    """Update subscription status"""
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "subscription_status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )


async def get_user_subscription(db, user_id: str) -> dict:
    """Get user's subscription status"""
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    usage = await db.user_usage.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "is_subscribed": subscription.get('subscription_status') == 'active' if subscription else False,
        "subscription_status": subscription.get('subscription_status') if subscription else None,
        "analyses_used": usage.get('analyses_count', 0) if usage else 0,
        "analyses_remaining": max(0, FREE_ANALYSIS_LIMIT - (usage.get('analyses_count', 0) if usage else 0)),
        "free_limit": FREE_ANALYSIS_LIMIT,
        "subscription_price": SUBSCRIPTION_PRICE
    }
