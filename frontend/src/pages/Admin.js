import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Users, Ban, CheckCircle, BarChart3, DollarSign, Shield, ArrowLeft, RefreshCw,
  Search, Eye, Gift, Trash2, Download, Crown, Clock, Activity,
  ChevronDown, ChevronUp, X, TrendingUp, Flame, Star, Zap, Trophy, Plus, Edit, Target
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Admin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [topBets, setTopBets] = useState([]);
  const [topBetsStats, setTopBetsStats] = useState(null);
  const [dailyPicks, setDailyPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'topbets', or 'dailypicks'
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false);
  const [editingPick, setEditingPick] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedBet, setExpandedBet] = useState(null);
  const [generatingPicks, setGeneratingPicks] = useState(false);
  
  // Daily Pick Form State
  const [pickForm, setPickForm] = useState({
    title: '',
    description: '',
    win_probability: 65,
    odds: '-110',
    sport: 'NFL',
    confidence: 7,
    reasoning: [''],
    risk_factors: [''],
    game_time: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data with individual error handling
      const results = await Promise.allSettled([
        axios.get(`${BACKEND_URL}/api/admin/stats`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/users?limit=100`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/top-bets?limit=50`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/top-bets/stats`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/daily-picks`, { headers })
      ]);

      // Check if any request got 403 (not admin)
      const forbidden = results.find(r => r.status === 'rejected' && r.reason?.response?.status === 403);
      if (forbidden) {
        toast.error('Admin access required. Make sure you are logged in with the admin email.');
        navigate('/dashboard');
        return;
      }

      // Set data from successful requests, with defaults for failed ones
      if (results[0].status === 'fulfilled') setStats(results[0].value.data);
      if (results[1].status === 'fulfilled') setUsers(results[1].value.data.users || []);
      if (results[2].status === 'fulfilled') setTopBets(results[2].value.data.top_bets || []);
      if (results[3].status === 'fulfilled') setTopBetsStats(results[3].value.data);
      if (results[4].status === 'fulfilled') setDailyPicks(results[4].value.data.picks || []);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
        navigate('/dashboard');
      } else {
        toast.error('Error loading admin data');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchUserDetails = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/admin/user/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserDetails(response.data);
      setShowUserModal(true);
    } catch (error) {
      toast.error('Error fetching user details');
    }
  };

  const handleBan = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/users/${userId}/ban`,
        { reason: banReason || 'Violated terms of service' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User banned successfully');
      setBanReason('');
      setSelectedUser(null);
      setShowBanModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error banning user');
    }
  };

  const handleUnban = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/users/${userId}/unban`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User unbanned successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error unbanning user');
    }
  };

  const handleResetUsage = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/users/${userId}/reset-usage`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Usage reset successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error resetting usage');
    }
  };

  const handleGrantSubscription = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/users/${userId}/grant-subscription`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pro subscription granted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error granting subscription');
    }
  };

  const handleRevokeSubscription = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/users/${userId}/revoke-subscription`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Subscription revoked');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error revoking subscription');
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${email}? This cannot be undone.`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${BACKEND_URL}/api/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting user');
    }
  };

  const handleDeleteTopBet = async (betId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${BACKEND_URL}/api/admin/top-bets/${betId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Top bet deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting top bet');
    }
  };

  // Daily Picks Management Functions
  const resetPickForm = () => {
    setPickForm({
      title: '',
      description: '',
      win_probability: 65,
      odds: '-110',
      sport: 'NFL',
      confidence: 7,
      reasoning: [''],
      risk_factors: [''],
      game_time: ''
    });
    setEditingPick(null);
  };

  const handleCreatePick = async () => {
    if (!pickForm.title || !pickForm.description) {
      toast.error('Please fill in title and description');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const pickData = {
        ...pickForm,
        reasoning: pickForm.reasoning.filter(r => r.trim()),
        risk_factors: pickForm.risk_factors.filter(r => r.trim())
      };
      
      await axios.post(
        `${BACKEND_URL}/api/admin/daily-picks`,
        pickData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Daily pick created!');
      setShowPickModal(false);
      resetPickForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating pick');
    }
  };

  const handleDeletePick = async (pickId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${BACKEND_URL}/api/admin/daily-picks/${pickId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pick deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error deleting pick');
    }
  };

  const handleTogglePick = async (pickId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/daily-picks/${pickId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pick status updated');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error toggling pick');
    }
  };

  const handleGeneratePicks = async () => {
    setGeneratingPicks(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/generate-picks`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.generated) {
        toast.success(`${response.data.message}`);
        fetchData();
      } else {
        toast.info(response.data.message || 'No new picks generated');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error generating picks');
    } finally {
      setGeneratingPicks(false);
    }
  };

  const addReasonField = () => {
    setPickForm(prev => ({ ...prev, reasoning: [...prev.reasoning, ''] }));
  };

  const addRiskField = () => {
    setPickForm(prev => ({ ...prev, risk_factors: [...prev.risk_factors, ''] }));
  };

  const updateReasoning = (index, value) => {
    const newReasons = [...pickForm.reasoning];
    newReasons[index] = value;
    setPickForm(prev => ({ ...prev, reasoning: newReasons }));
  };

  const updateRiskFactor = (index, value) => {
    const newRisks = [...pickForm.risk_factors];
    newRisks[index] = value;
    setPickForm(prev => ({ ...prev, risk_factors: newRisks }));
  };

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'Status', 'Subscription', 'Analyses', 'Joined', 'Last Login', 'IPs'].join(','),
      ...users.map(u => [
        u.email,
        u.is_banned ? 'Banned' : 'Active',
        u.is_subscribed ? 'Pro' : 'Free',
        u.analyses_count,
        u.created_at || 'N/A',
        u.last_login || 'N/A',
        (u.ip_addresses || []).join(';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betrslip-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users exported to CSV');
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && !user.is_banned;
    if (filterStatus === 'banned') return matchesSearch && user.is_banned;
    if (filterStatus === 'subscribed') return matchesSearch && user.is_subscribed;
    if (filterStatus === 'free') return matchesSearch && !user.is_subscribed && !user.is_banned;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950 p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-violet-400" />
              <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportUsers} variant="outline" className="text-slate-400 border-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={fetchData} variant="outline" className="text-slate-400 border-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total_users}</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Pro Users</p>
                <p className="text-2xl font-bold text-white">{stats.active_subscribers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Banned</p>
                <p className="text-2xl font-bold text-white">{stats.banned_users}</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Analyses</p>
                <p className="text-2xl font-bold text-white">{stats.total_analyses}</p>
              </div>
            </div>
          </Card>

          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Revenue</p>
                <p className="text-2xl font-bold text-white">${(stats.active_subscribers * 5).toFixed(0)}/mo</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-violet-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('topbets')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'topbets'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Top Bets ({topBets.length})
          </button>
          <button
            onClick={() => setActiveTab('dailypicks')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'dailypicks'
                ? 'bg-yellow-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-4 h-4" />
            Daily Picks ({dailyPicks.length})
          </button>
        </div>
      </div>

      {/* Top Bets Stats */}
      {activeTab === 'topbets' && topBetsStats && (
        <div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass border-emerald-500/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total Top Bets</p>
                <p className="text-2xl font-bold text-white">{topBetsStats.total_top_bets}</p>
              </div>
            </div>
          </Card>
          <Card className="glass border-yellow-500/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Elite (80%+)</p>
                <p className="text-2xl font-bold text-yellow-400">{topBetsStats.elite_bets_80_plus}</p>
              </div>
            </div>
          </Card>
          <Card className="glass border-violet-500/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Strong (70-79%)</p>
                <p className="text-2xl font-bold text-violet-400">{topBetsStats.strong_bets_70_79}</p>
              </div>
            </div>
          </Card>
          <Card className="glass border-blue-500/30 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Avg Probability</p>
                <p className="text-2xl font-bold text-blue-400">{topBetsStats.average_probability}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
      {/* Search and Filter */}
      <div className="max-w-7xl mx-auto mb-6">
        <Card className="glass border-slate-800 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            
            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'subscribed', 'free', 'banned'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === status
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'all' && ` (${users.length})`}
                  {status === 'active' && ` (${users.filter(u => !u.is_banned).length})`}
                  {status === 'subscribed' && ` (${users.filter(u => u.is_subscribed).length})`}
                  {status === 'free' && ` (${users.filter(u => !u.is_subscribed && !u.is_banned).length})`}
                  {status === 'banned' && ` (${users.filter(u => u.is_banned).length})`}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Users List */}
      <div className="max-w-7xl mx-auto">
        <Card className="glass border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Users ({filteredUsers.length})
            </h2>
          </div>
          
          <div className="divide-y divide-slate-800">
            {filteredUsers.map((user) => (
              <div key={user.id} className={`${user.is_banned ? 'bg-red-950/10' : ''}`}>
                {/* User Row */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      user.is_banned ? 'bg-red-500/30' : user.is_subscribed ? 'bg-emerald-500/30' : 'bg-slate-700'
                    }`}>
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">{user.email}</p>
                        {user.is_subscribed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                            <Crown className="w-3 h-3" />
                            Pro
                          </span>
                        )}
                        {user.is_banned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                            <Ban className="w-3 h-3" />
                            Banned
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        {user.analyses_count} analyses • ID: {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => fetchUserDetails(user.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      {expandedUser === user.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Actions */}
                {expandedUser === user.id && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-slate-900/50 rounded-lg p-4 space-y-4">
                      {/* User Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-slate-400 text-xs">Analyses</p>
                          <p className="text-white font-bold">{user.analyses_count}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Status</p>
                          <p className={`font-bold ${user.is_banned ? 'text-red-400' : 'text-emerald-400'}`}>
                            {user.is_banned ? 'Banned' : 'Active'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Subscription</p>
                          <p className={`font-bold ${user.is_subscribed ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {user.is_subscribed ? 'Pro' : 'Free'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">IPs Tracked</p>
                          <p className="text-white font-bold">{user.ip_addresses?.length || 0}</p>
                        </div>
                      </div>

                      {/* IP Addresses */}
                      {user.ip_addresses?.length > 0 && (
                        <div>
                          <p className="text-slate-400 text-xs mb-2">IP Addresses:</p>
                          <div className="flex flex-wrap gap-2">
                            {user.ip_addresses.map((ip, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 font-mono">
                                {ip}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ban Reason */}
                      {user.is_banned && user.ban_reason && (
                        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
                          <p className="text-red-400 text-xs font-semibold mb-1">Ban Reason:</p>
                          <p className="text-slate-300 text-sm">{user.ban_reason}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                        {/* Subscription Actions */}
                        {user.is_subscribed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeSubscription(user.id)}
                            className="text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Revoke Pro
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGrantSubscription(user.id)}
                            className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            <Gift className="w-3 h-3 mr-1" />
                            Grant Pro
                          </Button>
                        )}

                        {/* Reset Usage */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetUsage(user.id)}
                          className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reset Usage
                        </Button>

                        {/* Ban/Unban */}
                        {user.is_banned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnban(user.id)}
                            className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanModal(true);
                            }}
                            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Ban
                          </Button>
                        )}

                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                No users found matching your criteria
              </div>
            )}
          </div>
        </Card>
      </div>
      </>
      )}

      {/* Top Bets Tab Content */}
      {activeTab === 'topbets' && (
        <div className="max-w-7xl mx-auto">
          <Card className="glass border-emerald-500/20 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                High Percentage Bet Slips (60%+)
              </h2>
              <p className="text-slate-400 text-sm">{topBets.length} bets stored</p>
            </div>
            
            <div className="divide-y divide-slate-800">
              {topBets.map((bet) => (
                <div key={bet.id} className="p-4">
                  {/* Bet Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Probability Badge */}
                      <div className={`px-3 py-2 rounded-lg font-black text-lg ${
                        bet.win_probability >= 80 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        bet.win_probability >= 70 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {bet.win_probability?.toFixed(1)}%
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{bet.user_email}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(bet.created_at).toLocaleDateString()} • {bet.recommendation || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedBet(expandedBet === bet.id ? null : bet.id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {expandedBet === bet.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTopBet(bet.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex gap-4 text-xs mb-2">
                    <span className="text-slate-400">
                      Confidence: <span className="text-white font-semibold">{bet.confidence_score}/10</span>
                    </span>
                    <span className="text-slate-400">
                      EV: <span className={bet.expected_value > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {bet.expected_value > 0 ? '+' : ''}{bet.expected_value?.toFixed(1)}%
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Kelly: <span className="text-violet-400 font-semibold">{bet.kelly_percentage?.toFixed(1)}%</span>
                    </span>
                  </div>

                  {/* Expanded Details */}
                  {expandedBet === bet.id && (
                    <div className="mt-4 bg-slate-900/50 rounded-lg p-4 space-y-4">
                      {/* Bet Details */}
                      {bet.bet_details && (
                        <div>
                          <p className="text-slate-400 text-xs font-semibold mb-1">Bet Details</p>
                          <p className="text-white text-sm">{bet.bet_details}</p>
                        </div>
                      )}

                      {/* Individual Bets */}
                      {bet.individual_bets && bet.individual_bets.length > 0 && (
                        <div>
                          <p className="text-slate-400 text-xs font-semibold mb-2">Individual Legs</p>
                          <div className="space-y-2">
                            {bet.individual_bets.map((leg, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded p-2">
                                <span className="text-white text-sm">{leg.description}</span>
                                <span className={`font-bold text-sm ${
                                  leg.individual_probability >= 60 ? 'text-emerald-400' :
                                  leg.individual_probability >= 45 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {leg.individual_probability}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Positive Factors */}
                      {bet.positive_factors && bet.positive_factors.length > 0 && (
                        <div>
                          <p className="text-emerald-400 text-xs font-semibold mb-1">Positive Factors</p>
                          <ul className="space-y-1">
                            {bet.positive_factors.map((factor, i) => (
                              <li key={i} className="text-slate-300 text-xs flex items-start gap-1">
                                <span className="text-emerald-400">✓</span> {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Risk Factors */}
                      {bet.risk_factors && bet.risk_factors.length > 0 && (
                        <div>
                          <p className="text-red-400 text-xs font-semibold mb-1">Risk Factors</p>
                          <ul className="space-y-1">
                            {bet.risk_factors.map((factor, i) => (
                              <li key={i} className="text-slate-300 text-xs flex items-start gap-1">
                                <span className="text-red-400">•</span> {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Team Form */}
                      {bet.team_form_data && bet.team_form_data.length > 0 && (
                        <div>
                          <p className="text-violet-400 text-xs font-semibold mb-1">Team Form</p>
                          <div className="flex gap-4">
                            {bet.team_form_data.map((team, i) => (
                              <div key={i} className="text-xs">
                                <span className="text-white font-semibold">{team.team}</span>
                                <span className="text-slate-400 ml-2">{team.form} ({team.record})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {topBets.length === 0 && (
                <div className="p-12 text-center">
                  <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400">No high-percentage bets stored yet</p>
                  <p className="text-slate-500 text-sm mt-1">Bets with 60%+ win probability will appear here</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Daily Picks Tab Content */}
      {activeTab === 'dailypicks' && (
        <div className="max-w-7xl mx-auto">
          <Card className="glass border-yellow-500/20 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-yellow-400" />
                Daily Picks Management
              </h2>
              <Button
                onClick={() => {
                  resetPickForm();
                  setShowPickModal(true);
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Pick
              </Button>
            </div>
            
            <div className="divide-y divide-slate-800">
              {dailyPicks.map((pick) => (
                <div key={pick.id} className={`p-4 ${!pick.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">{pick.sport}</span>
                        {pick.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-xs">Inactive</span>
                        )}
                      </div>
                      <h4 className="text-white font-bold">{pick.title}</h4>
                      <p className="text-slate-400 text-sm mt-1">{pick.description}</p>
                      {pick.game_time && (
                        <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {pick.game_time}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${
                        pick.win_probability >= 70 ? 'text-emerald-400' :
                        pick.win_probability >= 55 ? 'text-yellow-400' : 'text-orange-400'
                      }`}>{pick.win_probability}%</p>
                      <p className="text-slate-400 text-xs">Odds: {pick.odds}</p>
                      <p className="text-violet-400 text-xs">Conf: {pick.confidence}/10</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTogglePick(pick.id)}
                        className={pick.is_active ? 'text-yellow-400' : 'text-emerald-400'}
                      >
                        {pick.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePick(pick.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Reasoning Preview */}
                  {pick.reasoning && pick.reasoning.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-emerald-400 text-xs font-semibold mb-1">Reasoning:</p>
                      <ul className="space-y-1">
                        {pick.reasoning.slice(0, 2).map((r, i) => (
                          <li key={i} className="text-slate-400 text-xs">• {r}</li>
                        ))}
                        {pick.reasoning.length > 2 && (
                          <li className="text-slate-500 text-xs">+ {pick.reasoning.length - 2} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}

              {dailyPicks.length === 0 && (
                <div className="p-12 text-center">
                  <Flame className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400">No daily picks yet</p>
                  <p className="text-slate-500 text-sm mt-1">Add picks to show on user dashboards</p>
                  <Button
                    onClick={() => {
                      resetPickForm();
                      setShowPickModal(true);
                    }}
                    className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Pick
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Daily Pick Modal */}
      {showPickModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="glass border-yellow-500/30 p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-yellow-400" />
                {editingPick ? 'Edit Daily Pick' : 'Create Daily Pick'}
              </h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPickModal(false);
                  resetPickForm();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Chiefs -3.5 vs Raiders"
                  value={pickForm.title}
                  onChange={(e) => setPickForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Description *</label>
                <textarea
                  placeholder="Brief explanation of the pick"
                  value={pickForm.description}
                  onChange={(e) => setPickForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Row: Sport, Odds, Game Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Sport</label>
                  <select
                    value={pickForm.sport}
                    onChange={(e) => setPickForm(prev => ({ ...prev, sport: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="NFL">NFL</option>
                    <option value="NBA">NBA</option>
                    <option value="MLB">MLB</option>
                    <option value="NHL">NHL</option>
                    <option value="Soccer">Soccer</option>
                    <option value="UFC">UFC</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Golf">Golf</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Odds</label>
                  <input
                    type="text"
                    placeholder="-110"
                    value={pickForm.odds}
                    onChange={(e) => setPickForm(prev => ({ ...prev, odds: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Game Time</label>
                  <input
                    type="text"
                    placeholder="Sunday 4:25 PM ET"
                    value={pickForm.game_time}
                    onChange={(e) => setPickForm(prev => ({ ...prev, game_time: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Row: Win Probability, Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Win Probability: {pickForm.win_probability}%</label>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={pickForm.win_probability}
                    onChange={(e) => setPickForm(prev => ({ ...prev, win_probability: parseInt(e.target.value) }))}
                    className="w-full accent-yellow-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Confidence: {pickForm.confidence}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={pickForm.confidence}
                    onChange={(e) => setPickForm(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <label className="text-emerald-400 text-xs mb-1 block flex items-center justify-between">
                  <span>Reasoning (Why we like this)</span>
                  <button onClick={addReasonField} className="text-emerald-400 hover:text-emerald-300 text-xs">+ Add</button>
                </label>
                {pickForm.reasoning.map((reason, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Reason ${i + 1}`}
                    value={reason}
                    onChange={(e) => updateReasoning(i, e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 mb-2"
                  />
                ))}
              </div>

              {/* Risk Factors */}
              <div>
                <label className="text-orange-400 text-xs mb-1 block flex items-center justify-between">
                  <span>Risk Factors (Watch out for)</span>
                  <button onClick={addRiskField} className="text-orange-400 hover:text-orange-300 text-xs">+ Add</button>
                </label>
                {pickForm.risk_factors.map((risk, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Risk ${i + 1}`}
                    value={risk}
                    onChange={(e) => updateRiskFactor(i, e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500 mb-2"
                  />
                ))}
              </div>

              {/* Submit */}
              <Button
                onClick={handleCreatePick}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                {editingPick ? 'Update Pick' : 'Create Pick'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="glass border-red-500/30 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Ban User</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Are you sure you want to ban <span className="text-white font-semibold">{selectedUser.email}</span>?
              This will prevent them from using the service.
            </p>
            <input
              type="text"
              placeholder="Reason for ban (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white mb-4 focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="flex-1 border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleBan(selectedUser.id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                Ban User
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && userDetails && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="glass border-slate-700 p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                  userDetails.user?.is_banned ? 'bg-red-500/30' : 'bg-violet-500/30'
                }`}>
                  {userDetails.user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{userDetails.user?.email}</h3>
                  <p className="text-slate-400 text-xs">ID: {userDetails.user?.id}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* User Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <Activity className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                <p className="text-slate-400 text-xs">Total Analyses</p>
                <p className="text-white font-bold text-lg">{userDetails.total_analyses}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-slate-400 text-xs">Usage Count</p>
                <p className="text-white font-bold text-lg">{userDetails.usage?.analyses_count || 0}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <Crown className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-slate-400 text-xs">Subscription</p>
                <p className={`font-bold text-lg ${userDetails.subscription?.subscription_status === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {userDetails.subscription?.subscription_status === 'active' ? 'Pro' : 'Free'}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-slate-400 text-xs">Last Login</p>
                <p className="text-white font-bold text-sm">
                  {userDetails.user?.last_login ? new Date(userDetails.user.last_login).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Device Fingerprints */}
            {userDetails.user?.device_fingerprints?.length > 0 && (
              <div className="mb-4">
                <p className="text-slate-400 text-xs mb-2 font-semibold">Device Fingerprints ({userDetails.user.device_fingerprints.length})</p>
                <div className="bg-slate-900/50 rounded-lg p-3 max-h-24 overflow-y-auto">
                  {userDetails.user.device_fingerprints.map((fp, i) => (
                    <p key={i} className="text-slate-300 text-xs font-mono truncate">{fp}</p>
                  ))}
                </div>
              </div>
            )}

            {/* IP Addresses */}
            {userDetails.user?.ip_addresses?.length > 0 && (
              <div className="mb-4">
                <p className="text-slate-400 text-xs mb-2 font-semibold">IP Addresses ({userDetails.user.ip_addresses.length})</p>
                <div className="flex flex-wrap gap-2">
                  {userDetails.user.ip_addresses.map((ip, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 font-mono">
                      {ip}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <Button
              onClick={() => setShowUserModal(false)}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white mt-4"
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Admin;
