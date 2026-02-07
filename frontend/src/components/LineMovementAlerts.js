import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LineMovementAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/line-movements`);
      if (response.data.success) {
        setAlerts(response.data.movements);
      }
    } catch (err) {
      console.error('Error fetching line movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (direction) => {
    if (direction === 'up') return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    if (direction === 'down') return <ArrowDownRight className="w-4 h-4 text-red-400" />;
    return <TrendingUp className="w-4 h-4 text-slate-400" />;
  };

  const getAlertColor = (significance) => {
    if (significance === 'high') return 'border-red-500/50 bg-red-500/10';
    if (significance === 'medium') return 'border-yellow-500/50 bg-yellow-500/10';
    return 'border-slate-700 bg-slate-800/50';
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded"></div>
            <div className="flex-1 h-4 bg-slate-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            <CardTitle className="text-lg text-white">Line Movement Alerts</CardTitle>
          </div>
          <span className="text-xs text-slate-400">Live tracking</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No significant line movements detected</p>
            <p className="text-xs text-slate-500">Alerts appear when odds shift significantly</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border ${getAlertColor(alert.significance)} transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getMovementIcon(alert.direction)}
                  <div>
                    <p className="text-sm font-medium text-white">{alert.game}</p>
                    <p className="text-xs text-slate-400">{alert.bet_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">
                    {alert.old_line} → {alert.new_line}
                  </p>
                  <p className={`text-xs ${alert.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {alert.change > 0 ? '+' : ''}{alert.change} pts
                  </p>
                </div>
              </div>
              {alert.insight && (
                <p className="mt-2 text-xs text-slate-400 border-t border-slate-700 pt-2">
                  💡 {alert.insight}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default LineMovementAlerts;
