import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Percent, BarChart3 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PLTracker = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/performance/my-stats`, { headers });
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-40" />
            <div className="h-32 bg-slate-800 rounded" />
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
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <CardTitle className="text-lg text-white">Performance Tracker</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">Mark your bet outcomes on the History page to start tracking performance.</p>
        </CardContent>
      </Card>
    );
  }

  const isPositive = stats.cumulative_pl >= 0;
  const chartData = stats.pl_chart || [];

  // Simple SVG chart
  const chartW = 540;
  const chartH = 120;
  const padding = { top: 10, bottom: 20, left: 0, right: 0 };
  const plotW = chartW - padding.left - padding.right;
  const plotH = chartH - padding.top - padding.bottom;

  let minPL = Math.min(0, ...chartData.map(d => d.pl));
  let maxPL = Math.max(0, ...chartData.map(d => d.pl));
  const range = maxPL - minPL || 1;

  const points = chartData.map((d, i) => {
    const x = padding.left + (i / Math.max(1, chartData.length - 1)) * plotW;
    const y = padding.top + plotH - ((d.pl - minPL) / range) * plotH;
    return { x, y, ...d };
  });

  const zeroY = padding.top + plotH - ((0 - minPL) / range) * plotH;
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length-1]?.x || 0},${zeroY} L${points[0]?.x || 0},${zeroY} Z`;

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <CardTitle className="text-lg text-white">Performance Tracker</CardTitle>
          </div>
          <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isPositive ? '+' : ''}{stats.roi}% ROI
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="P/L" value={`${isPositive ? '+' : ''}$${stats.cumulative_pl}`} icon={DollarSign} color={isPositive ? 'emerald' : 'red'} />
          <StatCard label="Win Rate" value={`${stats.win_rate}%`} icon={Target} color="violet" />
          <StatCard label="Record" value={`${stats.wins}W-${stats.losses}L`} icon={Award} color="blue" />
          <StatCard label="AI Accuracy" value={`${stats.ai_accuracy}%`} icon={Percent} color="amber" />
        </div>

        {/* P/L Chart */}
        {chartData.length > 1 && (
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-2">Cumulative P/L</p>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
              {/* Zero line */}
              <line x1={padding.left} y1={zeroY} x2={chartW - padding.right} y2={zeroY} stroke="#334155" strokeWidth="0.5" strokeDasharray="4,4" />
              {/* Area fill */}
              <path d={areaPath} fill={isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'} />
              {/* Line */}
              <path d={linePath} fill="none" stroke={isPositive ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinecap="round" />
              {/* Data points */}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={p.outcome === 'won' ? '#10b981' : p.outcome === 'lost' ? '#ef4444' : '#eab308'} stroke="#0f172a" strokeWidth="1.5" />
              ))}
              {/* End label */}
              {points.length > 0 && (
                <text x={points[points.length-1].x} y={points[points.length-1].y - 8} textAnchor="end" className="text-[10px]" fill={isPositive ? '#10b981' : '#ef4444'}>
                  {isPositive ? '+' : ''}${stats.cumulative_pl}
                </text>
              )}
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    red: 'text-red-400 bg-red-400/10',
    violet: 'text-violet-400 bg-violet-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
  };
  return (
    <div className="bg-slate-800/50 rounded-lg p-2.5">
      <div className={`w-6 h-6 rounded-md ${colors[color]} flex items-center justify-center mb-1.5`}>
        <Icon className="w-3 h-3" />
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
};

export default PLTracker;
