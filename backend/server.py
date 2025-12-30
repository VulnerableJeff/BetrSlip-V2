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


# Import sports data service
import sys
sys.path.append(os.path.dirname(__file__))
from sports_data_service import get_enhanced_context_for_analysis, SportsDataService
from injury_weather_service import get_enhanced_game_context


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


# ===== UTILITY FUNCTIONS =====
def american_to_decimal(american_odds: str) -> float:
    """Convert American odds to decimal odds"""
    try:
        odds = float(american_odds.replace('+', '').replace('-', ''))
        if american_odds.startswith('-'):
            return 1 + (100 / odds)
        else:
            return 1 + (odds / 100)
    except:
        return 2.0  # Default to even odds

def decimal_to_implied_prob(decimal_odds: float) -> float:
    """Convert decimal odds to implied probability"""
    return (1 / decimal_odds) * 100

def calculate_kelly_criterion(win_prob: float, decimal_odds: float) -> float:
    """
    Calculate Kelly Criterion percentage
    Kelly % = (bp - q) / b
    where b = decimal_odds - 1, p = win probability, q = 1 - p
    """
    b = decimal_odds - 1
    p = win_prob / 100
    q = 1 - p
    kelly = (b * p - q) / b
    # Cap at 25% max for safety (fractional Kelly)
    return max(0, min(kelly * 100, 25))

def calculate_expected_value(win_prob: float, decimal_odds: float, stake: float = 100) -> float:
    """
    Calculate Expected Value
    EV = (win_prob * profit) - (loss_prob * stake)
    """
    p = win_prob / 100
    profit = stake * (decimal_odds - 1)
    ev = (p * profit) - ((1 - p) * stake)
    return (ev / stake) * 100  # Return as percentage

def probability_to_american_odds(prob: float) -> str:
    """Convert probability to American odds format"""
    if prob >= 50:
        odds = -(prob / (100 - prob)) * 100
        return f"{int(odds)}"
    else:
        odds = ((100 - prob) / prob) * 100
        return f"+{int(odds)}"

def get_bet_recommendation(ev: float, kelly: float, confidence: int) -> str:
    """Determine bet recommendation based on metrics"""
    if ev > 5 and kelly > 2 and confidence >= 7:
        return "STRONG BET"
    elif ev > 0 and kelly > 0:
        return "BET"
    elif ev > -2:
        return "SMALL/SKIP"
    else:
        return "PASS"


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
    # Advanced Analytics
    expected_value: Optional[float] = None
    kelly_percentage: Optional[float] = None
    true_odds: Optional[str] = None
    recommendation: Optional[str] = None
    confidence_score: Optional[int] = None
    parlay_vs_straight: Optional[dict] = None
    estimated_roi: Optional[float] = None
    # Real-Time Intelligence
    injuries_data: Optional[List[dict]] = None
    weather_data: Optional[dict] = None
    team_form_data: Optional[List[dict]] = None
    # Historical Tracking
    actual_outcome: Optional[str] = None  # "won", "lost", "push", "pending"
    outcome_marked_at: Optional[datetime] = None
    stake_amount: Optional[float] = None  # User's actual stake
    payout_amount: Optional[float] = None  # Actual payout
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BetAnalysisResponse(BaseModel):
    id: str
    win_probability: float
    analysis_text: str
    bet_details: Optional[str]
    individual_bets: Optional[List[dict]] = None
    risk_factors: Optional[List[str]] = None
    positive_factors: Optional[List[str]] = None
    # Advanced Analytics
    expected_value: Optional[float] = None  # EV percentage
    kelly_percentage: Optional[float] = None  # Kelly stake percentage
    true_odds: Optional[str] = None  # What odds should be
    recommendation: Optional[str] = None  # BET/PASS/SMALL
    confidence_score: Optional[int] = None  # 1-10 scale
    parlay_vs_straight: Optional[dict] = None  # Comparison if parlay
    estimated_roi: Optional[float] = None  # Expected ROI
    # Real-Time Intelligence
    injuries_data: Optional[List[dict]] = None  # Injury reports
    weather_data: Optional[dict] = None  # Weather conditions
    team_form_data: Optional[List[dict]] = None  # Team recent form
    created_at: datetime

