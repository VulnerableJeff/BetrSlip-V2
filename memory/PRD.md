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

15. **Multiple Payment Methods** ✅ (Feb 3, 2026)
    - **Stripe** (Card): Existing recurring subscription ($5/month)
    - **PayPal**: One-time $5 payment with instant activation
    - **CashApp**: Manual payment to $BetrSlip, admin approval required
    - New subscription modal with payment method selector (Card/PayPal/CashApp tabs)
    - Admin CashApp management tab to approve/reject pending requests
    - Full transaction tracking for all payment methods

16. **Server Refactoring** ✅ (Feb 3, 2026)
    - Reduced server.py from 2500+ lines to ~300 lines
    - Created modular route structure:
      - `/app/backend/routes/deps.py` - Shared dependencies
      - `/app/backend/routes/auth.py` - Authentication routes
      - `/app/backend/routes/subscriptions.py` - Payment routes
      - `/app/backend/routes/picks.py` - Daily picks routes
    - Created services module for business logic
    - Backwards-compatible API endpoints maintained

17. **Live Game Streaming** ✅ (Feb 3, 2026)
    - Live Games section on Dashboard showing currently live games
    - Real-time scores from The Odds API
    - Admin can add custom stream links (embed or external URLs)
    - **Free users**: 5-second ad before stream loads (promotes Pro)
    - **Pro users**: Instant ad-free streaming experience
    - Watch button opens video player modal
    - Admin "Live Streams" tab to manage stream links
    - Sport emojis and live score display

18. **Enhanced Stream Sources** ✅ (Feb 3, 2026)
    - New `StreamSourcesService` for aggregating streaming sources
    - Network badges (ESPN, CBS, TNT, etc.) displayed on games
    - Multiple stream source suggestions per game
    - Official streaming links for each sport:
      - NBA: NBA League Pass, ESPN, TNT
      - NFL: NFL+, ESPN, CBS, FOX
      - NHL: ESPN+, NHL.tv
      - MLB: MLB.tv, ESPN
    - Automatic detection of live games from API
    - Admin streams can override/supplement API games

19. **Enhanced Sports Intelligence for AI** ✅ (Feb 3, 2026)
    - New `EnhancedSportsIntelligence` service with comprehensive data:
      - Team recent form (last 10 games)
      - Home/away performance splits
      - Against-the-spread (ATS) records
      - Rest days analysis
      - Head-to-head historical matchups
      - Weather data for outdoor sports (NFL, MLB)
      - Public betting percentages
      - Line movement tracking
      - Key statistical matchups
    - AI prompt now includes ALL intelligence data
    - Picks include matchup data, weather impact, public betting %
    - Data caching for performance (1 hour TTL)
    - Version upgraded to v3_enhanced_intel

---

## Completed This Session (Feb 5, 2026)

20. **CRITICAL BUG FIX: AI Bet Slip Analysis Restored** ✅ (Feb 5, 2026)
    - Fixed GPT-4o Vision API payload format error
    - Changed from `FileContent(content_type=..., file_content_base64=...)` to `ImageContent(image_base64=...)`
    - Bet slip upload and analysis now working correctly
    - AI returns win probability, Kelly Criterion, EV, recommendations

21. **History Page Bug Fixed** ✅ (Feb 5, 2026)
    - Fixed API endpoint from `/api/history` to `/api/analyses`
    - Updated component to handle nested data structure (`item.analysis.overall_probability`)
    - History page now displays all analysis data correctly

22. **New Endpoint: Mark Analysis Outcome** ✅ (Feb 5, 2026)
    - `POST /api/analysis/{id}/outcome` - Mark bet as Won/Lost/Push
    - Tracks stake and payout amounts for profit calculations
    - Updates analysis record with outcome data

23. **New Endpoint: User Performance Stats** ✅ (Feb 5, 2026)
    - `GET /api/stats` - Get user's betting statistics
    - Tracks: total_tracked, bets_won, bets_lost, bets_push
    - Calculates: win_rate, accuracy_rate, total_profit, ROI
    - StatsDashboard component now displays real performance data

