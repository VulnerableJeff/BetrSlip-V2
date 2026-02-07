"""
Bankroll routes - Track user's betting bankroll, deposits, withdrawals, and performance
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import logging

from .deps import db, get_current_user

router = APIRouter(prefix="/bankroll", tags=["Bankroll"])
logger = logging.getLogger(__name__)


class TransactionRequest(BaseModel):
    type: str  # 'deposit', 'withdraw', 'win', 'loss'
    amount: float
    description: Optional[str] = None


class SetBankrollRequest(BaseModel):
    starting_balance: float


@router.get("")
async def get_bankroll(current_user: dict = Depends(get_current_user)):
    """Get user's current bankroll and stats"""
    user_id = current_user['user_id']
    
    # Get or create bankroll record
    bankroll = await db.bankrolls.find_one({"user_id": user_id}, {"_id": 0})
    
    if not bankroll:
        # Initialize bankroll for new user
        bankroll = {
            "user_id": user_id,
            "current_balance": 0,
            "starting_balance": 0,
            "total_deposited": 0,
            "total_withdrawn": 0,
            "total_wagered": 0,
            "total_won": 0,
            "total_lost": 0,
            "total_profit": 0,
            "roi": 0,
            "win_rate": 0,
            "bets_won": 0,
            "bets_lost": 0,
            "transactions": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.bankrolls.insert_one(bankroll)
        bankroll.pop('_id', None)
    
    # Calculate derived stats
    total_bets = bankroll.get('bets_won', 0) + bankroll.get('bets_lost', 0)
    win_rate = (bankroll.get('bets_won', 0) / total_bets * 100) if total_bets > 0 else 0
    
    total_deposited = bankroll.get('total_deposited', 0)
    roi = ((bankroll.get('current_balance', 0) - total_deposited) / total_deposited * 100) if total_deposited > 0 else 0
    
    return {
        "current_balance": bankroll.get('current_balance', 0),
        "starting_balance": bankroll.get('starting_balance', 0),
        "total_deposited": total_deposited,
        "total_withdrawn": bankroll.get('total_withdrawn', 0),
        "total_wagered": bankroll.get('total_wagered', 0),
        "total_profit": bankroll.get('current_balance', 0) - total_deposited,
        "roi": round(roi, 1),
        "win_rate": round(win_rate, 1),
        "bets_won": bankroll.get('bets_won', 0),
        "bets_lost": bankroll.get('bets_lost', 0),
        "recent_transactions": bankroll.get('transactions', [])[-10:][::-1]  # Last 10, reversed
    }


@router.post("/transaction")
async def add_transaction(
    request: TransactionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a bankroll transaction (deposit, withdraw, win, loss)"""
    user_id = current_user['user_id']
    
    if request.type not in ['deposit', 'withdraw', 'win', 'loss']:
        raise HTTPException(status_code=400, detail="Invalid transaction type")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Get current bankroll
    bankroll = await db.bankrolls.find_one({"user_id": user_id})
    
    if not bankroll:
        # Create new bankroll
        bankroll = {
            "user_id": user_id,
            "current_balance": 0,
            "total_deposited": 0,
            "total_withdrawn": 0,
            "total_wagered": 0,
            "bets_won": 0,
            "bets_lost": 0,
            "transactions": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Create transaction record
    transaction = {
        "type": request.type,
        "amount": request.amount if request.type in ['deposit', 'win'] else -request.amount,
        "description": request.description,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update bankroll based on transaction type
    update = {"$push": {"transactions": transaction}}
    
    if request.type == 'deposit':
        update["$inc"] = {
            "current_balance": request.amount,
            "total_deposited": request.amount
        }
    elif request.type == 'withdraw':
        if bankroll.get('current_balance', 0) < request.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        update["$inc"] = {
            "current_balance": -request.amount,
            "total_withdrawn": request.amount
        }
    elif request.type == 'win':
        update["$inc"] = {
            "current_balance": request.amount,
            "bets_won": 1
        }
    elif request.type == 'loss':
        update["$inc"] = {
            "current_balance": -request.amount,
            "bets_lost": 1,
            "total_wagered": request.amount
        }
    
    # Upsert bankroll
    await db.bankrolls.update_one(
        {"user_id": user_id},
        update,
        upsert=True
    )
    
    return {"success": True, "message": f"Transaction recorded: {request.type} ${request.amount}"}


@router.post("/record-bet")
async def record_bet_result(
    won: bool,
    stake: float,
    payout: float,
    current_user: dict = Depends(get_current_user)
):
    """Record a bet result (linked from analysis)"""
    user_id = current_user['user_id']
    
    if won:
        profit = payout - stake
        transaction_type = 'win'
        amount = profit
    else:
        profit = -stake
        transaction_type = 'loss'
        amount = stake
    
    transaction = {
        "type": transaction_type,
        "amount": profit,
        "stake": stake,
        "payout": payout if won else 0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    update = {
        "$push": {"transactions": transaction},
        "$inc": {
            "current_balance": profit,
            "total_wagered": stake,
            f"bets_{'won' if won else 'lost'}": 1
        }
    }
    
    await db.bankrolls.update_one(
        {"user_id": user_id},
        update,
        upsert=True
    )
    
    return {"success": True, "profit": profit}


@router.delete("/reset")
async def reset_bankroll(current_user: dict = Depends(get_current_user)):
    """Reset bankroll to zero (start fresh)"""
    user_id = current_user['user_id']
    
    await db.bankrolls.delete_one({"user_id": user_id})
    
    return {"success": True, "message": "Bankroll reset"}
