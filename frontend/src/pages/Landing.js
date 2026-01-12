import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Upload, BarChart3, Shield, Sparkles, AlertCircle, Target, TrendingUp, CheckCircle, Camera, ArrowRight, Trophy, Flame, Crown } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg font-black text-2xl">
                  BetrSlip
                </div>
              </div>
              <span className="text-slate-400 text-sm font-semibold bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                v1.0
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full mb-8">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">
                Live Prototype Running Now
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-16">
            <h1
              className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-6 tracking-tight"
              data-testid="hero-title"
            >
              AI-powered bet analysis{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                you can trust.
              </span>
            </h1>
            <p
              className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto mb-4"
              data-testid="hero-description"
            >
              Upload your bet slip screenshot. Get AI-powered win probability with real-time 
              injury reports, weather data, and team stats. Track your results and see our accuracy.
            </p>
            {/* Supported Sportsbooks */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-6">
              <span className="text-slate-500 text-sm">Works with:</span>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white font-semibold text-sm hover:border-violet-500/50 transition-colors">DraftKings</span>
                <span className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white font-semibold text-sm hover:border-violet-500/50 transition-colors">FanDuel</span>
                <span className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white font-semibold text-sm hover:border-violet-500/50 transition-colors">Hard Rock</span>
                <span className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-white font-semibold text-sm hover:border-violet-500/50 transition-colors">BetMGM</span>
                <span className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-emerald-400 font-semibold text-sm">+ More</span>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold">Track AI Accuracy</span>
            </div>
            <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 px-4 py-2 rounded-full">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="text-violet-400 text-sm font-semibold">Real-Time Sports Data</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-semibold">Transparent Results</span>
            </div>
          </div>

          {/* Preview Card */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="glass border-2 border-violet-500/20 rounded-2xl p-6 sm:p-8 glow-purple">
              {/* Analysis Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="text-xs text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/30">
                    AI Analysis Complete
                  </span>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-6 mb-4">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Win Probability</p>
                  <p className="text-5xl sm:text-6xl font-black text-yellow-400">28.5%</p>
                  <p className="text-slate-400 text-xs mt-2">Confidence: 7/10</p>
                </div>
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-500/10 border border-yellow-500/50">
                  <span className="font-bold text-yellow-400">SMALL/SKIP</span>
                </div>
                <p className="text-slate-400 text-sm mt-3">
                  EV: <span className="text-red-400 font-semibold">-8.2%</span> • Kelly: <span className="text-violet-400 font-semibold">0%</span>
                </p>
              </div>

              {/* Real-Time Data Section */}
              <div className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/30 rounded-xl p-4 mb-4">
                <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Real-Time Intelligence
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Injuries</p>
                    <p className="text-emerald-400 font-bold text-sm">2 Key OUT</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Weather</p>
                    <p className="text-yellow-400 font-bold text-sm">❄️ 20°F</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Form</p>
                    <p className="text-emerald-400 font-bold text-sm">WWWLW</p>
                  </div>
                </div>
              </div>

              {/* Parlay Comparison */}
              <div className="bg-gradient-to-r from-violet-950/30 to-purple-950/30 border border-violet-500/30 rounded-xl p-4 mb-4">
                <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  Parlay vs Straight Bets
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Parlay EV</p>
                    <p className="text-xl font-bold text-red-400">-8.2%</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Straight Bets EV</p>
                    <p className="text-xl font-bold text-yellow-400">-2.1%</p>
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded px-3 py-2 text-center">
                  <p className="text-violet-300 text-sm font-semibold">💡 Bet individually</p>
                  <p className="text-slate-400 text-xs mt-1">Better value: 6.1% EV difference</p>
                </div>
              </div>
              
              {/* Sample Bets */}
              <div className="space-y-2">
                <h3 className="text-white font-bold text-sm mb-3">Individual Bet Breakdown</h3>
                
                <div className="border-l-2 border-violet-500/30 pl-4 py-2 bg-slate-900/30 rounded-r">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-white font-semibold text-xs">Chiefs -1H Moneyline</p>
                    <span className="text-emerald-400 font-bold text-xs">61%</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-1">odds -140</p>
                  <p className="text-slate-300 text-xs">Strong home performance, favorable matchup</p>
                </div>

                <div className="border-l-2 border-violet-500/30 pl-4 py-2 bg-slate-900/30 rounded-r">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-white font-semibold text-xs">Travis Kelce Over 5.5 Receptions</p>
                    <span className="text-yellow-400 font-bold text-xs">58%</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-1">odds -115</p>
                  <p className="text-slate-300 text-xs">Consistent target share but tough defense</p>
                </div>

                <div className="border-l-2 border-violet-500/30 pl-4 py-2 bg-slate-900/30 rounded-r">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-white font-semibold text-xs">Steelers +7.5 (Spread)</p>
                    <span className="text-yellow-400 font-bold text-xs">55%</span>
                  </div>
                  <p className="text-slate-400 text-xs mb-1">odds -110</p>
                  <p className="text-slate-300 text-xs">Road underdog, recent form concerns</p>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="mt-4 bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                <h3 className="text-red-400 font-bold text-xs mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Risk Factors
                </h3>
                <ul className="space-y-1">
                  <li className="flex items-start gap-1 text-xs text-slate-300">
                    <span className="text-red-400">•</span>
                    <span>3-leg parlay significantly reduces win probability</span>
                  </li>
                  <li className="flex items-start gap-1 text-xs text-slate-300">
                    <span className="text-red-400">•</span>
                    <span>Negative expected value - house edge too high</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              data-testid="get-started-btn"
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-lg px-12 py-7 rounded-xl hover:scale-105 transition-all duration-200 shadow-xl shadow-violet-500/25"
              onClick={() => navigate('/auth')}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Analysis
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Get AI-powered bet analysis in 3 simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 border-2 border-violet-500/50 flex items-center justify-center mb-4 relative">
                  <Camera className="w-8 h-8 text-violet-400" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-violet-500 text-white text-sm font-bold flex items-center justify-center">1</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Screenshot Your Bet</h3>
                <p className="text-slate-400 text-sm">
                  Take a screenshot from <span className="text-emerald-400 font-semibold">DraftKings</span>, <span className="text-emerald-400 font-semibold">FanDuel</span>, <span className="text-emerald-400 font-semibold">Hard Rock</span>, or any sportsbook app
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-8 -right-4 w-8 text-slate-600">
                <ArrowRight className="w-8 h-8" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500/50 flex items-center justify-center mb-4 relative">
                  <Upload className="w-8 h-8 text-emerald-400" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center">2</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Upload & Analyze</h3>
                <p className="text-slate-400 text-sm">
                  Our AI extracts bet details and calculates win probability using <span className="text-yellow-400 font-semibold">real-time odds</span>, <span className="text-yellow-400 font-semibold">injury reports</span> & <span className="text-yellow-400 font-semibold">team stats</span>
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-8 -right-4 w-8 text-slate-600">
                <ArrowRight className="w-8 h-8" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500/50 flex items-center justify-center mb-4 relative">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-500 text-white text-sm font-bold flex items-center justify-center">3</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Make Smarter Bets</h3>
              <p className="text-slate-400 text-sm">
                Get detailed breakdown with <span className="text-violet-400 font-semibold">win probability</span>, <span className="text-violet-400 font-semibold">expected value</span>, and <span className="text-violet-400 font-semibold">betting suggestions</span>
              </p>
            </div>
          </div>

          {/* Supported Sportsbooks */}
          <div className="mt-12 pt-8 border-t border-slate-800/50">
            <p className="text-center text-slate-500 text-sm mb-4">Works with all major sportsbooks</p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-semibold">DraftKings</div>
              <div className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-semibold">FanDuel</div>
              <div className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-semibold">Hard Rock</div>
              <div className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-semibold">BetMGM</div>
              <div className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-semibold">Caesars</div>
              <div className="px-6 py-3 bg-slate-800/50 border border-emerald-500/30 rounded-xl text-emerald-400 font-semibold">+ Any App</div>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Top Picks - Pro Feature */}
      <section className="py-16 bg-gradient-to-b from-slate-950 to-violet-950/20 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Feature Description */}
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full mb-6">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">
                  Pro Feature
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Today's Top Picks
              </h2>
              <p className="text-slate-400 text-lg mb-6">
                Get <span className="text-yellow-400 font-semibold">3 AI-curated high-value bets</span> delivered daily. Our algorithm analyzes thousands of games to find the best opportunities.
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">Win Probability 60%+</span>
                    <p className="text-slate-400 text-sm">Only high-confidence picks make the cut</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">Full Analysis Included</span>
                    <p className="text-slate-400 text-sm">Reasoning, risk factors, and confidence scores</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">Updated Daily</span>
                    <p className="text-slate-400 text-sm">Fresh picks every morning for that day's games</p>
                  </div>
                </li>
              </ul>

              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold text-lg px-8 py-6 rounded-xl hover:scale-105 transition-all duration-200 shadow-xl shadow-yellow-500/25"
                onClick={() => navigate('/auth')}
              >
                <Trophy className="w-5 h-5 mr-2" />
                Get Pro - $5/month
              </Button>
            </div>

            {/* Right - Preview Card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-3xl blur-3xl"></div>
              
              {/* Card */}
              <div className="relative bg-slate-900/90 border border-yellow-500/30 rounded-2xl p-6 backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      Today's Top Picks
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
                        3 Picks
                      </span>
                    </h3>
                    <p className="text-slate-400 text-xs">AI-analyzed high-value bets</p>
                  </div>
                </div>

                {/* Sample Picks */}
                <div className="space-y-3">
                  {/* Pick 1 */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🏀</span>
                          <span className="text-xs text-slate-400 font-medium">NBA</span>
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-300 text-xs font-bold">TOP PICK</span>
                        </div>
                        <p className="text-white font-bold text-sm">Celtics -6.5 vs Hornets</p>
                        <p className="text-slate-400 text-xs">Tonight 7:30 PM ET</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-400">72%</p>
                        <p className="text-slate-400 text-xs">-108</p>
                      </div>
                    </div>
                  </div>

                  {/* Pick 2 */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🏈</span>
                          <span className="text-xs text-slate-400 font-medium">NFL</span>
                        </div>
                        <p className="text-white font-bold text-sm">Chiefs -3.5 vs Raiders</p>
                        <p className="text-slate-400 text-xs">Sunday 4:25 PM ET</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-yellow-400">68%</p>
                        <p className="text-slate-400 text-xs">-110</p>
                      </div>
                    </div>
                  </div>

                  {/* Pick 3 */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">⚾</span>
                          <span className="text-xs text-slate-400 font-medium">MLB</span>
                        </div>
                        <p className="text-white font-bold text-sm">Dodgers ML vs Padres</p>
                        <p className="text-slate-400 text-xs">Tomorrow 10:10 PM ET</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-yellow-400">64%</p>
                        <p className="text-slate-400 text-xs">-145</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pro badge */}
                <div className="mt-4 pt-4 border-t border-slate-800 text-center">
                  <p className="text-slate-500 text-xs">
                    Included with <span className="text-yellow-400 font-semibold">Pro subscription</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-950/50 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-4">Why BetrSlip?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Make smarter bets with AI-powered analysis, real-time data, and transparent accuracy tracking
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="text-center" data-testid="feature-upload">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center mb-4 mx-auto">
                <Upload className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Smart OCR</h3>
              <p className="text-slate-400 text-sm">
                Upload any bet slip screenshot—we extract every detail automatically
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center" data-testid="feature-analyze">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Real-Time Data</h3>
              <p className="text-slate-400 text-sm">
                Live odds, injuries, weather & team form integrated into analysis
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center" data-testid="feature-track">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center mb-4 mx-auto">
                <BarChart3 className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Kelly & EV</h3>
              <p className="text-slate-400 text-sm">
                Optimal stake sizes and expected value for every leg
              </p>
            </div>

            {/* Feature 4 - NEW: Accuracy Tracking */}
            <div className="text-center" data-testid="feature-accuracy">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 mx-auto">
                <Target className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Track Accuracy</h3>
              <p className="text-slate-400 text-sm">
                Mark bets as Won/Lost and see our real prediction accuracy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Accuracy Section - NEW */}
      <section className="py-16 bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border-y border-emerald-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full mb-6">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Transparency Built In</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-4">
            Track Results. Verify Accuracy.
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Mark your bets as Won, Lost, or Push after games. See our AI's real accuracy rate 
            and track your personal performance over time. No hidden stats—full transparency.
          </p>
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-emerald-500/30">
              <p className="text-3xl font-black text-emerald-400 mb-1">✓</p>
              <p className="text-slate-400 text-sm">Won</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-red-500/30">
              <p className="text-3xl font-black text-red-400 mb-1">✗</p>
              <p className="text-slate-400 text-sm">Lost</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-500/30">
              <p className="text-3xl font-black text-slate-400 mb-1">−</p>
              <p className="text-slate-400 text-sm">Push</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-8 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm mb-2">© 2025 BetrSlip. AI Bet Slip Companion.</p>
          <p className="text-slate-500 text-xs">
            Analyze smarter. Track results. Bet with confidence.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
