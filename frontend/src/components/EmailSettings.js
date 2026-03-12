import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Bell, BellOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config/api';

const EmailSettings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    email_preference: 'full',
    email_unsubscribed: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${BACKEND_URL}/api/user/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data);
    } catch (error) {
      console.log('Could not fetch email settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (preference) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/api/user/email-settings`, 
        { email_preference: preference },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(prev => ({ ...prev, email_preference: preference }));
      toast.success('Email preference updated');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubscription = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = settings.email_unsubscribed 
        ? `${BACKEND_URL}/api/user/resubscribe`
        : `${BACKEND_URL}/api/user/unsubscribe`;
      
      await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSettings(prev => ({ ...prev, email_unsubscribed: !prev.email_unsubscribed }));
      toast.success(settings.email_unsubscribed ? 'Resubscribed to emails' : 'Unsubscribed from emails');
    } catch (error) {
      toast.error('Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <Card className="bg-slate-900 border-slate-700 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Mail className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Email Notifications</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            data-testid="close-email-settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email Status */}
            <div className={`p-4 rounded-lg border ${
              settings.email_unsubscribed 
                ? 'bg-slate-800/50 border-slate-700' 
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.email_unsubscribed ? (
                    <BellOff className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Bell className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <p className="text-white font-semibold">
                      {settings.email_unsubscribed ? 'Emails Disabled' : 'Emails Enabled'}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {settings.email_unsubscribed 
                        ? "You won't receive daily pick emails" 
                        : 'Daily picks sent at 8:00 AM ET'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={settings.email_unsubscribed ? "default" : "outline"}
                  onClick={toggleSubscription}
                  disabled={saving}
                  className={settings.email_unsubscribed 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'border-red-500/30 text-red-400 hover:bg-red-500/10'}
                >
                  {settings.email_unsubscribed ? 'Enable' : 'Disable'}
                </Button>
              </div>
            </div>

            {/* Email Type Selection */}
            {!settings.email_unsubscribed && (
              <div>
                <p className="text-slate-400 text-sm mb-3">Email Content Style</p>
                <div className="space-y-2">
                  <button
                    onClick={() => updatePreference('simple')}
                    disabled={saving}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      settings.email_preference === 'simple'
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Simple</p>
                        <p className="text-slate-400 text-sm">Just the Bet of the Day</p>
                      </div>
                      {settings.email_preference === 'simple' && (
                        <Check className="w-5 h-5 text-violet-400" />
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => updatePreference('full')}
                    disabled={saving}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      settings.email_preference === 'full'
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Full</p>
                        <p className="text-slate-400 text-sm">Bet of the Day + Top 3 Picks</p>
                      </div>
                      {settings.email_preference === 'full' && (
                        <Check className="w-5 h-5 text-violet-400" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="text-center pt-4 border-t border-slate-800">
              <p className="text-slate-500 text-xs">
                Pro members receive daily picks at 8:00 AM Eastern Time
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmailSettings;
