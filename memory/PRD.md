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
- Stripe ($5/mo), CashApp QR ($BetrSlip), PayPal removed

### Referral System — Pre-existing
- Already built with referral codes and tracking

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog

### P1 (User Mentioned)
- Tiered subscriptions: $5/$10/$20
- Usage limits per tier
- Daily pick email notifications

### P2 (Nice to Have)
- User testimonials/ratings system
- Bet tracker / P&L dashboard for users
- Custom share card branding per tier
