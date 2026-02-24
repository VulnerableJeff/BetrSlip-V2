import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Users, Ban, CheckCircle, BarChart3, DollarSign, Shield, ArrowLeft, RefreshCw,
  Search, Eye, Gift, Trash2, Download, Crown, Clock, Activity,
  ChevronDown, ChevronUp, X, TrendingUp, Flame, Star, Zap, Trophy, Plus, Edit, Target, Sparkles, Loader2, MessageSquare, PieChart, Headphones, Mail, Reply
} from 'lucide-react';
import AdminAnalytics from '@/components/AdminAnalytics';

import { BACKEND_URL } from '@/config/api';

const Admin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [topBets, setTopBets] = useState([]);
  const [topBetsStats, setTopBetsStats] = useState(null);
  const [dailyPicks, setDailyPicks] = useState([]);
  const [picksPerformance, setPicksPerformance] = useState(null);
  const [cashAppRequests, setCashAppRequests] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportUnread, setSupportUnread] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [editingPick, setEditingPick] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedBet, setExpandedBet] = useState(null);
  const [generatingPicks, setGeneratingPicks] = useState(false);
  const [autoResolving, setAutoResolving] = useState(false);
  
  // Stream Form State
  const [streamForm, setStreamForm] = useState({
    title: '',
    sport: 'NBA',
    stream_url: '',
    external_url: '',
    score: '',
    quarter: '',
    network: ''
  });
  
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
        axios.get(`${BACKEND_URL}/api/admin/daily-picks`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/picks-performance`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/cashapp-requests`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/live-streams`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/support-messages`, { headers })
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
      if (results[5].status === 'fulfilled') setPicksPerformance(results[5].value.data);
      if (results[6].status === 'fulfilled') setCashAppRequests(results[6].value.data.requests || []);
      if (results[7].status === 'fulfilled') setLiveStreams(results[7].value.data.streams || []);
      if (results[8].status === 'fulfilled') {
        setSupportMessages(results[8].value.data.messages || []);
        setSupportUnread(results[8].value.data.unread_count || 0);
      }
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

  const handleAutoResolve = async () => {
    setAutoResolving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/auto-resolve-picks`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.resolved > 0) {
        toast.success(`Auto-resolved ${response.data.resolved} pick(s)!`);
        fetchData();
      } else {
        toast.info(response.data.message || 'No picks to auto-resolve');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error auto-resolving picks');
    } finally {
      setAutoResolving(false);
    }
  };

  // CashApp Management Functions
  const handleApproveCashApp = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/admin/cashapp-requests/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || 'CashApp payment approved!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error approving payment');
    }
  };

  const handleRejectCashApp = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/cashapp-requests/${requestId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('CashApp request rejected');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error rejecting request');
    }
  };

  // Live Stream Management
  const handleAddStream = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/live-streams`,
        streamForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Stream added!');
      setShowStreamModal(false);
      setStreamForm({ title: '', sport: 'NBA', stream_url: '', external_url: '', score: '', quarter: '', network: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error adding stream');
    }
  };

  const handleDeleteStream = async (streamId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/admin/live-streams/${streamId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Stream deleted');
      fetchData();
    } catch (error) {
      toast.error('Error deleting stream');
    }
  };

  const handleToggleStream = async (streamId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/api/admin/live-streams/${streamId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Stream toggled');
      fetchData();
    } catch (error) {
      toast.error('Error toggling stream');
    }
  };

  // Support Message Functions
  const handleMarkRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/api/admin/support-messages/${messageId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Marked as read');
      fetchData();
    } catch (error) {
      toast.error('Error marking message');
    }
  };

  const handleReplyMessage = async (messageId) => {
    if (!replyText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/support-messages/${messageId}/reply`,
        { reply: replyText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Reply sent');
      setReplyText('');
      setReplyingTo(null);
      fetchData();
    } catch (error) {
      toast.error('Error sending reply');
    }
  };

  const handleDeleteSupportMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/admin/support-messages/${messageId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Message deleted');
      fetchData();
    } catch (error) {
      toast.error('Error deleting message');
    }
  };

  const handleUpdateOutcome = async (pickId, outcome) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/admin/daily-picks/${pickId}/outcome`,
        { outcome },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Pick marked as ${outcome}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error updating outcome');
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
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Analytics
          </button>
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
          <button
            onClick={() => setActiveTab('streams')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'streams'
                ? 'bg-red-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Streams
          </button>
          <button
            onClick={() => setActiveTab('cashapp')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'cashapp'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            CashApp {cashAppRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {cashAppRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'support'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Headphones className="w-4 h-4" />
            Support {supportUnread > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {supportUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Analytics Dashboard Tab */}
      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto">
          <AdminAnalytics />
        </div>
      )}

      {/* Top Bets Stats */}
      {activeTab === 'topbets' && topBetsStats && (
        <div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total Top Bets</p>
                <p className="text-2xl font-black text-white">{topBetsStats.total_top_bets}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border-yellow-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Elite (80%+)</p>
                <p className="text-2xl font-black text-yellow-400">{topBetsStats.elite_bets_80_plus || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Strong (70-79%)</p>
                <p className="text-2xl font-black text-violet-400">{topBetsStats.strong_bets_70_79 || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Avg Probability</p>
                <p className="text-2xl font-black text-blue-400">{topBetsStats.average_probability}%</p>
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
                    {/* Avatar with online indicator */}
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        user.is_banned ? 'bg-red-500/30' : user.is_subscribed ? 'bg-emerald-500/30' : 'bg-slate-700'
                      }`}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      {user.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" data-testid={`user-online-${user.id}`} />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">{user.email}</p>
                        {user.is_online && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                            ONLINE
                          </span>
                        )}
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
                        {user.analyses_count} analyses • Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'} • ID: {user.id.slice(0, 8)}...
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
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-slate-400 text-xs">Analyses</p>
                          <p className="text-white font-bold">{user.analyses_count}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Status</p>
                          <p className={`font-bold ${user.is_online ? 'text-emerald-400' : user.is_banned ? 'text-red-400' : 'text-slate-400'}`}>
                            {user.is_online ? 'Online' : user.is_banned ? 'Banned' : 'Offline'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Subscription</p>
                          <p className={`font-bold ${user.is_subscribed ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {user.is_subscribed ? 'Pro' : 'Free'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Last Login</p>
                          <p className="text-white font-bold text-[11px]">
                            {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
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
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                High Percentage Bet Slips (60%+)
              </h2>
              <p className="text-slate-500 text-sm">{topBets.length} bets stored</p>
            </div>
            
            {topBets.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No high-probability bets yet</p>
                <p className="text-slate-600 text-xs mt-1">Bets with 60%+ win probability will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {topBets.map((bet) => (
                  <div key={bet.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                    {/* Bet Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {/* Probability Badge */}
                        <div className={`px-3 py-1.5 rounded-lg font-black text-lg ${
                          bet.win_probability >= 80 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                          bet.win_probability >= 70 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          {bet.win_probability?.toFixed(1)}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold text-sm">{bet.user_email || 'Unknown'}</p>
                            {bet.sport && bet.sport !== 'Unknown' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">{bet.sport}</span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs">
                            {new Date(bet.created_at).toLocaleDateString()} • {bet.recommendation || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedBet(expandedBet === bet.id ? null : bet.id)}
                          className="text-slate-400 hover:text-white h-8 w-8 p-0"
                        >
                          {expandedBet === bet.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTopBet(bet.id)}
                          className="text-red-400/60 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Bet Description */}
                    {bet.bet_details && bet.bet_details !== 'Bet Slip' && (
                      <p className="text-slate-400 text-xs mb-2 truncate">{bet.bet_details}</p>
                    )}

                    {/* Quick Stats */}
                    <div className="flex gap-4 text-xs">
                      <span className="text-slate-500">
                        Confidence: <span className="text-white font-semibold">{bet.confidence_score || '-'}/10</span>
                      </span>
                      <span className="text-slate-500">
                        EV: <span className={`font-semibold ${
                          bet.expected_value > 0 ? 'text-emerald-400' : 
                          bet.expected_value < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {bet.expected_value != null && bet.expected_value !== 0 
                            ? `${bet.expected_value > 0 ? '+' : ''}${bet.expected_value.toFixed(1)}%` 
                            : '-'}
                        </span>
                      </span>
                      <span className="text-slate-500">
                        Kelly: <span className="text-violet-400 font-semibold">
                          {bet.kelly_percentage != null && bet.kelly_percentage !== 0 
                            ? `${bet.kelly_percentage.toFixed(1)}%` 
                            : '-'}
                        </span>
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
            </div>
            )}
          </Card>
        </div>
      )}

      {/* Daily Picks Tab Content */}
      {activeTab === 'dailypicks' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Performance Stats Cards */}
          {picksPerformance && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="glass border-emerald-500/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{picksPerformance.won}</p>
                    <p className="text-slate-400 text-xs">Wins</p>
                  </div>
                </div>
              </Card>
              <Card className="glass border-red-500/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{picksPerformance.lost}</p>
                    <p className="text-slate-400 text-xs">Losses</p>
                  </div>
                </div>
              </Card>
              <Card className="glass border-yellow-500/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{picksPerformance.win_rate}%</p>
                    <p className="text-slate-400 text-xs">Win Rate</p>
                  </div>
                </div>
              </Card>
              <Card className="glass border-slate-500/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-300">{picksPerformance.pending}</p>
                    <p className="text-slate-400 text-xs">Pending</p>
                  </div>
                </div>
              </Card>
              <Card className={`glass p-4 ${picksPerformance.streak_type === 'won' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${picksPerformance.streak_type === 'won' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <Flame className={`w-5 h-5 ${picksPerformance.streak_type === 'won' ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${picksPerformance.streak_type === 'won' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {picksPerformance.current_streak || 0}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {picksPerformance.streak_type === 'won' ? 'Win Streak' : picksPerformance.streak_type === 'lost' ? 'Loss Streak' : 'Streak'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Card className="glass border-yellow-500/20 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-yellow-400" />
                Daily Picks Management
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAutoResolve}
                  disabled={autoResolving}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
                  data-testid="auto-resolve-btn"
                >
                  {autoResolving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Auto-Resolve
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleGeneratePicks}
                  disabled={generatingPicks}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold"
                >
                  {generatingPicks ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Picks
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    resetPickForm();
                    setShowPickModal(true);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manual
                </Button>
              </div>
            </div>
            
            <div className="divide-y divide-slate-800">
              {dailyPicks.map((pick) => (
                <div key={pick.id} className={`p-4 ${!pick.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase text-slate-400">{pick.sport}</span>
                        {pick.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-xs">Inactive</span>
                        )}
                        {pick.auto_generated && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Generated
                          </span>
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
                      {/* Outcome Badge */}
                      {pick.outcome && pick.outcome !== 'pending' && (
                        <p className={`mt-1 px-2 py-0.5 rounded-full text-xs font-bold inline-block ${
                          pick.outcome === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                          pick.outcome === 'lost' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {pick.outcome.toUpperCase()}
                        </p>
                      )}
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
                  
                  {/* Outcome Buttons */}
                  <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-xs mr-2">Mark Result:</span>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateOutcome(pick.id, 'won')}
                      className={`${pick.outcome === 'won' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Won
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateOutcome(pick.id, 'lost')}
                      className={`${pick.outcome === 'lost' ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                    >
                      <X className="w-3 h-3 mr-1" /> Lost
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateOutcome(pick.id, 'push')}
                      className={`${pick.outcome === 'push' ? 'bg-yellow-500 text-black' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}`}
                    >
                      Push
                    </Button>
                    {pick.outcome && pick.outcome !== 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateOutcome(pick.id, 'pending')}
                        className="text-slate-400 hover:text-slate-300"
                      >
                        Reset
                      </Button>
                    )}
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

      {/* Support Messages Tab */}
      {activeTab === 'support' && (
        <div className="max-w-4xl mx-auto">
          <Card className="glass border-orange-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white" data-testid="support-messages-title">Support Messages</h2>
                  <p className="text-slate-400 text-sm">
                    {supportUnread > 0 ? `${supportUnread} unread` : 'All caught up'} &bull; {supportMessages.length} total
                  </p>
                </div>
              </div>
            </div>

            {supportMessages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No support messages yet</p>
                <p className="text-slate-500 text-sm mt-1">Messages from users will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supportMessages.map((msg) => (
                  <div
                    key={msg.id}
                    data-testid={`support-msg-${msg.id}`}
                    className={`border rounded-xl p-4 transition-all ${
                      msg.status === 'unread'
                        ? 'bg-orange-950/20 border-orange-500/40'
                        : msg.status === 'replied'
                        ? 'bg-emerald-950/10 border-emerald-500/20'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-semibold text-sm">{msg.subject}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            msg.status === 'unread' ? 'bg-orange-500/20 text-orange-400' :
                            msg.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {msg.status === 'unread' ? 'NEW' : msg.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-violet-400 text-xs font-medium">{msg.email}</p>
                        <p className="text-slate-300 text-sm mt-2">{msg.message}</p>
                        {msg.admin_reply && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-emerald-400 text-xs font-semibold mb-1">Your Reply:</p>
                            <p className="text-slate-300 text-sm">{msg.admin_reply}</p>
                          </div>
                        )}
                        <p className="text-slate-600 text-xs mt-2">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {msg.status === 'unread' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkRead(msg.id)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReplyingTo(replyingTo === msg.id ? null : msg.id)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs"
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSupportMessage(msg.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                        </Button>
                      </div>
                    </div>

                    {/* Reply Input */}
                    {replyingTo === msg.id && (
                      <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleReplyMessage(msg.id)}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReplyMessage(msg.id)}
                          disabled={!replyText.trim()}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          Send
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CashApp Tab Content */}
      {activeTab === 'cashapp' && (
        <div className="max-w-4xl mx-auto">
          <Card className="glass border-emerald-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">CashApp Payment Requests</h2>
                  <p className="text-slate-400 text-sm">
                    Pending requests: {cashAppRequests.length}
                  </p>
                </div>
              </div>
            </div>

            {cashAppRequests.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No pending CashApp requests</p>
                <p className="text-slate-500 text-sm mt-1">
                  Requests will appear here when users submit CashApp payments
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cashAppRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{request.email}</p>
                        <p className="text-emerald-400 font-mono text-sm">
                          ${request.amount?.toFixed(2) || '5.00'}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          Requested: {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveCashApp(request.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                          size="sm"
                          data-testid={`approve-cashapp-${request.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectCashApp(request.id)}
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
              <h3 className="text-white font-semibold mb-2">CashApp Tag</h3>
              <p className="text-emerald-400 font-mono text-xl font-bold">$BetrSlip</p>
              <p className="text-slate-500 text-xs mt-2">
                Users send $5 to this tag and include their email in the note
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Live Streams Tab */}
      {activeTab === 'streams' && (
        <div className="max-w-4xl mx-auto">
          <Card className="glass border-red-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Live Streams Management</h2>
                  <p className="text-slate-400 text-sm">Add stream links for live games</p>
                </div>
              </div>
              <Button
                onClick={() => setShowStreamModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stream
              </Button>
            </div>

            {liveStreams.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No live streams configured</p>
                <p className="text-slate-500 text-sm mt-1">Add stream links for ongoing games</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveStreams.map((stream) => (
                  <div key={stream.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold">{stream.title}</p>
                          {stream.is_active ? (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                          ) : (
                            <span className="bg-slate-600 text-white text-xs px-2 py-0.5 rounded-full">OFF</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm">{stream.sport} • {stream.network || 'Stream'}</p>
                        {stream.stream_url && <p className="text-blue-400 text-xs truncate max-w-md">{stream.stream_url}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleToggleStream(stream.id)} variant="outline" size="sm" className="border-slate-600">
                          {stream.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button onClick={() => handleDeleteStream(stream.id)} variant="outline" size="sm" className="border-red-500/50 text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Stream Modal */}
      {showStreamModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="glass border-red-500/30 p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-white mb-4">Add Live Stream</h2>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm">Game Title *</label>
                <input
                  type="text"
                  value={streamForm.title}
                  onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
                  placeholder="Lakers vs Celtics"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">Sport</label>
                  <select
                    value={streamForm.sport}
                    onChange={(e) => setStreamForm({ ...streamForm, sport: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option>NBA</option>
                    <option>NFL</option>
                    <option>MLB</option>
                    <option>NHL</option>
                    <option>UFC</option>
                    <option>Soccer</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Network</label>
                  <input
                    type="text"
                    value={streamForm.network}
                    onChange={(e) => setStreamForm({ ...streamForm, network: e.target.value })}
                    placeholder="ESPN, TNT, etc."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm">Embed Stream URL</label>
                <input
                  type="text"
                  value={streamForm.stream_url}
                  onChange={(e) => setStreamForm({ ...streamForm, stream_url: e.target.value })}
                  placeholder="https://embed.example.com/stream"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm">External Link (fallback)</label>
                <input
                  type="text"
                  value={streamForm.external_url}
                  onChange={(e) => setStreamForm({ ...streamForm, external_url: e.target.value })}
                  placeholder="https://example.com/watch"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">Score (optional)</label>
                  <input
                    type="text"
                    value={streamForm.score}
                    onChange={(e) => setStreamForm({ ...streamForm, score: e.target.value })}
                    placeholder="102 - 98"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Quarter/Period</label>
                  <input
                    type="text"
                    value={streamForm.quarter}
                    onChange={(e) => setStreamForm({ ...streamForm, quarter: e.target.value })}
                    placeholder="Q3, 2nd Half, etc."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setShowStreamModal(false)} variant="outline" className="flex-1 border-slate-600">
                  Cancel
                </Button>
                <Button onClick={handleAddStream} className="flex-1 bg-red-500 hover:bg-red-600">
                  Add Stream
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Admin;
