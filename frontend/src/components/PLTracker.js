import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, BarChart3, Crosshair } from 'lucide-react';

import { BACKEND_URL } from '@/config/api';

const PLTracker = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('betrslip_token');
        const res = await axios.get(`${BACKEND_URL}/api/performance/my-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching P/L:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-800 rounded w-32" />
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded" />)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_bets === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg text-white">P/L Tracker</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-4">No tracked bets yet. Analyze a bet slip and mark it as won/lost to start tracking.</p>
        </CardContent>
      </Card>
    );
  }

  const isPositive = stats.cumulative_pl >= 0;

  return (
    <Card className="bg-slate-900/50 border-slate-800" data-testid="pl-tracker">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">P/L Tracker</CardTitle>
            <p className="text-xs text-slate-400">Performance & CLV analytics</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main P/L Display */}
        <div className="text-center py-2">
          <p className={`text-3xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{stats.cumulative_pl.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Cumulative P/L</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Target className="w-3 h-3 text-violet-400" />
              <span className="text-xs text-slate-400">Win Rate</span>
            </div>
            <p className="text-base font-bold text-white">{stats.win_rate}%</p>
            <p className="text-[10px] text-slate-500">{stats.wins}W-{stats.losses}L</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {stats.roi >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
              <span className="text-xs text-slate-400">ROI</span>
            </div>
            <p className={`text-base font-bold ${stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.roi}%</p>
            <p className="text-[10px] text-slate-500">${stats.total_staked} staked</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Crosshair className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-slate-400">CLV</span>
            </div>
            <p className={`text-base font-bold ${stats.avg_clv >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.avg_clv > 0 ? '+' : ''}{stats.avg_clv}%
            </p>
            <p className="text-[10px] text-slate-500">{stats.clv_bets_tracked || 0} tracked</p>
          </div>
        </div>

        {/* AI Accuracy */}
        <div className="bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20 rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">AI Accuracy</span>
          <span className="text-sm font-bold text-violet-400">{stats.ai_accuracy}%</span>
        </div>

        {/* CLV Explanation */}
        {stats.avg_clv !== 0 && (
          <p className="text-[10px] text-slate-500 text-center">
            CLV (Closing Line Value): {stats.avg_clv > 0 
              ? 'You\'re beating closing lines - strong edge indicator' 
              : 'Lines moved against you - look for earlier entry points'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PLTracker;
