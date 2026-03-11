"""
Email Service for BetrSlip
Handles sending daily pick emails to Pro users via Gmail SMTP
"""

import os
import ssl
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

# Email configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def _get_email_config():
    """Get email configuration from environment"""
    return {
        "email": os.environ.get("EMAIL_ADDRESS", ""),
        "password": os.environ.get("EMAIL_PASSWORD", ""),
    }


class EmailService:
    """Service for sending emails via Gmail SMTP"""
    
    def __init__(self):
        config = _get_email_config()
        self.email = config["email"]
        self.password = config["password"]
        self.from_name = "BetrSlip"
    
    def is_configured(self) -> bool:
        """Check if email is properly configured"""
        return bool(self.email and self.password)
    
    def _create_simple_pick_html(self, pick: Dict) -> str:
        """Create simple email with just Bet of the Day"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #8b5cf6; margin: 0; font-size: 28px;">BetrSlip</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Your Daily Pick - {datetime.now(ZoneInfo('America/New_York')).strftime('%B %d, %Y')}</p>
        </div>
        
        <!-- Bet of the Day Card -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #4c1d95;">
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">BET OF THE DAY</span>
            </div>
            
            <h2 style="color: white; margin: 0 0 8px 0; font-size: 24px;">{pick.get('title', 'Today\'s Pick')}</h2>
            <p style="color: #a5b4fc; margin: 0 0 16px 0; font-size: 14px;">{pick.get('description', '')}</p>
            
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="background: rgba(16, 185, 129, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #10b981; font-size: 24px; font-weight: bold;">{pick.get('win_probability', 65)}%</span>
                    <span style="color: #6ee7b7; font-size: 12px; display: block;">Win Probability</span>
                </div>
                <div style="background: rgba(139, 92, 246, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #a78bfa; font-size: 24px; font-weight: bold;">{pick.get('odds', '-110')}</span>
                    <span style="color: #c4b5fd; font-size: 12px; display: block;">Odds</span>
                </div>
                <div style="background: rgba(251, 191, 36, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #fbbf24; font-size: 24px; font-weight: bold;">{pick.get('confidence', 7)}/10</span>
                    <span style="color: #fcd34d; font-size: 12px; display: block;">Confidence</span>
                </div>
            </div>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://betrslip.com/dashboard" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View Full Analysis</a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                You're receiving this because you're a BetrSlip Pro member.<br>
                <a href="https://betrslip.com/unsubscribe?email={{{{email}}}}" style="color: #8b5cf6;">Unsubscribe</a> | <a href="https://betrslip.com/settings" style="color: #8b5cf6;">Email Settings</a>
            </p>
        </div>
    </div>
</body>
</html>
"""

    def _create_full_pick_html(self, pick: Dict, top_picks: List[Dict]) -> str:
        """Create full email with Bet of the Day + Top 3 Picks"""
        top_picks_html = ""
        for i, tp in enumerate(top_picks[:3], 1):
            top_picks_html += f"""
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 8px; border-left: 3px solid {'#10b981' if tp.get('win_probability', 0) >= 60 else '#f59e0b'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="color: #94a3b8; font-size: 11px;">{tp.get('sport', 'NBA')}</span>
                        <p style="color: white; margin: 4px 0 0 0; font-size: 14px; font-weight: 600;">{tp.get('title', '')[:50]}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #10b981; font-weight: bold;">{tp.get('win_probability', 50)}%</span>
                        <span style="color: #64748b; font-size: 12px; display: block;">{tp.get('odds', '-110')}</span>
                    </div>
                </div>
            </div>
            """
        
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #8b5cf6; margin: 0; font-size: 28px;">BetrSlip</h1>
            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Your Daily Picks - {datetime.now(ZoneInfo('America/New_York')).strftime('%B %d, %Y')}</p>
        </div>
        
        <!-- Bet of the Day Card -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px; padding: 24px; margin: 20px 0; border: 1px solid #4c1d95;">
            <div style="margin-bottom: 16px;">
                <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">BET OF THE DAY</span>
            </div>
            
            <h2 style="color: white; margin: 0 0 8px 0; font-size: 24px;">{pick.get('title', 'Today\'s Pick')}</h2>
            <p style="color: #a5b4fc; margin: 0 0 16px 0; font-size: 14px;">{pick.get('description', '')}</p>
            
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="background: rgba(16, 185, 129, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #10b981; font-size: 24px; font-weight: bold;">{pick.get('win_probability', 65)}%</span>
                    <span style="color: #6ee7b7; font-size: 12px; display: block;">Win Prob</span>
                </div>
                <div style="background: rgba(139, 92, 246, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #a78bfa; font-size: 24px; font-weight: bold;">{pick.get('odds', '-110')}</span>
                    <span style="color: #c4b5fd; font-size: 12px; display: block;">Odds</span>
                </div>
                <div style="background: rgba(251, 191, 36, 0.2); padding: 8px 16px; border-radius: 8px;">
                    <span style="color: #fbbf24; font-size: 24px; font-weight: bold;">{pick.get('confidence', 7)}/10</span>
                    <span style="color: #fcd34d; font-size: 12px; display: block;">Confidence</span>
                </div>
            </div>
        </div>
        
        <!-- Today's Top Picks -->
        <div style="background: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #1e293b;">
            <h3 style="color: white; margin: 0 0 16px 0; font-size: 16px;">
                <span style="margin-right: 8px;">🔥</span>Today's Top Picks
            </h3>
            {top_picks_html}
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://betrslip.com/dashboard" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View All Picks</a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                You're receiving this because you're a BetrSlip Pro member.<br>
                <a href="https://betrslip.com/unsubscribe?email={{{{email}}}}" style="color: #8b5cf6;">Unsubscribe</a> | <a href="https://betrslip.com/settings" style="color: #8b5cf6;">Email Settings</a>
            </p>
        </div>
    </div>
</body>
</html>
"""

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email via Gmail SMTP"""
        if not self.is_configured():
            logger.error("Email not configured - missing EMAIL_ADDRESS or EMAIL_PASSWORD")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.email}>"
            msg['To'] = to_email
            
            # Replace email placeholder in unsubscribe link
            html_content = html_content.replace("{{email}}", to_email)
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect and send
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(self.email, self.password)
                server.sendmail(self.email, to_email, msg.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed: {e}")
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
        subject = f"🎯 BetrSlip: Today's Bet of the Day - {pick.get('title', 'Hot Pick')[:30]}"
        
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
