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

### Bug Fixes (Mar 5, 2026)
- **Admin users limit** — Increased from 100 to 500, now shows all users
- **Free trial reset** — Added `/api/admin/users/{id}/reset-usage` endpoint for admin to fix user accounts
- **Signup robustness** — Changed `insert_one` to `update_one(upsert=True)` for user_usage to prevent orphaned records
- **Timezone fix** — All game times now properly convert to US Eastern using `ZoneInfo("America/New_York")` (EST/EDT auto-handled)

### AI Accuracy Improvements (Mar 5, 2026)
- **Enhanced bet slip analysis prompt** — Added CLV analysis, SGP correlation warnings, stricter probability calibration (heavy favorites capped at 72-78%, spreads 45-55%), realistic parlay caps (3-leg never >25%)
- **Improved daily picks prompt** — Added 10-point intelligence ranking (CLV > Form > Rest > Home/Away), strict edge criteria (min 3%), max probability cap 68%, back-to-back fade strategy, sport avoidance from poor record

### Growth Features (Mar 5, 2026)
- **Usage bar for free users** — Shows progress dots (5 total), remaining count, and contextual upgrade button (changes to red urgent when 0 left)
- **Post-analysis conversion prompt** — After each analysis, free users see "X free analyses left" with Go Pro button
- **Always-visible usage state** — Free users always see their status, not just when ≤2 remaining

### Landing Page (Feb 26, 2026)
- Two CTA buttons above fold ("Start Free" + "Go Pro")
- Winning demo card (72.4% STRONG BET replaces 28.5% losing example)
- Verified win rate in top bar, Pro members count

### Auth Page (Feb 26, 2026)
- Two-column layout with social proof + features + live stats
- Email verification with disposable domain blocking

### Support System (Feb 24, 2026)
- Floating support button, in-app contact form, admin reply system

### Admin Dashboard (Feb 24, 2026)
- Gradient stat cards, Analytics with charts, enriched Top Bets
- Support Messages tab, user IP/activity tracking
- **Reset Usage button per user** (Mar 5, 2026)

### Payments
- Stripe ($5/mo), CashApp QR code for $BetrSlip (PayPal removed)

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog

### P1 (User Mentioned)
- Tiered subscriptions: $5/$10/$20
- Usage limits per tier
- Referral system

### P2 (Nice to Have)
- Push notifications for daily picks
- Email alerts for Bet of the Day
- Custom share card branding per tier
