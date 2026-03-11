import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, BellRing, X, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config/api';

const PushNotifications = () => {
  const [enabled, setEnabled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPushStatus();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchPendingNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkPushStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await axios.get(`${BACKEND_URL}/api/push/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnabled(res.data.enabled);
      
      if (res.data.enabled) {
        fetchPendingNotifications();
      }
    } catch (error) {
      console.log('Could not check push status');
    }
  };

  const fetchPendingNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await axios.get(`${BACKEND_URL}/api/push/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newNotifications = res.data.notifications || [];
      if (newNotifications.length > 0 && newNotifications.length > notifications.length) {
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          const latest = newNotifications[0];
          new Notification(latest.title, {
            body: latest.message,
            icon: '/logo192.png'
          });
        }
      }
      setNotifications(newNotifications);
    } catch (error) {
      console.log('Could not fetch notifications');
    }
  };

  const enablePush = async () => {
    setLoading(true);
    try {
      // Request browser notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Please allow notifications in your browser settings');
          setLoading(false);
          return;
        }
      }

      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/push/subscribe`,
        { 
          endpoint: 'browser-notification',
          keys: { browser: true }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEnabled(true);
      toast.success('Push notifications enabled! You\'ll get alerts for high-value picks.');
    } catch (error) {
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const disablePush = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/push/unsubscribe`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEnabled(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      toast.error('Failed to disable notifications');
    } finally {
      setLoading(false);
    }
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative ${enabled ? 'text-violet-400 hover:text-violet-300' : 'text-slate-400 hover:text-white'}`}
        data-testid="push-notifications-btn"
      >
        {enabled ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-white font-semibold text-sm">Push Notifications</span>
            </div>
            <Button
              size="sm"
              variant={enabled ? "outline" : "default"}
              onClick={enabled ? disablePush : enablePush}
              disabled={loading}
              className={enabled 
                ? "text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" 
                : "text-xs bg-violet-600 hover:bg-violet-700"}
            >
              {loading ? '...' : enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {!enabled ? (
              <div className="p-6 text-center">
                <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Enable push notifications</p>
                <p className="text-slate-600 text-xs mt-1">Get alerts for high-value picks</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <BellRing className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No new notifications</p>
                <p className="text-slate-600 text-xs mt-1">You'll see alerts here</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{notification.title}</p>
                      <p className="text-slate-400 text-xs mt-1">{notification.message}</p>
                      {notification.url && (
                        <a
                          href={notification.url}
                          className="inline-flex items-center gap-1 text-violet-400 text-xs mt-2 hover:text-violet-300"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => clearNotification(notification.id)}
                      className="text-slate-600 hover:text-slate-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotifications;
