import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Flame, Target, Clock, ChevronDown, ChevronUp, Zap, Lock, Crown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DailyPicks = ({ usage, onSubscribe }) => {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPick, setExpandedPick] = useState(null);

  // Check if user can view picks - only after usage is loaded
  // usage.analyses_used is the count of analyses used
  // usage.free_limit is 5
  // Show picks while loading usage, or if subscribed, or if under free limit
  const isLockedOut = usage && !usage.is_subscribed && usage.analyses_used >= (usage.free_limit || 5);

  useEffect(() => {
    fetchDailyPicks();
  }, []);

  const fetchDailyPicks = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/daily-picks`);
      const fetchedPicks = response.data.picks || [];
      setPicks(fetchedPicks);
    } catch (error) {
      console.error('Error fetching daily picks:', error);
      // Keep picks empty on error, don't crash
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (prob) => {
    if (prob >= 70) return 'text-emerald-400';
    if (prob >= 55) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getProbabilityBg = (prob) => {
    if (prob >= 70) return 'bg-emerald-500/20 border-emerald-500/30';
    if (prob >= 55) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-orange-500/20 border-orange-500/30';
  };

  const getSportEmoji = (sport) => {
    const emojis = {
      'NFL': '🏈',
      'NBA': '🏀',
      'MLB': '⚾',
      'NHL': '🏒',
      'Soccer': '⚽',
      'UFC': '🥊',
      'Tennis': '🎾',
      'Golf': '⛳'
    };
    return emojis[sport] || '🎯';
  };

  if (loading) {
    return (
      <Card className="glass border-violet-500/30 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">Today's Top Picks</h3>
            <p className="text-slate-400 text-xs">Loading picks...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-slate-800 rounded-lg"></div>
          <div className="h-20 bg-slate-800 rounded-lg"></div>
        </div>
      </Card>
    );
  }

  if (picks.length === 0) {
    return null; // Don't show section if no picks
  }

  // Show locked state for users who exhausted free tier
  if (isLockedOut) {
    return (
      <Card className="glass border-yellow-500/30 p-6 mb-6 relative overflow-hidden" data-testid="daily-picks-locked">
        {/* Blurred preview of picks */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900 z-10" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="text-white font-bold text-base">Today's Top Picks</h3>
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold inline-flex items-center">
                  {picks.length} {picks.length === 1 ? 'Pick' : 'Picks'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">AI-analyzed high-value bets for today</p>
            </div>
          </div>
          <Lock className="w-6 h-6 text-yellow-400 flex-shrink-0" />
        </div>

        {/* Blurred picks preview */}
        <div className="space-y-3 filter blur-sm select-none pointer-events-none">
          {picks.slice(0, 2).map((pick, index) => (
            <div
              key={pick.id}
              className={`rounded-lg border ${getProbabilityBg(pick.win_probability)} p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getSportEmoji(pick.sport)}</span>
                    <span className="text-xs text-slate-400 font-medium uppercase">{pick.sport}</span>
                  </div>
                  <h4 className="text-white font-bold text-sm">{pick.title}</h4>
                  <p className="text-slate-300 text-xs mt-1">{pick.description}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${getProbabilityColor(pick.win_probability)}`}>
                    {pick.win_probability}%
                  </div>
                  <p className="text-slate-400 text-xs">Win Prob</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Unlock overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-slate-900/95 border border-yellow-500/30 rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Unlock Daily Picks</h3>
            <p className="text-slate-400 text-sm mb-4">
              Get access to our AI-curated top picks every day with a Pro subscription.
            </p>
            <div className="space-y-2">
              <Button
                onClick={onSubscribe}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
              >
                <Crown className="w-4 h-4 mr-2" />
                Go Pro - $5/month
              </Button>
              <p className="text-slate-500 text-xs">
                Includes unlimited analyses + daily picks
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass border-yellow-500/30 p-6 mb-6" data-testid="daily-picks-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-white font-bold text-base">Today's Top Picks</h3>
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold inline-flex items-center">
                {picks.length} {picks.length === 1 ? 'Pick' : 'Picks'}
              </span>
              {usage?.is_subscribed && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold inline-flex items-center gap-1">
                  <Crown className="w-3 h-3" /> PRO
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">AI-analyzed high-value bets for today</p>
          </div>
        </div>
        <Flame className="w-6 h-6 text-orange-400 animate-pulse flex-shrink-0" />
      </div>

      {/* Picks List */}
      <div className="space-y-3">
        {picks.map((pick, index) => (
          <div
            key={pick.id}
            className={`rounded-lg border ${getProbabilityBg(pick.win_probability)} p-4 transition-all duration-200`}
          >
            {/* Pick Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getSportEmoji(pick.sport)}</span>
                  <span className="text-xs text-slate-400 font-medium uppercase">{pick.sport}</span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-300 text-xs font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> TOP PICK
                    </span>
                  )}
                </div>
                <h4 className="text-white font-bold text-sm sm:text-base">{pick.title}</h4>
                <p className="text-slate-300 text-xs mt-1">{pick.description}</p>
                
                {/* Game Time */}
                {pick.game_time && (
                  <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {pick.game_time}
                  </p>
                )}
              </div>

              {/* Probability Badge */}
              <div className="text-right">
                <div className={`text-2xl font-black ${getProbabilityColor(pick.win_probability)}`}>
                  {pick.win_probability}%
                </div>
                <p className="text-slate-400 text-xs">Win Prob</p>
                <p className="text-white font-semibold text-sm mt-1">{pick.odds}</p>
              </div>
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setExpandedPick(expandedPick === pick.id ? null : pick.id)}
              className="w-full mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-center gap-1 text-slate-400 hover:text-white transition-colors text-xs"
            >
              {expandedPick === pick.id ? (
                <>
                  <span>Hide Details</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>View Analysis</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Expanded Details */}
            {expandedPick === pick.id && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
                {/* Confidence */}
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-violet-400" />
                  <span className="text-slate-400 text-xs">Confidence:</span>
                  <div className="flex gap-0.5">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < pick.confidence ? 'bg-violet-400' : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-violet-400 font-bold text-xs">{pick.confidence}/10</span>
                </div>

                {/* Reasoning */}
                {pick.reasoning && pick.reasoning.length > 0 && (
                  <div>
                    <p className="text-emerald-400 text-xs font-semibold mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Why We Like This
                    </p>
                    <ul className="space-y-1">
                      {pick.reasoning.map((reason, i) => (
                        <li key={i} className="text-slate-300 text-xs flex items-start gap-1">
                          <span className="text-emerald-400">✓</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risk Factors */}
                {pick.risk_factors && pick.risk_factors.length > 0 && (
                  <div>
                    <p className="text-orange-400 text-xs font-semibold mb-1">⚠️ Watch Out For</p>
                    <ul className="space-y-1">
                      {pick.risk_factors.map((risk, i) => (
                        <li key={i} className="text-slate-300 text-xs flex items-start gap-1">
                          <span className="text-orange-400">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-slate-500 text-xs mt-4 text-center">
        Picks are for entertainment purposes. Always bet responsibly.
      </p>
    </Card>
  );
};

export default DailyPicks;
