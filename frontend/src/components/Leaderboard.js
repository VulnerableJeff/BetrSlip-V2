import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Crown, TrendingUp, Medal } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Leaderboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/leaderboard`);
        setData(res.data.leaderboard || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs text-slate-500 font-mono w-4 text-center">{rank}</span>;
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-800 rounded w-32" />
            {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">Leaderboard</CardTitle>
            <p className="text-xs text-slate-400">Top performers by win rate (min. 3 bets)</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No qualifying players yet</p>
            <p className="text-xs text-slate-500">Track at least 3 bets to appear</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center gap-3 py-1.5 px-2 text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
              <span className="w-4" />
              <span className="flex-1">Player</span>
              <span className="w-16 text-center">Record</span>
              <span className="w-16 text-center">Win Rate</span>
            </div>
            {data.map((player, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors ${
                  player.rank <= 3 ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
              >
                {getRankBadge(player.rank)}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-white font-medium">{player.user}</span>
                  {player.is_pro && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold">PRO</span>
                  )}
                </div>
                <span className="w-16 text-center text-xs text-slate-400">
                  {player.wins}W-{player.losses}L
                </span>
                <div className="w-16 text-center">
                  <span className={`text-sm font-bold ${
                    player.win_rate >= 60 ? 'text-emerald-400' : player.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {player.win_rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