class BetHistoryResponse(BaseModel):
    id: str
    win_probability: float
    analysis_text: str
    bet_details: Optional[str]
    individual_bets: Optional[List[dict]] = None
    risk_factors: Optional[List[str]] = None
    positive_factors: Optional[List[str]] = None
    expected_value: Optional[float] = None
    kelly_percentage: Optional[float] = None
    recommendation: Optional[str] = None
    confidence_score: Optional[int] = None
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
            system_message="""You are an elite sports betting analyst with OCR expertise and access to real-time market data. 
            
Your analysis must be:
1. PRECISE: Extract ALL text from bet slips accurately - odds, teams, amounts, bet types
2. DATA-DRIVEN: Use real-time odds, line movements, and market indicators provided
3. REALISTIC: Most bets have negative EV - don't be overly optimistic
4. SHARP: Consider sharp money indicators, line movement, and market efficiency

When real-time data is provided, heavily weight it in your analysis."""
        )
        chat.with_model("openai", "gpt-4o")
        
        # STEP 1: Dedicated OCR/Extraction Pass
        # This improves accuracy by focusing solely on text extraction first
        image_content = ImageContent(image_base64=image_base64)
        
        extraction_prompt = """STEP 1: EXTRACT ALL TEXT FROM THIS BET SLIP IMAGE

Focus on extracting EVERY piece of text visible. Be meticulous and accurate.

Return a structured extraction:
```
SPORTSBOOK: [App name - DraftKings, FanDuel, Hard Rock, BetMGM, etc.]
BET_TYPE: [Single, Parlay, Same Game Parlay, Teaser, Round Robin, etc.]
TOTAL_STAKE: [Amount wagered with $ symbol]
POTENTIAL_PAYOUT: [Potential win amount]
TOTAL_ODDS: [Combined odds if shown]

INDIVIDUAL SELECTIONS:
1. Team/Player: [exact name]
   Bet Type: [Moneyline, Spread, Over/Under, Player Prop, etc.]
   Line: [spread or total if applicable]
   Odds: [American format odds]
   
2. Team/Player: [exact name]
   Bet Type: [...]
   Line: [...]
   Odds: [...]

[Continue for all selections...]

OTHER VISIBLE TEXT:
- [Any other relevant text like game dates, times, leagues]
```

Be EXACT with names, numbers and odds. If something is unclear, note it as [unclear]."""

        extraction_msg = UserMessage(
            text=extraction_prompt,
            file_contents=[image_content]
        )
        
        extracted_data = await chat.send_message(extraction_msg)
        logger.info(f"Extracted bet slip data: {extracted_data[:500]}...")
        
        # STEP 2: Get Enhanced Context with Real-Time Data
        enhanced_context = ""
        injuries_data = []
        weather_data = None
        team_form_data = []
        
        try:
            # Extract team names from the extracted text
            team_names = SportsDataService.extract_team_names(extracted_data)
            logger.info(f"Extracted teams: {team_names}")
            
            # Fetch real-time data for each team
            from injury_weather_service import InjuryWeatherService
            
            for team in team_names[:2]:  # Max 2 teams
                # Get injuries
                team_injuries = await InjuryWeatherService.get_injuries_for_team(team)
                if team_injuries:
                    injuries_data.extend([{**inj, 'team': team.title()} for inj in team_injuries])
                
                # Get weather (usually just need one location)
                if not weather_data:
                    team_weather = await InjuryWeatherService.get_weather_for_game(team)
                    if team_weather and 'note' not in team_weather:
                        weather_data = team_weather
                
                # Get team form
                recent_games = await SportsDataService.get_recent_games(team, limit=5)
                if recent_games:
                    form = SportsDataService.calculate_form_rating(recent_games)
                    record = await SportsDataService.get_team_record(team)
                    team_form_data.append({
                        'team': record.get('team_name', team.title()) if record else team.title(),
                        'record': record.get('overall', 'N/A') if record else 'N/A',
                        'form': form.get('form', ''),
                        'rating': form.get('rating', 'Unknown'),
                        'avg_margin': form.get('avg_margin', 0),
                        'recent': [f"{g['result']} vs {g['opponent']}" for g in recent_games[:3]]
                    })
            
            # Get real-time sports odds data context
            odds_context = await get_enhanced_context_for_analysis([], extracted_data)
            
            # Get injury and weather context
            injury_weather_context = await get_enhanced_game_context(team_names)
            
            # Combine all contexts
            enhanced_context = odds_context + injury_weather_context
            
            logger.info(f"Enhanced context length: {len(enhanced_context)}")
            logger.info(f"Injuries found: {len(injuries_data)}, Weather: {weather_data is not None}, Team forms: {len(team_form_data)}")
        except Exception as e:
            logger.error(f"Error getting enhanced context: {str(e)}")
            enhanced_context = ""
        
        # STEP 3: Full Analysis with Extracted Data + Context
        analysis_prompt = f"""STEP 2: ANALYZE THIS BET SLIP

EXTRACTED BET SLIP DATA:
{extracted_data}

{enhanced_context}

Now provide your COMPREHENSIVE analysis in JSON format:

{{
    "win_probability": <realistic number 0-100>,
    "confidence_score": <1-10, how confident in this probability>,
    "bet_type": "<single/parlay/teaser etc>",
    "total_stake": "<stake amount if visible>",
    "total_odds": "<combined odds>",
    "potential_payout": "<payout if visible>",
    "individual_bets": [
        {{
            "description": "<team/player and bet type>",
            "odds": "<American odds format e.g. -140, +200>",
            "individual_probability": <win chance 0-100>,
            "reasoning": "<brief analysis citing specific data if available>"
        }}
    ],
    "risk_factors": [
        "<specific concern with data support>",
        "<another concern>",
        "<another concern>"
    ],
    "positive_factors": [
        "<strength with reasoning>",
        "<another strength>"
    ],
    "analysis": "<2-3 sentences overall assessment>",
    "bet_details": "<concise summary: stakes, odds, potential payout>",
    "sharp_analysis": "<based on line movement, book count, and market data - is this sharp or public money>"
}}

IMPORTANT ANALYSIS GUIDELINES:
- Use the EXTRACTED DATA above for accurate bet details
- If real-time market data is provided, USE IT to adjust probabilities  
- Compare user's odds to current market odds - identify value or no-value
- Consider team form, injuries, and weather if provided
- Single bets: 30-70% probability range (be critical)
- 2-leg parlays: 20-50% range  
- 3-leg parlays: 10-35% range
- 4+ leg parlays: 5-20% range
- Confidence score: 8-10 = market data supports analysis, 5-7 = moderate data, 1-4 = limited data
- Always include odds in American format (e.g., -140, +200)
- Be realistic and critical - most bets have negative EV"""
        
        analysis_msg = UserMessage(text=analysis_prompt)
        
        # Get AI response
        response = await chat.send_message(analysis_msg)
        
        # Parse response and calculate advanced analytics
        import json
        import re
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[^{}]*"win_probability"[^{}]*"analysis"[^{}]*\}', response, re.DOTALL)
            if not json_match:
                json_match = re.search(r'\{(?:[^{}]|{[^{}]*})*\}', response, re.DOTALL)
            
            if json_match:
                result = json.loads(json_match.group())
                win_probability = float(result.get('win_probability', 50.0))
                confidence_score = int(result.get('confidence_score', 5))
                analysis_text = result.get('analysis', 'Analysis completed')
                bet_details = result.get('bet_details', None)
                individual_bets = result.get('individual_bets', [])
                risk_factors = result.get('risk_factors', [])
                positive_factors = result.get('positive_factors', [])
                total_odds = result.get('total_odds', None)
                
                # Calculate advanced analytics
                decimal_odds = 2.0  # Default
                if total_odds:
                    decimal_odds = american_to_decimal(total_odds)
                elif individual_bets and len(individual_bets) > 0:
                    # Calculate parlay odds from individual bets
                    combined_decimal = 1.0
                    for bet in individual_bets:
                        if bet.get('odds'):
                            combined_decimal *= american_to_decimal(bet['odds'])
                    decimal_odds = combined_decimal
                
                # Calculate Expected Value
                expected_value = calculate_expected_value(win_probability, decimal_odds)
                
                # Calculate Kelly Criterion
                kelly_percentage = calculate_kelly_criterion(win_probability, decimal_odds)
                
                # Calculate true odds based on AI probability
                true_odds = probability_to_american_odds(win_probability)
                
                # Get recommendation
                recommendation = get_bet_recommendation(expected_value, kelly_percentage, confidence_score)
                
                # Calculate ROI
                estimated_roi = expected_value
                
                # Parlay vs Straight comparison (if multiple bets)
                parlay_vs_straight = None
                if individual_bets and len(individual_bets) > 1:
                    # Calculate if betting each leg straight
                    straight_ev_total = 0
                    parlay_combined_prob = win_probability
                    
                    for bet in individual_bets:
                        if bet.get('individual_probability') and bet.get('odds'):
                            bet_decimal_odds = american_to_decimal(bet['odds'])
                            bet_ev = calculate_expected_value(bet['individual_probability'], bet_decimal_odds, 100)
                            straight_ev_total += bet_ev
                    
                    parlay_vs_straight = {
                        "parlay_ev": round(expected_value, 2),
                        "straight_bets_ev": round(straight_ev_total, 2),
                        "recommendation": "Bet individually" if straight_ev_total > expected_value else "Parlay is better",
                        "difference": round(abs(straight_ev_total - expected_value), 2)
                    }
                
            else:
                # Fallback parsing
                prob_match = re.search(r'(\d+(?:\.\d+)?)\s*%', response)
                win_probability = float(prob_match.group(1)) if prob_match else 50.0
                confidence_score = 5
                analysis_text = response.replace('```json', '').replace('```', '').strip()
                bet_details = None
                individual_bets = []
                risk_factors = []
                positive_factors = []
                expected_value = 0.0
                kelly_percentage = 0.0
                true_odds = probability_to_american_odds(win_probability)
                recommendation = "REVIEW"
                estimated_roi = 0.0
                parlay_vs_straight = None
                
        except Exception as e:
            logging.error(f"Error parsing AI response: {str(e)}")
            win_probability = 50.0
            confidence_score = 5
            analysis_text = response.replace('```json', '').replace('```', '').strip()
            bet_details = None
            individual_bets = []
            risk_factors = []
            positive_factors = []
            expected_value = 0.0
            kelly_percentage = 0.0
            true_odds = "EVEN"
            recommendation = "REVIEW"
            estimated_roi = 0.0
            parlay_vs_straight = None
        
        # Save analysis
        bet_analysis = BetAnalysis(
            user_id=current_user['user_id'],
            image_data=image_base64,
            win_probability=win_probability,
            analysis_text=analysis_text,
            bet_details=bet_details,
            individual_bets=individual_bets,
            risk_factors=risk_factors,
            positive_factors=positive_factors,
            expected_value=expected_value,
            kelly_percentage=kelly_percentage,
            true_odds=true_odds,
            recommendation=recommendation,
            confidence_score=confidence_score,
            parlay_vs_straight=parlay_vs_straight,
            estimated_roi=estimated_roi
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
            expected_value=expected_value,
            kelly_percentage=kelly_percentage,
            true_odds=true_odds,
            recommendation=recommendation,
            confidence_score=confidence_score,
            parlay_vs_straight=parlay_vs_straight,
            estimated_roi=estimated_roi,
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
            expected_value=a.get('expected_value'),
            kelly_percentage=a.get('kelly_percentage'),
            recommendation=a.get('recommendation'),
            confidence_score=a.get('confidence_score'),
            image_data=a['image_data'],
            created_at=a['created_at']
        )
        for a in analyses
    ]


