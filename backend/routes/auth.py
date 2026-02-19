"""
Authentication routes - login, signup, user management
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import os

from .deps import (
    db, security, get_current_user, get_admin_user,
    verify_password, get_password_hash, create_access_token,
    get_user_subscription_status, ADMIN_EMAIL
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Pydantic models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    user: dict


@router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": request.email,
        "password_hash": get_password_hash(request.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_admin": request.email == ADMIN_EMAIL,
        "is_banned": False
    }
    
    await db.users.insert_one(user)
    
    # Initialize usage tracking
    await db.user_usage.insert_one({
        "user_id": user_id,
        "analyses_count": 0,
        "device_fingerprints": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create token
    token = create_access_token({"sub": user_id, "email": request.email})
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": request.email,
            "created_at": user["created_at"]
        }
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, req: Request):
    """Login user"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get('is_banned'):
        raise HTTPException(status_code=403, detail="Account suspended")
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})

    # Track IP + last login
    client_ip = req.headers.get("x-forwarded-for", req.headers.get("x-real-ip", req.client.host if req.client else "unknown"))
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    update_ops = {
        "$set": {"last_login": now_iso, "last_active": now_iso},
        "$addToSet": {"ip_addresses": client_ip}
    }
    await db.users.update_one({"id": user["id"]}, update_ops)

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "is_admin": user.get("is_admin", False)
        }
    }


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info with subscription status"""
    user = current_user['user']
    subscription_status = await get_user_subscription_status(current_user['user_id'])
    
    return {
        "id": user["id"],
        "email": user["email"],
        "is_admin": user.get("is_admin", False),
        "subscription": subscription_status,
        "created_at": user.get("created_at")
    }


@router.get("/usage")
async def get_usage(current_user: dict = Depends(get_current_user)):
    """Get user's usage statistics"""
    user_id = current_user['user_id']
    
    usage = await db.user_usage.find_one({"user_id": user_id}, {"_id": 0})
    subscription = await db.subscriptions.find_one({"user_id": user_id}, {"_id": 0})
    
    is_subscribed = subscription and subscription.get('subscription_status') == 'active'
    analyses_count = usage.get('analyses_count', 0) if usage else 0
    
    return {
        "analyses_used": analyses_count,
        "free_limit": 5,
        "is_subscribed": is_subscribed,
        "can_analyze": is_subscribed or analyses_count < 5
    }


# Admin password reset endpoint (for initial setup)
class AdminResetRequest(BaseModel):
    secret_key: str
    new_password: str

@router.post("/admin-reset")
async def admin_reset_password(request: AdminResetRequest):
    """Reset admin password - requires secret key"""
    if request.secret_key != os.environ.get('ADMIN_RESET_SECRET', 'BetrSlip2026SecureReset'):
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    # Find or create admin user
    admin_user = await db.users.find_one({"email": ADMIN_EMAIL})
    
    if admin_user:
        # Update password
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {
                "password_hash": get_password_hash(request.new_password),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Admin password updated", "email": ADMIN_EMAIL}
    else:
        # Create admin user
        user_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": user_id,
            "email": ADMIN_EMAIL,
            "password_hash": get_password_hash(request.new_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_admin": True,
            "is_banned": False
        })
        
        # Create subscription for admin
        await db.subscriptions.insert_one({
            "user_id": user_id,
            "email": ADMIN_EMAIL,
            "subscription_status": "active",
            "subscription_start": datetime.now(timezone.utc).isoformat(),
            "granted_by_admin": True
        })
        
        return {"message": "Admin user created", "email": ADMIN_EMAIL}
