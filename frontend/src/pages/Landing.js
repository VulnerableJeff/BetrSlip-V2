import { useNavigate } from 'react-router-dom';
import { TrendingUp, Zap, Trophy, ShieldCheck, BarChart3, Users, ArrowRight, CheckCircle2, Crown, Flame, Target, Share2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GlassCard = ({ children, className = '', ...props }) => (
  <div className={`bg-slate-900/60 border border-slate-800 backdrop-blur-md ${className}`} {...props}>
    {children}
  </div>
);

const ConfidenceRing = ({ score }) => {
  const r = 40, s = 5, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth={s} />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={s}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="50" y="54" textAnchor="middle" className="fill-white text-2xl font-black" transform="rotate(90 50 50)">{score}</text>
    </svg>
  );
};

const TickerBar = () => {
  const items = [
    'NBA: 67% WIN RATE THIS WEEK',
    'NCAAB TOP PICK HIT +240',
    'AI PARLAY CASHED +167',
    '3-GAME WIN STREAK ACTIVE',
    'NHL UNDERDOG PICK WON',
    'FADING PUBLIC: 5-2 RECORD',
    'TODAY: 85 CONFIDENCE SCORE',
    'DAILY PICKS UPDATED LIVE',
  ];
  return (
    <div className="overflow-hidden bg-slate-950 border-y border-slate-800 py-3">
      <div className="flex animate-[scroll_30s_linear_infinite] whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="mx-8 text-xs font-bold tracking-widest uppercase">
            <span className="text-emerald-400 mr-2">///</span>
            <span className="text-slate-300">{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const goAuth = () => navigate('/auth');

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="landing-page">
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* STICKY NAV */}
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-emerald-400 tracking-tight">BetrSlip</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-900/50 text-violet-400 border border-violet-800">AI-POWERED</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goAuth} className="text-slate-300 hover:text-white font-bold uppercase tracking-wide text-sm" data-testid="nav-login">
              Log In
            </Button>
            <button onClick={goAuth} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold uppercase tracking-wide px-5 py-2 text-sm transition-all hover:scale-105" style={{ transform: 'skewX(-8deg)' }} data-testid="nav-signup">
              <span style={{ display: 'inline-block', transform: 'skewX(8deg)' }}>Get Started</span>
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-slate-950/95 to-slate-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-900/50 text-red-400 border border-red-800 mb-6 animate-pulse" data-testid="live-badge">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2" />
                LIVE ODDS UPDATED
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] mb-6" data-testid="hero-headline">
                Beat the Books<br />
                <span className="text-emerald-400">With AI</span>
              </h1>
              <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-400 max-w-lg mb-8">
                Data-driven picks, real-time odds scanning, and a confidence score that tells you exactly when to bet. Stop guessing. Start winning.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={goAuth} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold uppercase tracking-wide px-8 py-4 text-base transition-all hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]" style={{ transform: 'skewX(-8deg)' }} data-testid="hero-cta">
                  <span className="flex items-center gap-2" style={{ display: 'inline-flex', transform: 'skewX(8deg)' }}>
                    Start Winning <ArrowRight className="w-5 h-5" />
                  </span>
                </button>
                <button onClick={goAuth} className="border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wide px-8 py-4 text-base transition-colors" style={{ transform: 'skewX(-8deg)' }} data-testid="hero-cta-secondary">
                  <span style={{ display: 'inline-flex', transform: 'skewX(8deg)' }}>See Today's Picks</span>
                </button>
              </div>
            </div>

            {/* Right: Mock Bet of the Day Card */}
            <div className="hidden lg:block">
              <GlassCard className="p-6 rounded-none border-emerald-500/20 relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-violet-500 to-orange-500" />
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Bet of the Day</p>
                    <p className="text-[10px] text-slate-500">Updated daily with live odds</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <ConfidenceRing score={85} />
                  <div>
                    <div className="flex gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold uppercase">NBA</span>
                      <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px]">Moneyline</span>
                    </div>
                    <p className="text-xl font-black text-white mb-1">Lakers ML</p>
                    <p className="text-xs text-slate-400 mb-3">Mavericks @ Lakers</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-bold text-emerald-400">-180</span>
                      <span className="bg-slate-800/60 rounded-full px-3 py-1 text-xs font-bold text-amber-400">64.2% win</span>
                      <span className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs font-bold text-amber-400">+5.3% edge</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-violet-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Significant 5.3% edge over market consensus</span>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <TickerBar />

      {/* FEATURES BENTO */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-3">FEATURES</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-4">Your Unfair Advantage</h2>
          <p className="text-base font-medium text-slate-400 max-w-2xl mb-12">
            Every tool you need to find value, track performance, and make smarter bets — powered by real-time odds data from 10+ sportsbooks.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="features-grid">
            {/* Bet of the Day - Large */}
            <GlassCard className="md:col-span-2 p-8 group hover:border-emerald-500/50 transition-all duration-300" data-testid="feature-bet-of-day">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-orange-400">Bet of the Day</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-900/50 text-red-400 animate-pulse">LIVE</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">One Pick. Maximum Confidence.</h3>
              <p className="text-base font-medium text-slate-400 mb-6">
                Our AI scans every game across NBA, NHL, NCAAB & NFL, comparing odds from 10+ books to find the single highest-confidence play. Complete with a visual confidence meter and detailed reasoning.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1.5 bg-slate-800 rounded text-xs text-emerald-400 font-semibold">Confidence Meter 0-100</span>
                <span className="px-3 py-1.5 bg-slate-800 rounded text-xs text-violet-400 font-semibold">Win Probability %</span>
                <span className="px-3 py-1.5 bg-slate-800 rounded text-xs text-amber-400 font-semibold">Edge Analysis</span>
                <span className="px-3 py-1.5 bg-slate-800 rounded text-xs text-red-400 font-semibold">Fading the Public</span>
              </div>
            </GlassCard>

            {/* Pick of the Week */}
            <GlassCard className="p-8 group hover:border-amber-500/50 transition-all duration-300" data-testid="feature-leaderboard">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-amber-400">Leaderboard</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Pick of the Week</h3>
              <p className="text-sm text-slate-400 mb-4">
                Track our Bet of the Day performance over time. Win/loss record, ROI, streaks — full transparency.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Weekly W/L</span><span className="text-emerald-400 font-bold">4-1</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">ROI</span><span className="text-emerald-400 font-bold">+$340</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Streak</span><span className="text-amber-400 font-bold">3W</span></div>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-900/50 text-amber-400 border border-amber-800">PRO FEATURE</span>
              </div>
            </GlassCard>

            {/* AI Parlay Picks */}
            <GlassCard className="p-8 group hover:border-violet-500/50 transition-all duration-300" data-testid="feature-parlay">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-violet-400">AI Parlays</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Smart 2-Leg Parlays</h3>
              <p className="text-sm text-slate-400">
                AI builds optimized parlays from live odds. Each comes with combined probability and expected value.
              </p>
            </GlassCard>

            {/* Best Value Bets */}
            <GlassCard className="p-8 group hover:border-emerald-500/50 transition-all duration-300" data-testid="feature-ev">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">EV Scanner</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Find +EV Bets</h3>
              <p className="text-sm text-slate-400">
                Scans odds across sportsbooks to find bets where the true probability is in your favor. Think of it as finding a sale.
              </p>
            </GlassCard>

            {/* Share */}
            <GlassCard className="p-8 group hover:border-slate-600 transition-all duration-300" data-testid="feature-share">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Social</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Share Your Picks</h3>
              <p className="text-sm text-slate-400">
                One-tap share your daily picks and bet slips with friends. Copy or use native share on mobile.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FADING THE PUBLIC */}
      <section className="py-16 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-red-400" />
                <span className="text-sm font-bold uppercase tracking-widest text-red-400">NEW: FADING THE PUBLIC</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight uppercase mb-4">
                The Public Loses.<br />We Show You <span className="text-red-400">Why.</span>
              </h2>
              <p className="text-base text-slate-400 mb-6 leading-relaxed">
                Most bettors follow the crowd. Our "Fading the Public" indicator flags picks that go against heavy public action — historically one of the most profitable contrarian strategies in sports betting.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> FADING PUBLIC
                </span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-400">
                  Underdog picks that hit
                </span>
                <span className="bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-xs font-bold text-amber-400">
                  Sharp money detector
                </span>
              </div>
            </div>
            <GlassCard className="p-6 rounded-none">
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-4">RECENT FADE PICKS</p>
              {[
                { pick: 'Celtics +3.5', result: 'WON', odds: '+105', edge: '+4.2%' },
                { pick: 'Under 215.5', result: 'WON', odds: '-110', edge: '+3.1%' },
                { pick: 'Avalanche ML', result: 'WON', odds: '+140', edge: '+5.8%' },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-white">{p.pick}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">{p.odds}</span>
                    <span className="text-emerald-400 font-bold">{p.edge}</span>
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">{p.result}</span>
                  </div>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-400 mb-3">HOW IT WORKS</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-16">Three Steps to Smarter Bets</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10', step: '01', title: 'We Scan', desc: 'Our AI analyzes odds from 10+ sportsbooks in real-time, finding edges the market missed.' },
              { icon: Target, color: 'text-violet-400', bg: 'bg-violet-500/10', step: '02', title: 'We Score', desc: 'Every opportunity gets a confidence score (0-100), win probability, and EV calculation.' },
              { icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', step: '03', title: 'You Win', desc: 'Get the Bet of the Day, AI parlays, and value bets delivered — all backed by data.' },
            ].map((s, i) => (
              <div key={i} className="text-left">
                <div className={`w-14 h-14 ${s.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <s.icon className={`w-7 h-7 ${s.color}`} />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-600 mb-2">{s.step}</p>
                <h3 className="text-2xl font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 md:py-32 border-t border-slate-800" data-testid="pricing-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-3">PRICING</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-4">Start Free. Go Pro.</h2>
            <p className="text-base text-slate-400">No credit card required. Upgrade anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <GlassCard className="p-8 rounded-none">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">FREE</p>
              <p className="text-4xl font-black text-white mb-1">$0</p>
              <p className="text-xs text-slate-500 mb-6">Forever free</p>
              <div className="space-y-3 mb-8">
                {['Bet of the Day', 'AI Parlay Picks', 'Best Value Bets Scanner', '3 Daily Analyses', 'USA Sports Hub'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0" />{f}
                  </div>
                ))}
              </div>
              <button onClick={goAuth} className="w-full border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wide px-6 py-3 text-sm transition-colors" style={{ transform: 'skewX(-8deg)' }}>
                <span style={{ display: 'inline-block', transform: 'skewX(8deg)' }}>Get Started Free</span>
              </button>
            </GlassCard>

            {/* Pro */}
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-emerald-500/50 to-emerald-500/0 rounded-none" />
              <GlassCard className="relative p-8 rounded-none border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">PRO</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/50 text-emerald-400 border border-emerald-800">BEST VALUE</span>
                </div>
                <p className="text-4xl font-black text-white mb-1">$5<span className="text-lg text-slate-400 font-medium">/mo</span></p>
                <p className="text-xs text-slate-500 mb-6">Cancel anytime</p>
                <div className="space-y-3 mb-8">
                  {[
                    'Everything in Free',
                    'Pick of the Week Leaderboard',
                    'Fading the Public Indicators',
                    'Today\'s Top Picks (AI-Generated)',
                    'Unlimited Analyses',
                    'Priority AI Chat Support',
                    'Share Picks Feature',
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />{f}
                    </div>
                  ))}
                </div>
                <button onClick={goAuth} className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold uppercase tracking-wide px-6 py-3 text-sm transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)]" style={{ transform: 'skewX(-8deg)' }}>
                  <span className="flex items-center justify-center gap-2" style={{ display: 'inline-flex', transform: 'skewX(8deg)' }}>
                    <Crown className="w-4 h-4" /> Go Pro Now
                  </span>
                </button>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/20 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            Stop Guessing.<br /><span className="text-emerald-400">Start Winning.</span>
          </h2>
          <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
            Join thousands of bettors using AI-powered data to find value, track performance, and make smarter plays.
          </p>
          <button onClick={goAuth} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold uppercase tracking-wide px-10 py-5 text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.4)]" style={{ transform: 'skewX(-8deg)' }} data-testid="final-cta">
            <span className="flex items-center gap-2" style={{ display: 'inline-flex', transform: 'skewX(8deg)' }}>
              Create Free Account <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-500">BetrSlip</span>
            <span className="text-xs text-slate-600">Made for Winners</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4" />
            <span>Responsible Gambling</span>
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </footer>

      {/* Ticker animation keyframe */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
