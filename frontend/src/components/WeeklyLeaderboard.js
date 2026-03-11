import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, TrendingUp, TrendingDown, Crown, Flame, Medal, Target, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BACKEND_URL } from '@/config/api';

const WeeklyLeaderboard = ({ onLogBet }) => {
  const [leaderboard, setLeaderboard] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch leaderboard (public)
      const lbRes = await axios.get(`${BACKEND_URL}/api/leaderboard/weekly`);
      setLeaderboard(lbRes.data);

      // Fetch user stats (if logged in)
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const statsRes = await axios.get(`${BACKEND_URL}/api/user/betting-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserStats(statsRes.data);
        } catch (e) {
          console.log('Could not fetch user stats');
        }
      }
    } catch (error) {
      console.log('Could not fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-slate-500 font-bold text-sm">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-slate-500/20 to-slate-400/10 border-slate-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-500/30';
    return 'bg-slate-900/30 border-slate-800/50';
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/60 border-slate-800 p-6">
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/60 border-slate-800 overflow-hidden" data-testid="weekly-leaderboard">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-violet-500/10 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Weekly Leaderboard</h3>
              <p className="text-slate-500 text-xs">
                {leaderboard?.week_start} - {leaderboard?.week_end}
              </p>
            </div>
          </div>
          {onLogBet && (
            <Button
              size="sm"
              onClick={onLogBet}
              className="bg-violet-600 hover:bg-violet-700 text-xs"
              data-testid="log-bet-btn"
            >
              <Target className="w-3.5 h-3.5 mr-1" />
              Log Bet
            </Button>
          )}
        </div>
      </div>

      {/* User's Current Rank (if logged in and has stats) */}
      {userStats && userStats.this_week.total_bets > 0 && (
        <div className="p-3 bg-violet-500/10 border-b border-violet-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                <span className="text-violet-400 font-bold text-sm">
                  {userStats.this_week.rank ? `#${userStats.this_week.rank}` : '-'}
                </span>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Your Rank</p>
                <p className="text-slate-400 text-xs">
                  {userStats.this_week.wins}W - {userStats.this_week.losses}L
                  {userStats.this_week.total_bets < 3 && (
                    <span className="text-amber-400 ml-2">
                      ({3 - userStats.this_week.total_bets} more bets to qualify)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${userStats.this_week.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {userStats.this_week.total_profit >= 0 ? '+' : ''}${userStats.this_week.total_profit}
              </p>
              <p className="text-slate-500 text-xs">{userStats.this_week.win_rate}% win rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="divide-y divide-slate-800/50">
        {(!leaderboard?.leaderboard || leaderboard.leaderboard.length === 0) ? (
          <div className="p-8 text-center">
            <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No rankings yet this week</p>
            <p className="text-slate-600 text-sm mt-1">
              Log at least {leaderboard?.min_bets_required || 3} bets to appear on the leaderboard
            </p>
          </div>
        ) : (
          leaderboard.leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`p-3 transition-all hover:bg-slate-800/30 border-l-2 ${getRankBg(entry.rank)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      {entry.display_name}
                      {entry.rank === 1 && <Flame className="w-4 h-4 text-orange-400" />}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {entry.wins}W - {entry.losses}L ({entry.win_rate}%)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold flex items-center gap-1 ${entry.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.total_profit >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {entry.total_profit >= 0 ? '+' : ''}${entry.total_profit}
                  </p>
                  <p className="text-slate-600 text-xs">{entry.roi}% ROI</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-950/50 border-t border-slate-800 text-center">
        <p className="text-slate-600 text-xs">
          Min {leaderboard?.min_bets_required || 3} bets required to qualify • Resets every Monday
        </p>
      </div>
    </Card>
  );
};

export default WeeklyLeaderboard;