24. **CRITICAL: Frontend Response Format Fix** ✅ (Feb 5, 2026)
    - Fixed blank screen issue after bet slip analysis
    - Backend now returns flat response structure matching frontend expectations
    - Response includes: `win_probability`, `recommendation`, `expected_value`, `kelly_percentage`, `confidence_score`, `risk_level`, `bets`, `key_factors`, `improvements`
    - Full analysis results now display correctly (Win %, Recommendation badge, EV, Kelly %)

25. **Enhanced Analysis Response** ✅ (Feb 5, 2026)
    - Comprehensive AI prompt for detailed bet slip analysis
    - Now returns: sport detection, bet type, total odds, potential payout
    - Individual bet breakdown with reasoning for each leg
    - Risk factors and positive factors
    - Improvement suggestions
    - Parlay vs straight bet comparison

26. **Security Enhancements** ✅ (Feb 5, 2026)
    - Rate limiting: 5 analyses per 5 minutes per user
    - File validation: Only JPEG/PNG/WEBP allowed, max 10MB
    - Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
    - Input sanitization and validation

27. **Public Stats & Social Proof** ✅ (Feb 5, 2026)
    - New `/api/public-stats` endpoint for landing page
    - Live activity banner showing: active users, total users, bets analyzed, AI accuracy
    - Real-time engagement indicators to build trust

28. **Live Sports Streaming Integration** ✅ (Feb 7, 2026)
    - Integrated SportSRC API for live match data and streams
    - New `LiveStreamsHub` component replacing old `LiveGames`
    - Features:
      - Real-time live match listings with team badges, scores, leagues
      - Multiple HD stream sources per match (up to 4)
      - Full-screen video player with stream switching
      - Auto-refresh every 60 seconds
    - New API endpoints: `/api/streams/live`, `/api/streams/match/{id}`, `/api/streams/upcoming`
    - Supports Football/Soccer (API provides football streams on free tier)

29. **Daily Picks Auto-Refresh Fixed** ✅ (Feb 7, 2026)
    - More aggressive pick replacement (16-18 hour window)
    - Background task generates new picks automatically every 6 hours
    - Fallback game data when Odds API unavailable
    - New admin endpoints: `/api/admin/refresh-picks`, `/api/admin/clear-old-picks`

30. **Landing Page Updates** ✅ (Feb 7, 2026)
    - Updated version badge to v2.1
    - Changed "LIVE PROTOTYPE RUNNING NOW" to "LIVE RUNNING NOW"

31. **USA Sports Hub** ✅ (Feb 7, 2026)
    - Replaced soccer streams with USA sports focus
    - Live scores for NBA, NFL, NHL, MLB, NCAAF, NCAAB
    - Team logos, records, game times, broadcast info
    - Legal streaming links (ESPN, TNT, NBA League Pass, NFL+, etc.)
    - Uses free ESPN API - no additional cost!

32. **Bankroll Tracker** ✅ (Feb 7, 2026)
    - Track deposits, withdrawals, wins, losses
    - Real-time balance, ROI, win rate calculations
    - Recent transaction history
    - Kelly Criterion suggested bet sizing
    - API endpoints: `/api/bankroll`, `/api/bankroll/transaction`

---

## Pending/Future Features

### Completed (Feb 7, 2026)
33. **Dashboard Reorganization** ✅
    - Moved "Upload Betting Slip" to TOP of dashboard
    - Upload and Analysis Results side-by-side for better UX

34. **Line Movement Alerts** ✅
    - Real-time tracking of significant odds changes
    - Shows old line → new line with point change
    - Insights like "Sharp money detected" and "Reverse line movement"
    - Color-coded by significance (high/medium)

35. **AI Parlay Optimizer** ✅
    - AI-suggested combinations with best value
    - Shows win probability, EV%, confidence level
    - Users can add legs to build custom parlays (max 6)
    - Real-time parlay probability calculator

36. **Odds Comparison** ✅
    - Compare odds across DraftKings, FanDuel, BetMGM, Caesars
    - Shows best value sportsbook for each game
    - Edge percentage displayed (e.g., "+2.3% edge at FanDuel")
    - Quick links to sportsbook websites

### Future (P2)
- Performance Analytics Dashboard - Detailed stats by sport/bet type
- Smart Alerts - "Sharp money detected on Lakers"
- Social Features - Public leaderboard, bet sharing

### Future (P3)
- Native mobile app
- Push notifications
- Referral program

---

*Last Updated: February 7, 2026*
