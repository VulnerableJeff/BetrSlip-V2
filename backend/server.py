from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT and password hashing
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()


# ===== MODELS =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class BetAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image_data: str  # base64 encoded
    win_probability: float
    analysis_text: str
    bet_details: Optional[str] = None
    individual_bets: Optional[List[dict]] = None
    risk_factors: Optional[List[str]] = None
    positive_factors: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BetAnalysisResponse(BaseModel):
    id: str
    win_probability: float
    analysis_text: str
    bet_details: Optional[str]
    individual_bets: Optional[List[dict]] = None
    risk_factors: Optional[List[str]] = None
    positive_factors: Optional[List[str]] = None
    created_at: datetime

class BetHistoryResponse(BaseModel):
    id: str
    win_probability: float
    analysis_text: str
    bet_details: Optional[str]
    individual_bets: Optional[List[dict]] = None
    risk_factors: Optional[List[str]] = None
    positive_factors: Optional[List[str]] = None
    image_data: str
    created_at: datetime


# ===== AUTH UTILITIES =====
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(user_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ===== AUTH ROUTES =====
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    password_hash = hash_password(user_data.password)
    user = User(email=user_data.email, password_hash=password_hash)
    
    # Save to database
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_jwt_token(user.id, user.email)
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(user_data.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_jwt_token(user_doc['id'], user_doc['email'])
    
    user_response = UserResponse(
        id=user_doc['id'],
        email=user_doc['email'],
        created_at=datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    )
    
    return TokenResponse(token=token, user=user_response)


# ===== BET ANALYSIS ROUTES =====
@api_router.post("/analyze", response_model=BetAnalysisResponse)
async def analyze_bet_slip(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    try:
        # Read and encode image
        image_bytes = await file.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Create AI chat instance
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"bet_analysis_{uuid.uuid4()}",
            system_message="You are a sports betting expert analyzer. Analyze betting slips and provide realistic win probability estimates based on the bets shown."
        )
        chat.with_model("openai", "gpt-4o")
        
        # Create message with image
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text="""You are an expert sports betting analyst. Analyze this betting slip in detail.

Provide a comprehensive analysis in JSON format:
{
    "win_probability": <realistic number 0-100>,
    "bet_type": "<single/parlay/teaser etc>",
    "total_odds": "<combined odds if visible>",
    "individual_bets": [
        {
            "description": "<team/player and bet type>",
            "odds": "<odds for this bet>",
            "individual_probability": <estimated win chance 0-100>,
            "reasoning": "<brief analysis of this specific bet>"
        }
    ],
    "risk_factors": [
        "<specific concern 1>",
        "<specific concern 2>",
        "<specific concern 3>"
    ],
    "positive_factors": [
        "<strength 1>",
        "<strength 2>"
    ],
    "analysis": "<2-3 sentences overall assessment explaining the win_probability>",
    "bet_details": "<concise summary: what bets, stakes, potential payout>"
}

Analysis Guidelines:
- For single bets: 30-70% range is typical
- For 2-leg parlays: 20-50% range
- For 3-leg parlays: 10-35% range  
- For 4+ leg parlays: 5-20% range
- Underdogs (+odds): lower probability
- Favorites (-odds): higher probability but consider value
- Be realistic and specific in your risk/positive factors
- If you can't read something clearly, note it in bet_details""",
            file_contents=[image_content]
        )
        
        # Get AI response
        response = await chat.send_message(user_message)
        
        # Parse response - handle both JSON and plain text
        import json
        import re
        try:
            # Try to extract JSON from response (might be wrapped in markdown)
            json_match = re.search(r'\{[^{}]*"win_probability"[^{}]*"analysis"[^{}]*\}', response, re.DOTALL)
            if not json_match:
                # Try to find nested JSON
                json_match = re.search(r'\{(?:[^{}]|{[^{}]*})*\}', response, re.DOTALL)
            
            if json_match:
                result = json.loads(json_match.group())
                win_probability = float(result.get('win_probability', 50.0))
                analysis_text = result.get('analysis', 'Analysis completed')
                bet_details = result.get('bet_details', None)
                individual_bets = result.get('individual_bets', None)
                risk_factors = result.get('risk_factors', None)
                positive_factors = result.get('positive_factors', None)
            else:
                # If no JSON found, parse plain text response
                prob_match = re.search(r'(\d+(?:\.\d+)?)\s*%', response)
                win_probability = float(prob_match.group(1)) if prob_match else 50.0
                analysis_text = response.replace('```json', '').replace('```', '').strip()
                bet_details = None
                individual_bets = None
                risk_factors = None
                positive_factors = None
        except Exception as e:
            logging.error(f"Error parsing AI response: {str(e)}")
            win_probability = 50.0
            analysis_text = response.replace('```json', '').replace('```', '').strip()
            bet_details = None
            individual_bets = None
            risk_factors = None
            positive_factors = None
        
        # Save analysis
        bet_analysis = BetAnalysis(
            user_id=current_user['user_id'],
            image_data=image_base64,
            win_probability=win_probability,
            analysis_text=analysis_text,
            bet_details=bet_details,
            individual_bets=individual_bets,
            risk_factors=risk_factors,
            positive_factors=positive_factors
        )
        
        analysis_dict = bet_analysis.model_dump()
        analysis_dict['created_at'] = analysis_dict['created_at'].isoformat()
        await db.bet_analyses.insert_one(analysis_dict)
        
        return BetAnalysisResponse(
            id=bet_analysis.id,
            win_probability=win_probability,
            analysis_text=analysis_text,
            bet_details=bet_details,
            individual_bets=individual_bets,
            risk_factors=risk_factors,
            positive_factors=positive_factors,
            created_at=bet_analysis.created_at
        )
        
    except Exception as e:
        logging.error(f"Error analyzing bet slip: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing bet slip: {str(e)}")


@api_router.get("/history", response_model=List[BetHistoryResponse])
async def get_bet_history(current_user: dict = Depends(get_current_user)):
    # Get user's bet history
    analyses = await db.bet_analyses.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Convert timestamps
    for analysis in analyses:
        if isinstance(analysis['created_at'], str):
            analysis['created_at'] = datetime.fromisoformat(analysis['created_at'])
    
    return [
        BetHistoryResponse(
            id=a['id'],
            win_probability=a['win_probability'],
            analysis_text=a['analysis_text'],
            bet_details=a.get('bet_details'),
            individual_bets=a.get('individual_bets'),
            risk_factors=a.get('risk_factors'),
            positive_factors=a.get('positive_factors'),
            image_data=a['image_data'],
            created_at=a['created_at']
        )
        for a in analyses
    ]


@api_router.get("/")
async def root():
    return {"message": "BetrSlip API - AI Bet Slip Companion"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
