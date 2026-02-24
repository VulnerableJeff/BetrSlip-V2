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

### Support System (Feb 24, 2026)
- Floating support button (headphones icon, bottom-right) — mobile-responsive
- In-app contact form with subject + message
- My Messages tab for users (Pending/Seen/Replied status)
- Admin Support tab with Read/Reply/Delete actions and unread badge

### Landing Page
- Pro members count in top activity bar (Feb 24, 2026)
- Live stats: analyzing count, total users, bets analyzed, AI accuracy

### Admin Dashboard — POLISHED (Feb 24, 2026)
- **Gradient stat cards**: Total Users, Pro Users, Banned, Analyses, Revenue
- **Analytics tab**: Key metrics (Users, MRR, AI Accuracy), User Signups chart (30d), Bet Analyses trend, Conversion Funnel with 4 stages, Most Active Users, Analyses by Sport, Picks Performance by sport, Revenue Insights (MRR + Growth Potential)
- **Top Bets tab**: Stats cards (Total, Elite 80%+, Strong 70-79%, Avg Probability), enriched bet cards with user email, confidence, EV, Kelly, recommendation, bet details
- **Users tab**: Search, filter, IP tracking, online status, subscription management
- **Support tab**: Message management with reply functionality
- **Other tabs**: Daily Picks, Live Streams, CashApp payments

### Security & Subscriptions
- Email verification on signup (confirm email + disposable domain blocking)
- Auto-expiry of Pro subscriptions (background task)
- Stripe ($5/mo) + CashApp payment flows

## Credentials
- Admin: hundojeff@icloud.com / Boo-boo600$

## Prioritized Backlog

### P1 (Future — User Mentioned)
- **Tiered subscription system**: Tier 1 ($5), Tier 2 ($10), Tier 3 ($20)
- **Usage limits per tier**: Cap bet slip analyses per week
- **Feature differentiation**: Different access levels per tier

### P2 (Nice to Have)
- Usage tracking infrastructure per user
- Rate limiting per tier
- Referral reward system
- Custom branding for share cards per tier
