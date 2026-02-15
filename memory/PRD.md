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
- **Bet of the Day** — Hero spotlight with circular confidence meter (0-100), win probability, edge %, share button
- **Today's Top Picks** — AI daily picks with Share/Copy buttons, win probability display
- **Upload Betting Slip** — Image upload + AI analysis with real-time intelligence
- **AI Parlay Picks** — AI-optimized 2-leg parlays (Build Your Own removed)
- **Best Value Bets** — EV scanner across sportsbooks
- **Today's Best Bets** — Top 3 +EV picks with winning probability %
- **USA Sports Hub** — Live scores & where to watch
- **AI Chat Assistant** — Floating chat
- **Referral Program & Notification Settings**

### Removed Components (Feb 15, 2026)
- Line Movers (LineMovementAlerts)
- Build Your Own Parlay (ParlayBuilder)
- Odds Comparison, Arbitrage Scanner, Player Props, Leaderboard, P&L Tracker, Game Plan

### Backend Endpoints
- `/api/bet-of-the-day` — Single highest-confidence pick with confidence_score
- `/api/daily-bet-card` — Top 3 picks with winning_probability field
- `/api/parlay-optimizer` — AI optimal parlays
- `/api/ev-scanner` — Value bet opportunities
- `/api/daily-picks` — Admin-curated daily picks
- `/api/analyze` — Bet slip image analysis

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog
- No pending tasks currently defined
- Potential: Historical performance tracking, ROI dashboards, notification alerts for value bets
