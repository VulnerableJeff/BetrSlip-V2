import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, Upload, BarChart3, CheckCircle2 } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/186076/pexels-photo-186076.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tighter"
              data-testid="hero-title"
            >
              Know Your Odds.
              <br />
              <span className="text-brand-win">Win Smarter.</span>
            </h1>
            <p
              className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8"
              data-testid="hero-description"
            >
              Upload your betting slips from DraftKings, Hard Rock, or any sportsbook.
              Get AI-powered probability analysis in seconds.
            </p>
            <Button
              data-testid="get-started-btn"
              size="lg"
              className="bg-brand-win hover:bg-emerald-600 text-brand-dark font-bold text-lg px-8 py-6 rounded-sm hover:scale-105 transition-transform duration-200"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-brand-dark to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl sm:text-4xl font-black text-white text-center mb-16"
            data-testid="features-title"
          >
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div
              className="glass rounded-sm p-8 hover:border-emerald-500/50 transition-colors duration-300"
              data-testid="feature-upload"
            >
              <div className="w-14 h-14 rounded-sm bg-brand-win/10 flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-brand-win" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">1. Upload Your Slip</h3>
              <p className="text-slate-400">
                Take a screenshot of your bet slip from any sportsbook app and upload it.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="glass rounded-sm p-8 hover:border-emerald-500/50 transition-colors duration-300"
              data-testid="feature-analyze"
            >
              <div className="w-14 h-14 rounded-sm bg-brand-win/10 flex items-center justify-center mb-6">
                <BarChart3 className="w-8 h-8 text-brand-win" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">2. AI Analysis</h3>
              <p className="text-slate-400">
                Our AI analyzes your bets, odds, and provides a realistic win probability.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="glass rounded-sm p-8 hover:border-emerald-500/50 transition-colors duration-300"
              data-testid="feature-track"
            >
              <div className="w-14 h-14 rounded-sm bg-brand-win/10 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-brand-win" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">3. Track History</h3>
              <p className="text-slate-400">
                Keep track of all your analyzed bets and see patterns in your betting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
                Join Smart Bettors
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-brand-win flex-shrink-0 mt-1" />
                  <p className="text-slate-300">AI-powered probability analysis</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-brand-win flex-shrink-0 mt-1" />
                  <p className="text-slate-300">Support for all major sportsbooks</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-brand-win flex-shrink-0 mt-1" />
                  <p className="text-slate-300">Track your betting history</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-brand-win flex-shrink-0 mt-1" />
                  <p className="text-slate-300">Free to use</p>
                </div>
              </div>
              <Button
                data-testid="cta-signup-btn"
                size="lg"
                className="mt-8 bg-brand-win hover:bg-emerald-600 text-brand-dark font-bold rounded-sm hover:scale-105 transition-transform duration-200"
                onClick={() => navigate('/auth')}
              >
                Start Analyzing Now
              </Button>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/1267295/pexels-photo-1267295.jpeg"
                alt="Sports fans celebrating"
                className="rounded-sm shadow-2xl"
                data-testid="social-proof-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-card py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>© 2025 BetAnalyzer. Analyze smarter, bet better.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
