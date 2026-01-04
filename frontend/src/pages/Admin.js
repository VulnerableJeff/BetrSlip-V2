import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, Ban, CheckCircle, BarChart3, DollarSign, Shield, ArrowLeft, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Admin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats and users
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/stats`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/users`, { headers })
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950 p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
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
          <Button onClick={fetchData} variant="outline" className="text-slate-400">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-slate-400 text-xs">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total_users}</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <Ban className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-slate-400 text-xs">Banned Users</p>
                <p className="text-2xl font-bold text-white">{stats.banned_users}</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-slate-400 text-xs">Subscribers</p>
                <p className="text-2xl font-bold text-white">{stats.active_subscribers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-violet-400" />
              <div>
                <p className="text-slate-400 text-xs">Total Analyses</p>
                <p className="text-2xl font-bold text-white">{stats.total_analyses}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <div className="max-w-7xl mx-auto">
        <Card className="glass border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">All Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Analyses</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">IPs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className={user.is_banned ? 'bg-red-950/20' : ''}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{user.email}</p>
                        <p className="text-slate-500 text-xs">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">{user.analyses_count}</span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                          <Ban className="w-3 h-3" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_subscribed ? (
                        <span className="text-emerald-400 text-sm">✓ Subscribed</span>
                      ) : (
                        <span className="text-slate-500 text-sm">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[150px]">
                        {user.ip_addresses?.slice(0, 2).map((ip, i) => (
                          <p key={i} className="text-slate-400 text-xs truncate">{ip}</p>
                        ))}
                        {user.ip_addresses?.length > 2 && (
                          <p className="text-slate-500 text-xs">+{user.ip_addresses.length - 2} more</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnban(user.id)}
                          className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                          Ban
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Ban Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="glass border-slate-800 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Ban User</h3>
            <p className="text-slate-400 text-sm mb-4">
              Are you sure you want to ban <span className="text-white font-semibold">{selectedUser.email}</span>?
            </p>
            <input
              type="text"
              placeholder="Reason for ban (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white mb-4"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="flex-1"
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
    </div>
  );
};

export default Admin;
