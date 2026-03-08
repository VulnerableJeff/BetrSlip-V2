import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Minus, TrendingUp, Flame, Trophy, ArrowLeft, Crown, Target, BarChart3, Calendar } from 'lucide-react';

import { BACKEND_URL } from '@/config/api';

const PublicResults = () => {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/picks-performance`);
        setPerformance(res.data);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { won = 0, lost = 0, push = 0, win_rate = 0, current_streak = 0, streak_type = '', recent_picks = [] } = performance || {};
  const total = won + lost + push;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white px-3 py-1 rounded-lg font-black text-lg cursor-pointer" onClick={() => navigate('/')}>
              BetrSlip
            </div>
          </div>
          <Button
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm"
            data-testid="results-signup-btn"
          >
            <Crown className="w-4 h-4 mr-1" /> Try Free
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3" data-testid="results-title">
            Verified AI Pick Results
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            100% transparent. Every pick tracked. No deleted losses. See exactly how our AI performs.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Card className="bg-emerald-500/10 border-emerald-500/20 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-emerald-400">{won}</p>
            <p className="text-slate-400 text-xs">Wins</p>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20 p-4 text-center">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-400">{lost}</p>
            <p className="text-slate-400 text-xs">Losses</p>
          </Card>
          <Card className="bg-violet-500/10 border-violet-500/20 p-4 text-center">
            <Target className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-violet-400">{win_rate}%</p>
            <p className="text-slate-400 text-xs">Win Rate</p>
          </Card>
          <Card className={`p-4 text-center ${current_streak >= 3 && streak_type === 'won' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
            {current_streak >= 3 && streak_type === 'won' ? (
              <Flame className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            ) : (
              <TrendingUp className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            )}
            <p className={`text-2xl font-black ${current_streak >= 3 && streak_type === 'won' ? 'text-yellow-400' : 'text-white'}`}>
              {current_streak}
            </p>
            <p className="text-slate-400 text-xs">
              {streak_type === 'won' ? 'Win Streak' : streak_type === 'lost' ? 'Loss Streak' : 'Streak'}
            </p>
          </Card>
        </div>

        {/* Win Rate Visual */}
        {total > 0 && (
          <Card className="bg-slate-900/60 border-slate-800 p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold text-sm">Overall Record</p>
              <p className="text-slate-400 text-xs">{won}W - {lost}L {push > 0 ? `- ${push}P` : ''} ({total} total)</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden flex">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(won / total) * 100}%` }} />
              {push > 0 && <div className="bg-slate-500 h-full transition-all" style={{ width: `${(push / total) * 100}%` }} />}
              <div className="bg-red-500/50 h-full transition-all" style={{ width: `${(lost / total) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-emerald-400">{total > 0 ? Math.round((won / total) * 100) : 0}% wins</span>
              <span className="text-red-400/70">{total > 0 ? Math.round((lost / total) * 100) : 0}% losses</span>
            </div>
          </Card>
        )}

        {/* Recent Picks */}
        <div className="mb-8">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            Recent Picks
          </h2>
          {recent_picks.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-800 p-8 text-center">
              <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No resolved picks yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recent_picks.map((pick, i) => (
                <Card key={i} className={`border p-4 transition-all ${
                  pick.outcome === 'won' ? 'bg-emerald-500/5 border-emerald-500/20' :
                  pick.outcome === 'lost' ? 'bg-red-500/5 border-red-500/20' :
                  'bg-slate-800/50 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        pick.outcome === 'won' ? 'bg-emerald-500/20' :
                        pick.outcome === 'lost' ? 'bg-red-500/20' :
                        'bg-slate-700'
                      }`}>
                        {pick.outcome === 'won' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                         pick.outcome === 'lost' ? <XCircle className="w-4 h-4 text-red-400" /> :
                         <Minus className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-sm truncate">{pick.pick_title || pick.title}</p>
                        <p className="text-slate-500 text-xs">{pick.sport} • {pick.odds}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-bold ${
                        pick.outcome === 'won' ? 'text-emerald-400' :
                        pick.outcome === 'lost' ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {pick.outcome === 'won' ? 'WIN' : pick.outcome === 'lost' ? 'LOSS' : 'PUSH'}
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        {pick.win_probability}% prob
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 p-6 text-center">
          <Trophy className="w-8 h-8 text-violet-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-2">Get These Picks Daily</h3>
          <p className="text-slate-400 text-sm mb-4">
            Pro members get 3 AI-curated picks every day + unlimited bet slip analyses
          </p>
          <Button
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold px-8 py-6"
            data-testid="results-cta-btn"
          >
            Start Free — 5 Analyses
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default PublicResults;
