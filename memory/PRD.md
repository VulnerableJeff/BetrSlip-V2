# BetrSlip - Product Requirements Document

## Original Problem Statement
Build a website named "BetrSlip" where users can upload a screenshot of their betting slips from apps like Hard Rock, DraftKings, and FanDuel. The application should analyze the screenshot using AI and provide an estimated win probability, along with detailed reasoning and additional analytics.

## Core Features

### Implemented (Complete)

#### 1. Bet Slip Analysis (Core)
- Upload bet slip screenshots from any sportsbook
- AI-powered OCR extraction using GPT-4o Vision
- Works with DraftKings, FanDuel, Hard Rock, BetMGM, and more
- Extracts individual legs, odds, stake amounts

#### 2. Win Probability & Analytics
- Estimated win percentage with confidence score
- Kelly Criterion optimal stake calculation
- Expected Value (EV) analysis
- Parlay vs Straight bet comparison
- True odds calculation
- Bet recommendations (STRONG BET / BET / SMALL/SKIP / PASS)

#### 3. Real-Time Data Integration
- Live odds from The Odds API
- Weather data from WeatherAPI.com
- Injury reports from ESPN API
- Team form and recent performance
- Head-to-head history

#### 4. User Authentication & Accounts
- JWT-based authentication
- User registration and login
- Session management (1-week tokens)

#### 5. Bet History & Performance Tracking
- View analyzed bet history
- Mark bets as Won/Lost/Push
- Track AI prediction accuracy
- Personal betting statistics

#### 6. Subscription System
- 5 free analyses for new users
- $5/month Pro subscription via Stripe (LIVE MODE)
- Device fingerprinting to prevent abuse
- Usage tracking per user
- **Daily Picks are PRO-ONLY feature** (paywalled)

#### 7. Admin Dashboard
- View all users with search/filter
- Ban/unban users
- Grant/revoke Pro subscriptions
- Reset user usage counts
- Delete users
- View site-wide statistics
- **Top Bets Storage** - Automatically stores bets with 60%+ win probability

#### 8. Smart Suggestions
- Improvement suggestions for low-probability bets
- Educational tips about betting math
- Risk level indicators
- Warning for completed games

### UI/UX Features
- Modern dark theme with violet/purple accents
- Mobile-responsive design
- Real-time intelligence display with formatted cards
- Sportsbook badges (DraftKings, FanDuel, Hard Rock, BetMGM)
- Analysis duration notification
- Social sharing capabilities

## Technical Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor async driver
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Payments**: Stripe Checkout (TEST MODE)
- **Auth**: JWT with bcrypt password hashing

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS + Shadcn/UI
- **State**: React hooks
- **Payments**: @stripe/react-stripe-js
- **Fingerprinting**: @fingerprintjs/fingerprintjs

### Third-Party APIs
| Service | Purpose | Key Required |
|---------|---------|--------------|
| OpenAI GPT-4o | Bet analysis | Emergent LLM Key |
| The Odds API | Live odds data | User API Key |
| WeatherAPI.com | Weather conditions | User API Key |
| ESPN API | Injury reports | No key |
| Stripe | Payments | User API Key (TEST) |

## Key Database Collections
- `users` - User accounts with auth
- `bet_analyses` - All analyzed bet slips
- `user_usage` - Free tier usage tracking
- `subscriptions` - Pro subscription records
- `payment_transactions` - Stripe transactions
- `top_bets` - High-probability bets (60%+)

## Admin Access
- Admin email: `hundojeff@icloud.com`
- Admin password: `admin123`

## Important Notes

### Payment Status
- ✅ Stripe is now in **LIVE MODE** - real payments enabled!
- Live secret key configured in backend
- Ready for production use

### Top Bets Threshold
- Bets with 60%+ win probability are automatically saved
- Admin can view, expand, and delete these bets

---

## Upcoming Tasks (Prioritized)

### P1 - High Priority
1. **PayPal Integration** - Add as alternative payment method

### P2 - Medium Priority
2. **Manual CashApp Option** - UI for requesting CashApp payment

### Future / Backlog
- Bankroll Management Dashboard
- Line Movement Tracking & Alerts
- Parlay Correlation Detection
- Value Bet Scanner (+EV finder)
- Social/Community Features
- Native Mobile App

---

## Completed This Session (Jan 9, 2026)

