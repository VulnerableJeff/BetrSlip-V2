import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Users, DollarSign, TrendingUp, Activity, 
  PieChart, Target, RefreshCw, ArrowUpRight, ArrowDownRight,
  Calendar, Clock, Trophy, Zap
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
  const [activeTab, setActiveTab] = useState('overview');

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
      setUserGrowth(growthRes.data.data);
      setAnalysesTrend(trendsRes.data.data);
      setTopUsers(usersRes.data.users);
      setSportBreakdown(sportsRes.data.breakdown);
      setFunnel(funnelRes.data.funnel);
      setPicksPerformance(picksRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subValue && <p className="text-slate-500 text-xs mt-1">{subValue}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl ${color.replace('text-', 'bg-')}/20 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{Math.abs(trend)}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const SimpleBarChart = ({ data, dataKey, color }) => {
    const max = Math.max(...data.map(d => d[dataKey] || 0), 1);
    return (
      <div className="flex items-end gap-1 h-32">
        {data.slice(-14).map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div 
              className={`w-full ${color} rounded-t`}
              style={{ height: `${(item[dataKey] / max) * 100}%`, minHeight: item[dataKey] > 0 ? '4px' : '0' }}
            />
            {i % 3 === 0 && (
              <span className="text-[8px] text-slate-500 mt-1 truncate w-full text-center">
                {item.date?.slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-800 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-slate-400 text-sm">Real-time business metrics</p>
        </div>
        <Button 
          onClick={fetchAllData} 
          variant="outline" 
          size="sm"
          className="border-slate-700 text-slate-300"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {['overview', 'users', 'picks', 'revenue'].map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-violet-600' : 'text-slate-400'}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && overview && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={overview.users.total}
              subValue={`+${overview.users.this_week} this week`}
              icon={Users}
              color="text-blue-400"
            />
            <StatCard
              title="Pro Subscribers"
              value={overview.subscriptions.active}
              subValue={`${overview.subscriptions.conversion_rate}% conversion`}
              icon={Crown}
              color="text-yellow-400"
            />
            <StatCard
              title="Monthly Revenue"
              value={`$${overview.revenue.mrr}`}
              subValue={`${overview.revenue.total_transactions} transactions`}
              icon={DollarSign}
              color="text-emerald-400"
            />
            <StatCard
              title="AI Accuracy"
              value={`${overview.ai_performance.accuracy}%`}
              subValue={`Picks: ${overview.ai_performance.picks_record}`}
              icon={Target}
              color="text-violet-400"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Growth Chart */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  User Growth (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={userGrowth} dataKey="users" color="bg-blue-500" />
              </CardContent>
            </Card>

            {/* Analyses Trend Chart */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Analyses Trend (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={analysesTrend} dataKey="analyses" color="bg-emerald-500" />
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-violet-400" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnel.map((stage, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-slate-300">{stage.stage}</div>
                    <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${stage.percentage}%` }}
                      >
                        <span className="text-xs font-bold text-white">{stage.count}</span>
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-slate-400">{stage.percentage}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Users */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Most Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topUsers.map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm text-white">{user.email}</p>
                        <p className="text-xs text-slate-500">{user.analyses_count} analyses</p>
                      </div>
                    </div>
                    {user.is_pro && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">PRO</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sport Breakdown */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Analyses by Sport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sportBreakdown.slice(0, 8).map((sport, i) => {
                  const total = sportBreakdown.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? Math.round((sport.count / total) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-16 text-sm text-slate-300">{sport.sport}</div>
                      <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm text-slate-400">{sport.count}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'picks' && picksPerformance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Performance by Sport */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Picks Performance by Sport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {picksPerformance.by_sport.map((sport, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{sport.sport}</span>
                      <span className={`text-sm font-bold ${sport.win_rate >= 55 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {sport.win_rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400">{sport.won}W</span>
                      <span className="text-slate-500">-</span>
                      <span className="text-red-400">{sport.lost}L</span>
                      <span className="text-slate-500 ml-auto">({sport.total} total)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance by Confidence */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" />
                Win Rate by Confidence Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {picksPerformance.by_confidence.map((conf, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Confidence {conf.confidence_range}</span>
                      <span className={`text-sm font-bold ${conf.win_rate >= 55 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {conf.win_rate}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {conf.won}/{conf.total} picks won
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'revenue' && overview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              title="Monthly Recurring Revenue"
              value={`$${overview.revenue.mrr}`}
              icon={DollarSign}
              color="text-emerald-400"
            />
            <StatCard
              title="Active Subscriptions"
              value={overview.subscriptions.active}
              icon={Users}
              color="text-blue-400"
            />
            <StatCard
              title="Conversion Rate"
              value={`${overview.subscriptions.conversion_rate}%`}
              icon={TrendingUp}
              color="text-violet-400"
            />
          </div>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Revenue Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-400 font-medium mb-1">💰 Revenue Summary</p>
                  <p className="text-slate-300 text-sm">
                    {overview.subscriptions.active} Pro subscribers × $5/month = ${overview.revenue.mrr} MRR
                  </p>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 font-medium mb-1">📈 Growth Potential</p>
                  <p className="text-slate-300 text-sm">
                    {overview.users.total - overview.subscriptions.active} free users could convert to {' '}
                    ${(overview.users.total - overview.subscriptions.active) * 5}/month potential
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Crown icon component since it might not be imported
const Crown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 17l3-7 4 4 3-9 3 9 4-4 3 7H2z" />
    <path d="M2 17h20v4H2z" />
  </svg>
);

export default AdminAnalytics;
