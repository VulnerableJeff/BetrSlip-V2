"""
Email Service for BetrSlip
Handles sending daily pick emails to Pro users via Brevo API
"""

import os
import logging
import httpx
from typing import Optional, List, Dict
from datetime import datetime
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

def _get_email_config():
    """Get email configuration from environment"""
    return {
        "api_key": os.environ.get("EMAIL_PASSWORD", ""),  # Using PASSWORD field for API key
        "from_email": os.environ.get("EMAIL_FROM_ADDRESS", "labellefences@gmail.com"),
        "from_name": "BetrSlip",
    }


class EmailService:
    """Service for sending emails via Brevo API"""
    
    def __init__(self):
        config = _get_email_config()
        self.api_key = config["api_key"]
        self.from_email = config["from_email"]
        self.from_name = config["from_name"]
    
    def is_configured(self) -> bool:
        """Check if email is properly configured"""
        return bool(self.api_key)
    
    def _create_simple_pick_html(self, pick: Dict) -> str:
        """Create simple email with just Bet of the Day"""
        today_date = datetime.now(ZoneInfo("America/New_York")).strftime("%B %d, %Y")
        title = pick.get("title", "Todays Pick")
        description = pick.get("description", "")
        win_prob = pick.get("win_probability", 65)
        odds = pick.get("odds", "-110")
        confidence = pick.get("confidence", 7)
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #8b5cf6; margin: 0; font-size: 28px;">BetrSlip</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Your Daily Pick - {today_date}</p>
        </div>
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #4c1d95;">
            <div style="margin-bottom: 16px;">
                <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">BET OF THE DAY</span>
            </div>
            <h2 style="color: white; margin: 0 0 8px 0; font-size: 24px;">{title}</h2>
            <p style="color: #a5b4fc; margin: 0 0 16px 0; font-size: 14px;">{description}</p>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="background: rgba(16, 185, 129, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #10b981; font-size: 24px; font-weight: bold;">{win_prob}%</span>
                    <span style="color: #6ee7b7; font-size: 12px; display: block;">Win Probability</span>
                </div>
                <div style="background: rgba(139, 92, 246, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #a78bfa; font-size: 24px; font-weight: bold;">{odds}</span>
                    <span style="color: #c4b5fd; font-size: 12px; display: block;">Odds</span>
                </div>
                <div style="background: rgba(251, 191, 36, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #fbbf24; font-size: 24px; font-weight: bold;">{confidence}/10</span>
                    <span style="color: #fcd34d; font-size: 12px; display: block;">Confidence</span>
                </div>
            </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://betrslip.com/dashboard" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View Full Analysis</a>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                You are receiving this because you are a BetrSlip Pro member.
            </p>
        </div>
    </div>
</body>
</html>"""

    def _create_full_pick_html(self, pick: Dict, top_picks: List[Dict]) -> str:
        """Create full email with Bet of the Day + Top 3 Picks"""
        today_date = datetime.now(ZoneInfo("America/New_York")).strftime("%B %d, %Y")
        title = pick.get("title", "Todays Pick")
        description = pick.get("description", "")
        win_prob = pick.get("win_probability", 65)
        odds = pick.get("odds", "-110")
        confidence = pick.get("confidence", 7)
        
        top_picks_html = ""
        for tp in top_picks[:3]:
            border_color = "#10b981" if tp.get("win_probability", 0) >= 60 else "#f59e0b"
            tp_sport = tp.get("sport", "NBA")
            tp_title = tp.get("title", "")[:50]
            tp_win_prob = tp.get("win_probability", 50)
            tp_odds = tp.get("odds", "-110")
            top_picks_html += f"""<div style="background: #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 3px solid {border_color};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="color: #94a3b8; font-size: 11px;">{tp_sport}</span>
                        <p style="color: white; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">{tp_title}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #10b981; font-weight: bold;">{tp_win_prob}%</span>
                        <span style="color: #64748b; font-size: 12px; display: block;">{tp_odds}</span>
                    </div>
                </div>
            </div>"""
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #8b5cf6; margin: 0; font-size: 28px;">BetrSlip</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Your Daily Picks - {today_date}</p>
        </div>
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #4c1d95;">
            <div style="margin-bottom: 16px;">
                <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">BET OF THE DAY</span>
            </div>
            <h2 style="color: white; margin: 0 0 8px 0; font-size: 24px;">{title}</h2>
            <p style="color: #a5b4fc; margin: 0 0 16px 0; font-size: 14px;">{description}</p>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="background: rgba(16, 185, 129, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #10b981; font-size: 24px; font-weight: bold;">{win_prob}%</span>
                    <span style="color: #6ee7b7; font-size: 12px; display: block;">Win Prob</span>
                </div>
                <div style="background: rgba(139, 92, 246, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #a78bfa; font-size: 24px; font-weight: bold;">{odds}</span>
                    <span style="color: #c4b5fd; font-size: 12px; display: block;">Odds</span>
                </div>
                <div style="background: rgba(251, 191, 36, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #fbbf24; font-size: 24px; font-weight: bold;">{confidence}/10</span>
                    <span style="color: #fcd34d; font-size: 12px; display: block;">Confidence</span>
                </div>
            </div>
        </div>
        <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #1e293b;">
            <h3 style="color: white; margin: 0 0 16px 0; font-size: 16px;">Todays Top Picks</h3>
            {top_picks_html}
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://betrslip.com/dashboard" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View All Picks</a>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                You are receiving this because you are a BetrSlip Pro member.
            </p>
        </div>
    </div>
</body>
</html>"""

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email via Brevo API"""
        if not self.is_configured():
            logger.error("Email not configured - missing API key")
            return False
        
        try:
            payload = {
                "sender": {"name": self.from_name, "email": self.from_email},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content
            }
            
            headers = {
                "accept": "application/json",
                "api-key": self.api_key,
                "content-type": "application/json"
            }
            
            with httpx.Client() as client:
                response = client.post(BREVO_API_URL, json=payload, headers=headers, timeout=30)
                
                if response.status_code == 201:
                    logger.info(f"Email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(f"Brevo API error: {response.status_code} - {response.text}")
                    return False
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_daily_pick_email(
        self, 
        to_email: str, 
        pick: Dict, 
        top_picks: List[Dict] = None,
        email_type: str = "full"
    ) -> bool:
        """Send daily pick email to user"""
        pick_title = pick.get("title", "Hot Pick")[:30]
        subject = f"BetrSlip: Todays Bet of the Day - {pick_title}"
        
        if email_type == "simple" or not top_picks:
            html_content = self._create_simple_pick_html(pick)
        else:
            html_content = self._create_full_pick_html(pick, top_picks)
        
        return self.send_email(to_email, subject, html_content)


# Singleton instance
_email_service = None

def get_email_service() -> EmailService:
    """Get or create email service singleton"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