class MarkOutcomeRequest(BaseModel):
    outcome: str  # "won", "lost", "push"
    stake_amount: Optional[float] = None
    payout_amount: Optional[float] = None


@api_router.post("/analysis/{analysis_id}/outcome")
async def mark_bet_outcome(
    analysis_id: str,
    outcome_data: MarkOutcomeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mark a bet as won/lost/push"""
    # Verify ownership
    bet = await db.bet_analyses.find_one(
        {"id": analysis_id, "user_id": current_user['user_id']},
        {"_id": 0}
    )
    
    if not bet:
        raise HTTPException(status_code=404, detail="Bet analysis not found")
    
    # Update outcome
    update_data = {
        "actual_outcome": outcome_data.outcome,
        "outcome_marked_at": datetime.now(timezone.utc).isoformat()
    }
    
    if outcome_data.stake_amount is not None:
        update_data["stake_amount"] = outcome_data.stake_amount
    if outcome_data.payout_amount is not None:
        update_data["payout_amount"] = outcome_data.payout_amount
    
    await db.bet_analyses.update_one(
        {"id": analysis_id},
        {"$set": update_data}
    )
    
    return {"message": "Outcome marked successfully", "outcome": outcome_data.outcome}


@api_router.get("/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user's betting statistics and AI accuracy"""
    # Get all completed bets (with outcomes)
    completed_bets = await db.bet_analyses.find(
        {
            "user_id": current_user['user_id'],
            "actual_outcome": {"$in": ["won", "lost", "push"]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    if not completed_bets:
        return {
            "total_analyzed": 0,
            "total_tracked": 0,
            "accuracy_rate": 0,
            "total_profit": 0,
            "roi": 0,
            "bets_won": 0,
            "bets_lost": 0,
            "bets_push": 0,
            "followed_recommendations": 0
        }
    
    # Calculate stats
    total_bets = len(completed_bets)
    bets_won = sum(1 for b in completed_bets if b.get('actual_outcome') == 'won')
    bets_lost = sum(1 for b in completed_bets if b.get('actual_outcome') == 'lost')
    bets_push = sum(1 for b in completed_bets if b.get('actual_outcome') == 'push')
    
    # Calculate AI accuracy (predicted > 50% should win)
    correct_predictions = 0
    for bet in completed_bets:
        if bet.get('actual_outcome') == 'push':
            continue
        predicted_win = bet.get('win_probability', 0) > 50
        actually_won = bet.get('actual_outcome') == 'won'
        if predicted_win == actually_won:
            correct_predictions += 1
    
    accuracy_rate = (correct_predictions / (total_bets - bets_push) * 100) if (total_bets - bets_push) > 0 else 0
    
    # Calculate profit/loss
    total_stake = sum(b.get('stake_amount', 0) for b in completed_bets if b.get('stake_amount'))
    total_payout = sum(b.get('payout_amount', 0) for b in completed_bets if b.get('payout_amount'))
    total_profit = total_payout - total_stake
    roi = (total_profit / total_stake * 100) if total_stake > 0 else 0
    
    # Check how many followed recommendations
    followed_recs = sum(
        1 for b in completed_bets 
        if b.get('recommendation') in ['BET', 'STRONG BET'] and b.get('actual_outcome') == 'won'
    )
    
    # Get total analyzed (including pending)
    total_analyzed = await db.bet_analyses.count_documents({"user_id": current_user['user_id']})
    
    return {
        "total_analyzed": total_analyzed,
        "total_tracked": total_bets,
        "accuracy_rate": round(accuracy_rate, 1),
        "total_profit": round(total_profit, 2),
        "roi": round(roi, 1),
        "bets_won": bets_won,
        "bets_lost": bets_lost,
        "bets_push": bets_push,
        "followed_recommendations": followed_recs,
        "win_rate": round((bets_won / (bets_won + bets_lost) * 100) if (bets_won + bets_lost) > 0 else 0, 1)
    }


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
