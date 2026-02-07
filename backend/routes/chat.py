"""
AI Chat Assistant Routes
- Conversational AI for betting questions
- Uses GPT-4o via Emergent LLM Key
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import os
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage
from .deps import db, get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

SYSTEM_PROMPT = """You are BetrSlip AI, an expert sports betting analyst and assistant. You help users with:
- Game analysis and predictions
- Understanding odds, spreads, totals, and props
- Kelly Criterion and bankroll management advice
- Explaining betting terminology
- Evaluating parlay strategies
- Providing insights on line movements

Rules:
- Be concise and direct. Use bullet points when listing multiple items.
- Always mention that sports betting involves risk and past results don't guarantee future outcomes.
- Never guarantee wins. Use probability language ("likely", "edge", "value").
- If asked about a specific game, provide analysis based on general knowledge.
- Format responses with markdown for readability.
- Keep responses under 300 words unless the user asks for detailed analysis."""


class ChatRequest(BaseModel):
    message: str
    session_id: str = None

    class Config:
        json_schema_extra = {"example": {"message": "What is Kelly Criterion?"}}

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        return v


class ChatResponse(BaseModel):
    response: str
    session_id: str


@router.post("/message")
async def send_chat_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to the AI chat assistant"""
    user_id = current_user['user_id']
    session_id = request.session_id or str(uuid.uuid4())

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"chat_{user_id}_{session_id}",
            system_message=SYSTEM_PROMPT
        )

        msg = UserMessage(text=request.message)
        response = await chat.send_message(msg)

        # Save to chat history
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "role": "user",
            "content": request.message,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.chat_messages.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "role": "assistant",
            "content": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return {"response": response, "session_id": session_id}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get AI response")


@router.get("/history")
async def get_chat_history(
    session_id: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history for a session"""
    user_id = current_user['user_id']
    query = {"user_id": user_id}
    if session_id:
        query["session_id"] = session_id

    messages = await db.chat_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    messages.reverse()
    return {"messages": messages}


@router.get("/sessions")
async def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    """Get list of chat sessions"""
    user_id = current_user['user_id']

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$last": "$content"},
            "last_at": {"$last": "$created_at"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": 20}
    ]

    sessions = await db.chat_messages.aggregate(pipeline).to_list(20)
    return {
        "sessions": [
            {
                "session_id": s["_id"],
                "preview": (s["last_message"] or "")[:80],
                "last_at": s["last_at"],
                "message_count": s["count"]
            }
            for s in sessions
        ]
    }
