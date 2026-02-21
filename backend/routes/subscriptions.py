"""
Subscription and payment routes - Stripe, PayPal, CashApp
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import uuid
import logging

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

from .deps import db, get_current_user, get_admin_user
from .referrals import process_referral_reward

router = APIRouter(prefix="/subscription", tags=["Subscriptions"])
logger = logging.getLogger(__name__)


def _get_stripe_key():
    """Read STRIPE_API_KEY at runtime, not import time."""
    return os.environ.get('STRIPE_API_KEY', '')
SUBSCRIPTION_PRICE = 5.00  # $5.00 in USD


class CreateCheckoutRequest(BaseModel):
    origin_url: str

class PayPalConfirmRequest(BaseModel):
    order_id: str
    payer_email: Optional[str] = None
    amount: Optional[str] = None


@router.post("/create-checkout")
async def create_subscription_checkout(
    request: Request,
    checkout_request: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session for subscription"""
    try:
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=_get_stripe_key(), webhook_url=webhook_url)
        
        success_url = f"{checkout_request.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{checkout_request.origin_url}/subscription/cancel"
        
        checkout_req = CheckoutSessionRequest(
            amount=SUBSCRIPTION_PRICE,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user['user_id'],
                "email": current_user['email'],
                "type": "subscription"
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": current_user['user_id'],
            "email": current_user['email'],
            "amount": SUBSCRIPTION_PRICE,
            "currency": "usd",
            "payment_method": "stripe",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating checkout: {str(e)}")


@router.get("/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Check Stripe checkout session status"""
    try:
        host_url = os.environ.get('BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', ''))
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=_get_stripe_key(), webhook_url=webhook_url)
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        if status.payment_status == 'paid':
            existing = await db.payment_transactions.find_one({
                "session_id": session_id,
                "payment_status": "paid"
            })
            
            if not existing:
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "paid_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await db.subscriptions.update_one(
                    {"user_id": current_user['user_id']},
                    {"$set": {
                        "user_id": current_user['user_id'],
                        "email": current_user['email'],
                        "subscription_status": "active",
                        "payment_method": "stripe",
                        "stripe_session_id": session_id,
                        "subscription_start": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
                
                # Process referral reward if applicable
                try:
                    await process_referral_reward(current_user['user_id'])
                except Exception as ref_err:
                    logger.warning(f"Referral reward processing error: {ref_err}")
        
        return {
            "session_id": session_id,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total
        }
        
    except Exception as e:
        logger.error(f"Error checking status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/paypal-confirm")
async def confirm_paypal_payment(
    request: PayPalConfirmRequest,
    current_user: dict = Depends(get_current_user)
):
    """Confirm PayPal payment and activate subscription"""
    try:
        await db.payment_transactions.insert_one({
            "type": "paypal",
            "order_id": request.order_id,
            "user_id": current_user['user_id'],
            "email": current_user['email'],
            "payer_email": request.payer_email,
            "amount": request.amount or "5.00",
            "currency": "usd",
            "payment_status": "paid",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        await db.subscriptions.update_one(
            {"user_id": current_user['user_id']},
            {"$set": {
                "user_id": current_user['user_id'],
                "email": current_user['email'],
                "subscription_status": "active",
                "payment_method": "paypal",
                "paypal_order_id": request.order_id,
                "subscription_start": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Process referral reward if applicable
        try:
            await process_referral_reward(current_user['user_id'])
        except Exception as ref_err:
            logger.warning(f"Referral reward processing error: {ref_err}")
        
        return {"message": "PayPal payment confirmed, subscription activated", "success": True}
        
    except Exception as e:
        logger.error(f"PayPal confirmation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error confirming payment: {str(e)}")


@router.post("/cashapp-request")
async def request_cashapp_payment(current_user: dict = Depends(get_current_user)):
    """Submit a CashApp payment request for admin approval"""
    try:
        existing = await db.cashapp_requests.find_one({
            "user_id": current_user['user_id'],
            "status": "pending"
        })
        
        if existing:
            return {"message": "You already have a pending CashApp request", "success": True}
        
        await db.cashapp_requests.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user['user_id'],
            "email": current_user['email'],
            "amount": 5.00,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "CashApp request submitted. Send $5 to $BetrSlip and we'll activate within 24 hours.", "success": True}
        
    except Exception as e:
        logger.error(f"CashApp request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error submitting request: {str(e)}")
