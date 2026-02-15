import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, TrendingDown, Flame, Crown, Lock, Target, ArrowUpRight, ArrowDownRight, Minus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BACKEND_URL } from '@/config/api';

const StatBox = ({ label, value, sub, color = 'text-white' }) => (
  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
    <p className={`text-xl sm:text-2xl font-black ${color}`}>{value}</p>
    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

const OutcomeIcon = ({ outcome }) => {
  if (outcome === 'won') return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
  if (outcome === 'lost') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
  if (outcome === 'push') return <Minus className="w-4 h-4 text-slate-400" />;
  return <Clock className="w-3.5 h-3.5 text-amber-400" />;
};

const WeeklyLeaderboard = ({ isSubscribed, onSubscribe }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const res = await axios.get(`${BACKEND_URL}/api/weekly-leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-800 rounded w-48" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-800 rounded" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pro gate
  if (!isSubscribed || data?.pro_required) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/80 to-amber-950/20 border-amber-500/20 relative overflow-hidden" data-testid="weekly-leaderboard-pro-gate">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-lg text-white">Pick of the Week</CardTitle>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">PRO</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3 opacity-80" />
            <p className="text-sm font-medium text-white mb-1">Track Our Win Rate</p>
            <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
              See how our Bet of the Day picks perform each week — W/L record, ROI, streaks & more.
            </p>
            {onSubscribe && (
              <Button
                onClick={onSubscribe}
                className="mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-sm"
                size="sm"
              >
                <Crown className="w-3.5 h-3.5 mr-1" /> Unlock - $5/mo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { week, all_time } = data;
  const roiColor = week.roi >= 0 ? 'text-emerald-400' : 'text-red-400';
  const allTimeRoiColor = all_time.roi >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-amber-950/10 border-slate-800 relative overflow-hidden" data-testid="weekly-leaderboard">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Pick of the Week</CardTitle>
              <p className="text-[10px] text-slate-500">Bet of the Day performance tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-semibold">PRO</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* This Week Stats */}
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">This Week</p>
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="Won" value={week.won} color="text-emerald-400" />
            <StatBox label="Lost" value={week.lost} color="text-red-400" />
            <StatBox label="Win %" value={week.win_rate > 0 ? `${week.win_rate}%` : '--'} color={week.win_rate >= 55 ? 'text-emerald-400' : 'text-amber-400'} />
            <StatBox label="ROI" value={`${week.roi >= 0 ? '+' : ''}$${Math.abs(week.roi).toFixed(0)}`} color={roiColor} sub="per $100" />
          </div>
        </div>

        {/* Weekly Picks */}
        {week.picks?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Daily Picks</p>
            <div className="space-y-1.5">
              {week.picks.map((pick, i) => (
                <div
                  key={pick.id || i}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    pick.outcome === 'won' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    pick.outcome === 'lost' ? 'bg-red-500/5 border-red-500/20' :
                    'bg-slate-800/30 border-slate-700/30'
                  }`}
                  data-testid={`leaderboard-pick-${i}`}
                >
                  <OutcomeIcon outcome={pick.outcome} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pick.pick}</p>
                    <p className="text-[10px] text-slate-500">{pick.game} &middot; {pick.sport}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{pick.odds}</p>
                    <p className={`text-[10px] font-semibold ${
                      pick.outcome === 'won' ? 'text-emerald-400' :
                      pick.outcome === 'lost' ? 'text-red-400' :
                      'text-amber-400'
                    }`}>
                      {pick.outcome ? pick.outcome.toUpperCase() : 'PENDING'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {week.picks?.length === 0 && (
          <div className="text-center py-4">
            <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No picks tracked yet this week</p>
            <p className="text-xs text-slate-500 mt-1">Picks are auto-saved from Bet of the Day</p>
          </div>
        )}

        {/* Best Pick of the Week */}
        {week.best_pick && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wide mb-1">Best Pick This Week</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{week.best_pick.pick}</p>
                <p className="text-[10px] text-slate-400">{week.best_pick.game}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">{week.best_pick.odds}</p>
                <p className="text-[10px] text-emerald-400">+{week.best_pick.edge}% edge</p>
              </div>
            </div>
          </div>
        )}

        {/* All-Time Record */}
        <div className="border-t border-slate-800 pt-3">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">All-Time Record</p>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-white font-bold">{all_time.won}W - {all_time.lost}L</span>
              {all_time.total_picks > 0 && (
                <span className={`font-semibold ${all_time.win_rate >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {all_time.win_rate}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {all_time.streak > 0 && (
                <span className="flex items-center gap-1 text-xs">
                  <Flame className={`w-3.5 h-3.5 ${all_time.streak_type === 'won' ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className={all_time.streak_type === 'won' ? 'text-emerald-400' : 'text-red-400'}>
                    {all_time.streak}{all_time.streak_type === 'won' ? 'W' : 'L'}
                  </span>
                </span>
              )}
              <span className={`font-bold ${allTimeRoiColor}`}>
                {all_time.roi >= 0 ? '+' : ''}${Math.abs(all_time.roi).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyLeaderboard;
