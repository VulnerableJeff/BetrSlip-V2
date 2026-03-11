# BetrSlip - Product Requirements Document

## Original Problem Statement
Sports betting analytics platform ("BetrSlip") — React + FastAPI + MongoDB app with AI-powered bet slip analysis, live odds, and value betting tools.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **External APIs**: The Odds API (20K tier), OpenAI, Stripe
- **Auth**: JWT-based with admin auto-creation

## What's Been Implemented

### Core Features
- Bet slip screenshot upload + AI analysis with leg grades, EV, Kelly
- Bet of the Day hero spotlight with confidence meter
- AI Parlay Picks, Best Value Bets (EV Scanner), Today's Top Picks
- Share/Copy functionality

### New Growth Features (Mar 8, 2026)
- **Public Results Page** (/results) — Transparent W/L tracking, no login needed, with stat cards, record bar, recent picks, CTAs
- **Win Streak Banner** — Auto-displays on dashboard when AI hits 3+ win streak (with hot streak animation at 5+)
- **Free Trial Extension** — "Share BetrSlip to unlock 3 more free analyses" (one-time per user)
- **View All Results** button on landing page linking to /results
- **Post-analysis upsell** — After each analysis, free users see remaining count + Go Pro + Share extension

### Bug Fixes (Mar 5, 2026)
- Admin users limit increased from 100 to 500
- Reset Usage admin endpoint added
- Signup user_usage uses upsert to prevent orphaned records
- All game times in US Eastern (EST/EDT auto-handled via ZoneInfo)

### AI Accuracy Improvements (Mar 5, 2026)
- Enhanced bet slip analysis prompt with CLV, realistic probability caps
- Improved daily picks with 10-point intelligence ranking, min 3% edge requirement

### Landing Page (Feb 26, 2026)
- Two CTA buttons above fold, winning demo card (72.4% STRONG BET)
- Verified win rate in top bar, Pro members count

### Auth Page (Feb 26, 2026)
- Two-column layout with social proof + features + live stats

### Support System (Feb 24, 2026)
- Floating support button, in-app contact form, admin reply system

### Admin Dashboard (Feb 24, 2026)
- Gradient stat cards, Analytics with charts, enriched Top Bets
- Support Messages tab, Reset Usage per user

### Payments
- Stripe ($5/mo subscription), CashApp QR ($BetrSlip), PayPal removed

### Monthly Usage Limit & Credit System (Mar 10, 2026)
- **Pro users capped at 100 analyses/month** — Dashboard shows "X/100 analyses this month" with progress bar
- **Buy Credits feature** — "+25 Credits — $3" button appears when ≤20 remaining OR when limit hit (pulsing red button)
- **Bonus credits tracking** — Purchased credits stored in `bonus_credits` field, persist until used
- **Admin "Add Credits" button** — Quick +25 button visible directly in user row (no expand needed)
- **Monthly reset** — `monthly_used` and `current_month` reset automatically each calendar month

### System Announcements (Mar 10, 2026)
- **Admin can send announcements** to all users, Pro only, or Free only
- **Display modes**: Banner (top of dashboard) or Modal popup (on login)
- **Dismissible** — Users can dismiss announcements, tracked per user
- **Types**: Info (purple), Warning (amber), Success (green)
- **Admin Announcements tab** — View, create, and delete announcements

### Daily Pick Email Notifications (Mar 11, 2026)
- **Automatic daily emails at 8:00 AM ET** to all Pro users
- **Email content options**: Simple (Bet of the Day only) or Full (Bet of Day + Top 3 Picks)
- **User preferences**: Pro users can choose email type or unsubscribe via bell icon in header
- **Admin Emails tab**: Stats (sent today/week, pro users, unsubscribed), "Test Email" and "Send to All Pro" buttons
- **Gmail SMTP**: Configured via EMAIL_ADDRESS and EMAIL_PASSWORD env vars
- **Email logs**: Track sent emails in email_logs collection

### User Testimonials (Mar 11, 2026)
- **Pro users can submit testimonials** via star icon in dashboard header
- **"Share Your Win" modal** with 5-star rating, win amount, and experience message
- **Landing page "What Our Winners Say" section** displays approved testimonials
- **Testimonials show**: 5-star ratings, win amount badges, anonymized usernames (user***)
- **Admin Reviews tab**: Approve/Reject/Delete testimonials with pending/approved counts

### Push Notifications (Mar 11, 2026)
- **In-app notification system** for high-value picks and alerts
- **Bell icon in dashboard header** with notification dropdown
- **Enable/Disable toggle** - users can opt in/out
- **Browser notifications** via Notification API when permission granted
- **Admin can send push notifications** to all subscribers

### Referral System — Pre-existing
- Already built with referral codes and tracking

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$
- Email: betrslip@gmail.com

## Prioritized Backlog

### P1 (User Mentioned)
- Tiered subscriptions: $5/$10/$20 (postponed by user)

### P2 (Nice to Have)
- Bet tracker / P&L dashboard for users
- Custom share card branding per tier
- Credit purchase history for users
