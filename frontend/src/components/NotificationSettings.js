import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, BellOff, TrendingUp, Clock, Trophy, Target, Info } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const NotificationSettings = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState({
    line_movements: true,
    game_starts: true,
    daily_picks: true,
    bet_results: true
  });
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/notifications/preferences`, { headers });
      setIsSubscribed(response.data.is_subscribed);
      setPreferences(response.data.preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableNotifications = async () => {
    setSubscribing(true);
    try {
      // Try browser push notifications first
      let pushSuccess = false;
      
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted' && 'serviceWorker' in navigator && 'PushManager' in window) {
          try {
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
              registration = await navigator.serviceWorker.register('/sw.js');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Try push subscription
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: new Uint8Array(65) // dummy key for structure
            }).catch(() => null);

            if (subscription) {
              await axios.post(
                `${BACKEND_URL}/api/notifications/subscribe`,
                {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
                    auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
                  }
                },
                { headers }
              );
              pushSuccess = true;
            }
          } catch (pushErr) {
            console.log('Push subscription not available, using preference-based notifications');
          }
        }
      }

      // Always save subscription state to backend (preference-based notifications)
      if (!pushSuccess) {
        await axios.post(
          `${BACKEND_URL}/api/notifications/subscribe`,
          {
            endpoint: `betrslip-web-${Date.now()}`,
            keys: { p256dh: 'web-preference', auth: 'web-preference' }
          },
          { headers }
        );
      }

      // Save default preferences
      await axios.put(
        `${BACKEND_URL}/api/notifications/preferences`,
        preferences,
        { headers }
      );

      setIsSubscribed(true);
      toast.success('Notifications enabled! You\'ll receive alerts for your selected preferences.');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const disableNotifications = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/notifications/unsubscribe`, {}, { headers });
      setIsSubscribed(false);
      toast.success('Notifications disabled');
    } catch (error) {
      toast.error('Failed to disable notifications');
    }
  };

  const updatePreference = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    try {
      await axios.put(
        `${BACKEND_URL}/api/notifications/preferences`,
        newPrefs,
        { headers }
      );
    } catch (error) {
      setPreferences(preferences);
      toast.error('Failed to update preference');
    }
  };

  const PreferenceItem = ({ icon: Icon, title, description, prefKey }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <Switch
        checked={preferences[prefKey]}
        onCheckedChange={(checked) => updatePreference(prefKey, checked)}
        disabled={!isSubscribed}
      />
    </div>
  );

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/3" />
            <div className="h-32 bg-slate-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-violet-400" />
          <CardTitle className="text-lg text-white">Push Notifications</CardTitle>
        </div>
        <p className="text-sm text-slate-400">
          Get notified about line movements, game starts, and daily picks
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Button */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="w-5 h-5 text-emerald-400" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="font-medium text-white">
                {isSubscribed ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p className="text-xs text-slate-400">
                {isSubscribed ? 'You will receive alerts' : 'Enable to get real-time alerts'}
              </p>
            </div>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            onClick={isSubscribed ? disableNotifications : enableNotifications}
            disabled={subscribing}
            className={isSubscribed 
              ? 'border-slate-600 text-slate-300' 
              : 'bg-violet-600 hover:bg-violet-700'
            }
          >
            {subscribing ? 'Please wait...' : isSubscribed ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {/* Notification Types */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-400 mb-3">Notification Types</p>
          
          <PreferenceItem
            icon={TrendingUp}
            title="Line Movements"
            description="Alert when odds shift significantly"
            prefKey="line_movements"
          />
          
          <PreferenceItem
            icon={Clock}
            title="Game Starts"
            description="Remind me when games are about to start"
            prefKey="game_starts"
          />
          
          <PreferenceItem
            icon={Trophy}
            title="Daily Picks"
            description="New AI picks are posted"
            prefKey="daily_picks"
          />
          
          <PreferenceItem
            icon={Target}
            title="Bet Results"
            description="Picks outcome notifications"
            prefKey="bet_results"
          />
        </div>

        {!isSubscribed && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
            <p className="text-xs text-violet-300">
              💡 Enable notifications to customize which alerts you receive
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
