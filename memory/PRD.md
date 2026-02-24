# BetrSlip - Product Requirements Document

## Original Problem Statement
Sports betting analytics platform ("BetrSlip") — a full-stack React + FastAPI + MongoDB app that provides AI-powered betting slip analysis, live odds scanning, and value betting tools using The Odds API.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **External APIs**: The Odds API (20K tier)
- **Auth**: JWT-based with admin auto-creation on startup

## What's Been Implemented

### Core Features
- **Bet slip screenshot upload + AI analysis** (main selling point) — enhanced with leg grades (A-F), strongest/weakest leg indicators, parlay correlation detection
- **Bet of the Day** — Hero spotlight with confidence meter, win probability, Fading the Public indicator
- **AI Parlay Picks** — 2-leg AI-optimized parlays
- **Best Value Bets (EV Scanner)** — Cross-sportsbook value detection
- **Today's Best Bets** — Top 3 +EV picks with winning probability
- **Today's Top Picks** — AI daily picks with Share/Copy

### Support System (NEW - Feb 24, 2026)
- **Floating support button** (headphones icon, bottom-right) replaces old AI chat assistant
- **In-app contact form** — Users submit subject + message, stored in MongoDB
- **My Messages tab** — Users can view status of their messages (Pending/Seen/Replied)
- **Admin Support tab** — View all messages, mark as read, reply, delete
- **Unread badge** — Shows unread count on admin Support tab

### Landing Page
- **Pro members count** displayed in top activity bar with crown icon (NEW - Feb 24, 2026)
- Live activity banner showing analyzing count, total users, bets analyzed, AI accuracy
- How It Works section, Pro Feature showcase, Verified Results section

### Security & Anti-Abuse
- **Email verification on signup** — Confirm email field, disposable domain blocking (24+ temp email providers blocked on both frontend + backend)
- **Password min 6 chars** — enforced on both sides
- **Pro subscription auto-expiry** — Checks on startup, expires active subs >30 days old (skips admin)

### Admin Panel
- Online/offline status, last login, IP tracking
- User management (ban/unban, subscription control)
- CashApp payment approval workflow
- **Support Messages management** (NEW - Feb 24, 2026)

### Payments
- **Stripe**: $5.00/mo (was incorrectly $500 — fixed)
- **CashApp**: Manual flow with instructions to send $5.00 to $betrslip

### Removed Features
- Pick of the Week leaderboard (broken auto-resolver on production)
- AI Chat Assistant (replaced with support contact form)
- WeeklyLeaderboard.js (deleted - unused)
- Line Movers, Build Your Own Parlay, Odds Comparison, Arbitrage Scanner, Player Props, Leaderboard, P&L Tracker, Game Plan

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog

### P0 (Next Up)
- None currently

### P1 (Future - User Mentioned)
- **Tiered subscription system**: Tier 1 ($5), Tier 2 ($10), Tier 3 ($20)
- **Usage limits per tier** — Cap bet slip analyses per week per tier to protect API quota
- **Feature differentiation per tier** — Different access levels for value bets, AI picks, parlay analysis

### P2 (Future - Nice to Have)
- Usage tracking & rate limiting infrastructure per user
- Admin dashboard revenue/usage analytics enhancement
- Custom branding for share cards per tier
- Priority support queue for higher tiers
