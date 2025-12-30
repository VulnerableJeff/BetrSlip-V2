import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { TrendingUp, Target, DollarSign, BarChart3 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  if (stats.total_tracked === 0) {
    return (
      <Card className="glass border-violet-500/30 p-6 mb-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            Mark your bets as Won/Lost to track AI accuracy and your performance!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass border-violet-500/30 p-6 mb-6">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-violet-400" />
        Your Performance
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* AI Accuracy */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4 text-violet-400" />
            <p className="text-slate-400 text-xs">AI Accuracy</p>
          </div>
          <p className={`text-2xl font-black ${stats.accuracy_rate >= 60 ? 'text-emerald-400' : 'text-yellow-400'}`}>
            {stats.accuracy_rate}%
          </p>
          <p className="text-slate-500 text-xs mt-1">{stats.total_tracked} tracked</p>
        </div>

        {/* Win Rate */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-slate-400 text-xs">Your Win Rate</p>
          </div>
          <p className={`text-2xl font-black ${stats.win_rate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.win_rate}%
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {stats.bets_won}W-{stats.bets_lost}L
          </p>
        </div>

        {/* Profit/Loss */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-4 h-4 text-violet-400" />
            <p className="text-slate-400 text-xs">Total P/L</p>
          </div>
          <p className={`text-2xl font-black ${stats.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.total_profit >= 0 ? '+' : ''}${stats.total_profit}
          </p>
          <p className="text-slate-500 text-xs mt-1">ROI: {stats.roi}%</p>
        </div>

        {/* Recommendations */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <p className="text-slate-400 text-xs">Followed</p>
          </div>
          <p className="text-2xl font-black text-violet-400">
            {stats.followed_recommendations}
          </p>
          <p className="text-slate-500 text-xs mt-1">Wins on BET</p>
        </div>
      </div>

      {stats.accuracy_rate >= 70 && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
          <p className="text-emerald-400 text-sm font-semibold">
            🎯 BetrSlip AI is {stats.accuracy_rate}% accurate on your bets!
          </p>
        </div>
      )}
    </Card>
  );
};

export default StatsDashboard;