1. **Verified Top Bets Admin Feature** - Fully functional with:
   - Stats cards (Total, Elite 80%+, Strong 70-79%, Avg Probability)
   - Expandable bet details
   - Delete functionality
   - Empty state when no high-percentage bets

2. **Updated Landing Page** - Added prominent sportsbook badges:
   - DraftKings, FanDuel, Hard Rock, BetMGM, + More
   - Visual badges with hover effects
   - Clearer messaging for supported apps

3. **Activated Live Stripe Payments** ✅
   - Configured live secret key (sk_live_...)
   - Verified checkout session creation works
   - Ready to process real $5/month subscriptions

4. **Social Sharing Link Preview** ✅
   - Updated page title to "BetrSlip - AI Bet Slip Analysis"
   - Added Open Graph and Twitter Card meta tags
   - Removed "Made with Emergent" badge from HTML

5. **Daily Picks Feature** ✅
   - "Today's Top Picks" section on Dashboard showing 1-3 featured bets
   - Admin can create, edit, activate/deactivate, and delete picks
   - Picks include: sport, title, description, win probability, odds, confidence, reasoning, risk factors, game time
   - **PRO-ONLY FEATURE**: Daily Picks are locked for ALL free users
   - Locked state shows blurred picks with "Pro Feature" overlay and "Go Pro - $5/month" button
   - Pro/subscribed users see full picks with "PRO" badge

6. **"How It Works" Landing Page Section (NEW)** ✅
   - 3-step visual guide: Screenshot → Upload & Analyze → Make Smarter Bets
   - Highlights DraftKings, FanDuel, Hard Rock support
   - Full sportsbook badges: DraftKings, FanDuel, Hard Rock, BetMGM, Caesars, + Any App

7. **Daily Picks Auto-Generation** ✅
   - AI automatically generates daily picks using real-time odds data
   - Admin can manually trigger new pick generation via "Generate New Picks" button
   - Uses The Odds API + GPT-4o for intelligent pick selection

8. **Picks Performance Tracking** ✅
   - Admin can mark picks as Won/Lost/Push with timestamp tracking
   - Performance stats in admin dashboard: Win Rate, Streak, Total Decided
   - Public API endpoint `/api/picks-performance` for displaying results

9. **"Proven Results" Landing Page Section** ✅
   - "VERIFIED RESULTS" badge with "Our Picks Actually Win" headline
   - Stats row showing: Wins, Losses, Win Rate, Current Streak
   - Recent Pick Results grid displaying last 5 decided picks
   - Color-coded outcome badges (green WON, red LOST, yellow PUSH)
   - Sport emojis and odds displayed per pick
   - Strong CTA: "Start Winning - 5 Free Analyses"

10. **Deployment Fixes** ✅
    - bcrypt pinned to v4.0.1 for passlib compatibility
    - Added /health and /api/health endpoints
    - Key-protected admin reset endpoints for live database initialization

11. **Auto-Resolution of Pick Outcomes** ✅
    - Automatic outcome tracking based on completed game scores from The Odds API
    - Background job runs every 2 hours to check for completed games
    - Matches picks to games using team names and sport
    - Determines Won/Lost/Push based on actual scores vs pick (spread or moneyline)
    - Admin "Auto-Resolve" button for manual triggering
    - Runs on server startup to catch any recent games
    - No more manual tracking needed - fully automated!

12. **Daily Picks Paywall Fixed** ✅ (Feb 3, 2026)
    - Daily Picks are now **PRO-ONLY** feature
    - Free users see blurred picks with "Pro Feature" overlay
    - Clean "Go Pro - $5/month" CTA with crown icon
    - Pro users see full picks with all details

13. **Smart AI Picks with Learning** ✅ (Feb 3, 2026)
    - AI learns from historical performance data
    - Tracks win rate by sport (NBA 60%, NHL 50%)
    - Tracks win rate by bet type (Spreads 66.7%, Moneylines 50%)
    - Tracks performance by confidence level (High confidence: 75% win rate!)
    - Avoids recent losing teams/patterns
    - Enhanced prompt engineering for smarter pick selection
    - New `/api/admin/ai-learning-stats` endpoint to view learning data

14. **Code Architecture Improvements** ✅ (Feb 3, 2026)
    - Created `/app/backend/services/` module:
      - `smart_picks_service.py` - AI picks with learning
      - `auto_resolver_service.py` - Outcome auto-resolution
    - Cleaner separation of concerns
    - More maintainable codebase

---

*Last Updated: January 31, 2026*
