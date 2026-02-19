# BetrSlip - Product Requirements Document

## Original Problem Statement
Sports betting analytics platform ("BetrSlip") — a full-stack React + FastAPI + MongoDB app that provides AI-powered betting slip analysis, live odds scanning, and value betting tools using The Odds API.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **External APIs**: The Odds API (20K tier), WeatherAPI, SportsRC API
- **Auth**: JWT-based with admin auto-creation on startup

## What's Been Implemented (as of Feb 19, 2026)

### Landing Page (Redesigned)
- Hero section: "BEAT THE BOOKS WITH AI" with mock Bet of the Day card
- Live ticker bar with scrolling stats
- Features bento grid: Bet of the Day, Pick of the Week, AI Parlays, EV Scanner, Share
- "Fading the Public" showcase section
- Pricing: Free ($0) vs Pro ($5/mo)
- Final CTA section
- Old landing backed up as `LandingOld.js`

### Dashboard Features
- **Bet of the Day** — Confidence meter, win prob, edge, Fading the Public badge, share
- **Upload Betting Slip** + Analysis Results
- **Today's Top Picks** — Share/Copy buttons (moved below upload)
- **AI Parlay Picks** + **Best Value Bets** (side by side)
- **Today's Best Bets** + **Pick of the Week** leaderboard (side by side)
- **USA Sports Hub**, AI Chat, Referral, Notifications

### Admin Panel Enhancements
- Online/offline status (green dot + ONLINE badge, 5-min activity window)
- Last login timestamp
- IP address tracking (via login)
- 5-column expanded stats grid

### Backend Features
- Fading the Public detection (underdog ML, taking points, unders, large edge)
- Auto-save Bet of the Day to `bot_pick_history` for leaderboard tracking
- Cache TTL extended to 60min, Bet of Day daily cache
- Warmup skip for fresh cache (saves API quota)
- Low-quota warning logging
- Last_active updated on every authenticated request

### Key Endpoints
- `/api/bet-of-the-day` — Highest-confidence pick with fading_public indicator
- `/api/weekly-leaderboard` — Pro-only: W/L, ROI, streaks
- `/api/daily-bet-card` — Top 3 picks with winning_probability
- `/api/admin/users` — User list with is_online, last_login, ip_addresses

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog
- No pending tasks currently defined
