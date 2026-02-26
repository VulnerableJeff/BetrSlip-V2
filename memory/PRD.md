# BetrSlip - Product Requirements Document

## Original Problem Statement
Sports betting analytics platform ("BetrSlip") — a full-stack React + FastAPI + MongoDB app that provides AI-powered betting slip analysis, live odds scanning, and value betting tools using The Odds API.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **External APIs**: The Odds API (20K tier), OpenAI, Stripe
- **Auth**: JWT-based with admin auto-creation on startup

## What's Been Implemented

### Core Features
- Bet slip screenshot upload + AI analysis (main feature) with leg grades, EV, Kelly
- Bet of the Day hero spotlight with confidence meter
- AI Parlay Picks, Best Value Bets (EV Scanner), Today's Top Picks
- Share/Copy functionality for picks

### Landing Page — REDESIGNED (Feb 26, 2026)
- **Two CTA buttons above the fold**: "Start Free — 5 Analyses" + "Go Pro — $5/mo"
- **Winning demo card**: Shows 72.4% STRONG BET with +12.8% EV (replaces old 28.5% losing example)
- **Verified win rate** in top bar (replaces raw AI accuracy)
- **Pro members count** with crown icon in activity banner
- How It Works, Pro Features, Verified Results, Why BetrSlip sections

### Auth Page — REDESIGNED (Feb 26, 2026)
- **Two-column layout**: Social proof + features on left, login form on right
- **Live stats display**: Users, Pro Members, Analyses count from API
- **Feature highlights**: Upload Any Bet Slip, Real-Time Data, Daily AI Picks, 5 Free Analyses
- **Trust badge**: "Free to start • No credit card required"
- BetrSlip logo links back to landing page
- Email verification (confirm email + disposable domain blocking)

### Support System (Feb 24, 2026)
- Floating support button (headphones icon, bottom-right) — mobile-responsive
- In-app contact form with subject + message
- My Messages tab (Pending/Seen/Replied status)
- Admin Support tab with Read/Reply/Delete actions and unread badge

### Admin Dashboard — POLISHED (Feb 24, 2026)
- Gradient stat cards, Analytics tab with charts & funnel, Top Bets with enriched data
- Users tab with search/filter/IP/online status, Support Messages, CashApp, Live Streams

### Payments
- **Stripe**: $5.00/mo (PayPal removed Feb 24, 2026)
- **CashApp**: QR code for $BetrSlip + direct link (https://cash.app/$BetrSlip)

### Security & Subscriptions
- Email verification, disposable domain blocking, auto-expiry of Pro subscriptions

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog

### P1 (Future — User Mentioned)
- **Tiered subscription system**: Tier 1 ($5), Tier 2 ($10), Tier 3 ($20)
- **Usage limits per tier**: Cap bet slip analyses per week
- **Feature differentiation**: Different access levels per tier
- **Referral system**: Free week of Pro for each conversion

### P2 (Nice to Have)
- Push notifications / Email alerts for Bet of the Day
- Usage tracking infrastructure per user
- Rate limiting per tier
- Custom branding for share cards per tier
