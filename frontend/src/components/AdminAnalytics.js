import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Users, DollarSign, TrendingUp, Activity, 
  PieChart, Target, RefreshCw, ArrowUpRight, ArrowDownRight,
  Crown, Zap, Trophy, Eye, UserPlus, CreditCard
} from 'lucide-react';

import { BACKEND_URL } from '@/config/api';

const AdminAnalytics = () => {
  const [overview, setOverview] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [analysesTrend, setAnalysesTrend] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [sportBreakdown, setSportBreakdown] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [picksPerformance, setPicksPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, growthRes, trendsRes, usersRes, sportsRes, funnelRes, picksRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/analytics/overview`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/user-growth?days=30`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/analyses-trend?days=30`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/top-users?limit=10`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/sport-breakdown`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/funnel`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/analytics/picks-performance`, { headers })
      ]);

      setOverview(overviewRes.data);
      setUserGrowth(growthRes.data.data || []);
      setAnalysesTrend(trendsRes.data.data || []);
      setTopUsers(usersRes.data.users || []);
      setSportBreakdown(sportsRes.data.breakdown || []);
      setFunnel(funnelRes.data.funnel || []);
      setPicksPerformance(picksRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MiniBarChart = ({ data, dataKey, color, height = 100 }) => {
    const values = data.map(d => d[dataKey] || 0);
    const max = Math.max(...values, 1);
    const recent = data.slice(-21);
    
    return (
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {recent.map((item, i) => {
          const val = item[dataKey] || 0;
          const h = (val / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div 
                className={`w-full rounded-sm ${color} transition-all duration-200 group-hover:opacity-80`}
                style={{ height: `${Math.max(h, val > 0 ? 4 : 0)}%` }}
              />
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-slate-700">
                {item.date?.slice(5)}: {val}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const funnelColors = [
    'from-blue-500 to-blue-400',
    'from-violet-500 to-violet-400',
    'from-amber-500 to-amber-400',
    'from-emerald-500 to-emerald-400',
  ];

  const funnelIcons = [UserPlus, Eye, Activity, CreditCard];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-800/60 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-56 bg-slate-800/60 rounded-xl" />
            <div className="h-56 bg-slate-800/60 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-analytics">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-slate-400 text-xs font-medium mb-1">Total Users</p>
            <p className="text-3xl font-black text-white">{overview.users.total}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                +{overview.users.this_week}
              </span>
              <span className="text-slate-500 text-xs">this week</span>
            </div>
          </CardContent>
        </Card>

        {/* Pro Subscribers */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border-yellow-500/20 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-slate-400 text-xs font-medium mb-1">Pro Members</p>
            <p className="text-3xl font-black text-yellow-400">{overview.subscriptions.active}</p>
            <div className="mt-2">
              <span className="text-yellow-400/80 text-xs font-semibold">{overview.subscriptions.conversion_rate}% conversion</span>
            </div>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-xs font-medium mb-1">Monthly Revenue</p>
            <p className="text-3xl font-black text-emerald-400">${overview.revenue.mrr}</p>
            <div className="mt-2">
              <span className="text-slate-500 text-xs">{overview.revenue.total_transactions} transactions</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Accuracy */}
        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute top-3 right-3 w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-slate-400 text-xs font-medium mb-1">AI Accuracy</p>
            <p className="text-3xl font-black text-violet-400">{overview.ai_performance.accuracy}%</p>
            <div className="mt-2">
              <span className="text-slate-500 text-xs">Record: {overview.ai_performance.picks_record}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Funnel Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Growth Chart */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-1">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              User Signups
              <span className="text-slate-500 text-xs font-normal ml-auto">30d</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {userGrowth.length > 0 ? (
              <MiniBarChart data={userGrowth} dataKey="users" color="bg-blue-500" />
            ) : (
              <div className="h-[100px] flex items-center justify-center text-slate-600 text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Analyses Trend Chart */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-1">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Bet Analyses
              <span className="text-slate-500 text-xs font-normal ml-auto">30d</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {analysesTrend.length > 0 ? (
              <MiniBarChart data={analysesTrend} dataKey="analyses" color="bg-emerald-500" />
            ) : (
              <div className="h-[100px] flex items-center justify-center text-slate-600 text-xs">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-1">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-violet-400" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {funnel.map((stage, i) => {
                const FunnelIcon = funnelIcons[i] || Activity;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${funnelColors[i] || 'from-slate-500 to-slate-400'} flex items-center justify-center flex-shrink-0`}>
                      <FunnelIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-300 truncate">{stage.stage}</span>
                        <span className="text-xs text-white font-bold ml-2">{stage.count}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${funnelColors[i] || 'from-slate-500 to-slate-400'}`}
                          style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 w-8 text-right flex-shrink-0">{stage.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Users + Sports + Picks Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Users */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1.5">
              {topUsers.length > 0 ? topUsers.slice(0, 8).map((user, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-slate-400/20 text-slate-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-800 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{user.analyses_count}</span>
                  {user.is_pro && (
                    <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                  )}
                </div>
              )) : (
                <p className="text-slate-600 text-xs text-center py-4">No user activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sport Breakdown */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Analyses by Sport
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {sportBreakdown.length > 0 ? (
              <div className="space-y-2">
                {sportBreakdown.slice(0, 6).map((sport, i) => {
                  const total = sportBreakdown.reduce((sum, s) => sum + s.count, 0);
                  const pct = total > 0 ? Math.round((sport.count / total) * 100) : 0;
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-yellow-500', 'bg-red-500', 'bg-orange-500'];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300">{sport.sport}</span>
                        <span className="text-xs text-slate-400 font-mono">{sport.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 text-xs text-center py-4">No sport data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Picks Performance */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              Picks Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {picksPerformance?.by_sport?.length > 0 ? (
              <div className="space-y-2">
                {picksPerformance.by_sport.map((sport, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium">{sport.sport}</p>
                      <p className="text-[10px] text-slate-500">{sport.won}W - {sport.lost}L ({sport.total} total)</p>
                    </div>
                    <span className={`text-sm font-black ${
                      sport.win_rate >= 60 ? 'text-emerald-400' :
                      sport.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {sport.win_rate}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-xs text-center py-4">No picks resolved yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Insights */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Revenue Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <p className="text-emerald-400 text-xs font-bold">Current MRR</p>
              </div>
              <p className="text-white text-xl font-black">${overview.revenue.mrr}/mo</p>
              <p className="text-slate-500 text-xs mt-1">
                {overview.subscriptions.active} Pro × $5/month
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <p className="text-blue-400 text-xs font-bold">Growth Potential</p>
              </div>
              <p className="text-white text-xl font-black">
                ${(overview.users.total - overview.subscriptions.active) * 5}/mo
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {overview.users.total - overview.subscriptions.active} free users could convert
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
