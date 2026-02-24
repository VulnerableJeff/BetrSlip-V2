"""Support message routes - users can contact admin"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from .deps import db, get_current_user, get_admin_user

router = APIRouter()


class SupportMessageCreate(BaseModel):
    subject: str
    message: str


class SupportMessageReply(BaseModel):
    reply: str


@router.post("/support/message")
async def create_support_message(
    data: SupportMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a support message to admin"""
    if not data.subject.strip() or not data.message.strip():
        raise HTTPException(status_code=400, detail="Subject and message are required")

    msg = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "email": current_user.get("email", ""),
        "subject": data.subject.strip()[:200],
        "message": data.message.strip()[:2000],
        "status": "unread",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.support_messages.insert_one(msg)
    return {"message": "Support message sent! We'll get back to you soon.", "id": msg["id"]}


@router.get("/support/messages")
async def get_my_support_messages(current_user: dict = Depends(get_current_user)):
    """Get current user's support messages"""
    messages = await db.support_messages.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"messages": messages}


@router.get("/admin/support-messages")
async def admin_get_support_messages(
    status: Optional[str] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Get all support messages (admin only)"""
    query = {}
    if status and status != "all":
        query["status"] = status

    messages = await db.support_messages.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    unread_count = await db.support_messages.count_documents({"status": "unread"})
    return {"messages": messages, "total": len(messages), "unread_count": unread_count}


@router.post("/admin/support-messages/{message_id}/read")
async def admin_mark_read(message_id: str, admin_user: dict = Depends(get_admin_user)):
    """Mark a support message as read"""
    result = await db.support_messages.update_one(
        {"id": message_id},
        {"$set": {"status": "read", "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Marked as read"}


@router.post("/admin/support-messages/{message_id}/reply")
async def admin_reply_message(
    message_id: str,
    data: SupportMessageReply,
    admin_user: dict = Depends(get_admin_user)
):
    """Reply to a support message (stores reply, marks as replied)"""
    result = await db.support_messages.update_one(
        {"id": message_id},
        {"$set": {
            "status": "replied",
            "admin_reply": data.reply.strip()[:2000],
            "replied_at": datetime.now(timezone.utc).isoformat(),
            "replied_by": admin_user.get("email", "admin")
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Reply sent"}


@router.delete("/admin/support-messages/{message_id}")
async def admin_delete_message(message_id: str, admin_user: dict = Depends(get_admin_user)):
    """Delete a support message"""
    result = await db.support_messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}
