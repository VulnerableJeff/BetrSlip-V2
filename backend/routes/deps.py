"""
Shared dependencies for all route modules
"""
import os
import jwt
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from passlib.context import CryptContext
from dotenv import load_dotenv

# Ensure .env is loaded BEFORE reading any env vars (critical for production)
# Do NOT use override=True — K8s sets MONGO_URL/DB_NAME to Atlas, .env has localhost
load_dotenv(Path(__file__).parent.parent / '.env')

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72  # Extended to 72 hours

# MongoDB connection - single shared connection with production settings
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

# Log connection info for debugging (mask credentials)
_display_url = MONGO_URL[:30] + "..." if MONGO_URL and len(MONGO_URL) > 30 else MONGO_URL
print(f"[STARTUP] MongoDB connecting to: {_display_url}, DB: {DB_NAME}")

if not MONGO_URL:
    print("[STARTUP] WARNING: MONGO_URL is NOT SET — falling back to localhost. This will fail in production!")
    MONGO_URL = 'mongodb://localhost:27017'
if not DB_NAME:
    print("[STARTUP] WARNING: DB_NAME is NOT SET — falling back to 'betrslip'")
    DB_NAME = 'betrslip'

# Configure MongoDB client with connection pooling for production
client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=10,
    minPoolSize=1,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    retryWrites=True
)
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
            raise HTTPException(status_code=401, detail="Invalid token: no user_id")
        
        # Check if user exists and is not banned
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found - please login again")
        
        if user.get('is_banned'):
            raise HTTPException(status_code=403, detail="Account suspended")

        # Update last_active for online status tracking (fire-and-forget)
        try:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception:
            pass

        return {"user_id": user_id, "email": email, "user": user}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired - please login again")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token - please login again")


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
