"""
Shared dependencies for all route modules
"""
import os
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from passlib.context import CryptContext

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'betrslip')

client = AsyncIOMotorClient(MONGO_URL)
db: AsyncIOMotorDatabase = client[DB_NAME]

# Admin email
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'hundojeff@icloud.com')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get the current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user exists and is not banned
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get('is_banned'):
            raise HTTPException(status_code=403, detail="Account suspended")
        
        return {"user_id": user_id, "email": email, "user": user}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def is_admin(email: str) -> bool:
    """Check if user is admin"""
    return email == ADMIN_EMAIL


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify user is admin"""
    user = await get_current_user(credentials)
    if not is_admin(user['email']):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# Subscription check helper
async def get_user_subscription_status(user_id: str) -> dict:
    """Get user's subscription status"""
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    usage = await db.user_usage.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    is_subscribed = subscription and subscription.get('subscription_status') == 'active'
    analyses_used = usage.get('analyses_count', 0) if usage else 0
    free_limit = 5
    
    return {
        "is_subscribed": is_subscribed,
        "analyses_used": analyses_used,
        "free_limit": free_limit,
        "can_analyze": is_subscribed or analyses_used < free_limit
    }
