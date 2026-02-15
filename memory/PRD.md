# BetrSlip - Product Requirements Document

## Original Problem Statement
Sports betting analytics platform ("BetrSlip") — a full-stack React + FastAPI + MongoDB app that provides AI-powered betting slip analysis, live odds scanning, and value betting tools using The Odds API.

## Core Requirements
- Upload & analyze bet slips with AI (GPT-powered)
- Live odds data from The Odds API across multiple sportsbooks
- EV scanning, parlay optimization, daily picks
- Pro subscription tier ($5/mo) with premium features
- Admin dashboard for managing picks and users

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **External APIs**: The Odds API, WeatherAPI, SportsRC API
- **Auth**: JWT-based with admin auto-creation on startup

## What's Been Implemented (as of Feb 15, 2026)

### Production Stability
- Database connection fix (no `load_dotenv(override=True)`)
- Stale API key fix (reads ODDS_API_KEY from .env directly)
- Admin user auto-creation on startup
- Cache warming with circuit breaker pattern

### Dashboard Features (Active)
- **Bet of the Day** — Hero spotlight with circular confidence meter (0-100), win probability, edge %, share button, "Why this pick?" reasoning
- **Upload Betting Slip** — Image upload + AI analysis with real-time intelligence
- **Today's Top Picks** — AI daily picks with Share/Copy buttons, win probability display (moved below upload section)
- **AI Parlay Picks** — AI-optimized 2-leg parlays (Build Your Own removed)
- **Best Value Bets** — EV scanner across sportsbooks
- **Today's Best Bets** — Top 3 +EV picks with winning probability %
- **Pick of the Week** (PRO) — Leaderboard tracking Bet of the Day performance: W/L record, ROI, streaks, daily picks with outcomes
- **USA Sports Hub** — Live scores & where to watch
- **AI Chat Assistant** — Floating chat
- **Referral Program & Notification Settings**

### Dashboard Layout Order
1. Bet of the Day (hero)
2. Upload Betting Slip + Analysis Results (2-col)
3. Today's Top Picks (full width)
4. AI Parlay Picks + Best Value Bets (2-col)
5. Today's Best Bets + Pick of the Week (2-col)
6. USA Sports Hub
7. Referral + Notifications (2-col)

### Removed Components
- Line Movers (LineMovementAlerts)
- Build Your Own Parlay (ParlayBuilder)
- Odds Comparison, Arbitrage Scanner, Player Props, Leaderboard, P&L Tracker, Game Plan

### Backend Endpoints
- `/api/bet-of-the-day` — Single highest-confidence pick with confidence_score, auto-saves to bot_pick_history
- `/api/weekly-leaderboard` — Pro-only: weekly picks W/L, ROI, streaks, all-time record
- `/api/daily-bet-card` — Top 3 picks with winning_probability field
- `/api/parlay-optimizer` — AI optimal parlays
- `/api/ev-scanner` — Value bet opportunities
- `/api/daily-picks` — Auto-generated daily picks
- `/api/analyze` — Bet slip image analysis

### Key Collections
- `bot_pick_history` — Tracks Bet of the Day picks with outcomes for leaderboard
- `daily_picks` — Auto-generated daily picks with outcomes
- `api_cache` — Hourly cache for API responses

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog
- No pending tasks currently defined
