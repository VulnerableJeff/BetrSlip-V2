import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Upload, BarChart3, Shield, Sparkles } from 'lucide-react';

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
              Let AI read your{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                bet slip
              </span>
              <br />
              before you bet it.
            </h1>
            <p
              className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto mb-4"
              data-testid="hero-description"
            >
              BetrSlip scans your sportsbook screenshot, parses every leg, and gives you
              fair odds, win probability, and Kelly stake—in seconds.
            </p>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto">
              Upload slips from Hard Rock, DraftKings, FanDuel & more
            </p>
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

      {/* Features Section */}
      <section className="py-20 bg-slate-950/50 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center" data-testid="feature-upload">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center mb-6 mx-auto">
                <Upload className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Upload slips from Hard Rock, DraftKings, FanDuel & more</h3>
              <p className="text-slate-400 text-sm">
                Simply screenshot your bet slip from any major sportsbook
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center" data-testid="feature-analyze">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center mb-6 mx-auto">
                <Sparkles className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">AI-powered parsing & edge estimates</h3>
              <p className="text-slate-400 text-sm">
                Advanced AI analyzes every bet and calculates true probabilities
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center" data-testid="feature-track">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center mb-6 mx-auto">
                <BarChart3 className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Win % and Kelly sizing per leg</h3>
              <p className="text-slate-400 text-sm">
                Get optimal stake sizes and individual leg probabilities
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-8 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400 text-sm mb-2">© 2025 BetrSlip. AI Bet Slip Companion.</p>
          <p className="text-slate-500 text-xs">
            No spam. You'll only hear from us when the live version is ready. Or we have big updates.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
