import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Zap, TrendingUp, ExternalLink, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

import { BACKEND_URL } from '@/config/api';

const EVScanner = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEV();
    // Auto-retry after 15s if data is empty (cache warming up)
    const timer = setTimeout(() => {
      if (!data?.opportunities?.length) fetchEV();
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const fetchEV = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/ev-scanner`, { headers });
      setData(res.data);
    } catch {
      toast.error('Failed to load EV data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-800 rounded w-32" />
            <div className="h-20 bg-slate-800 rounded" />
            <div className="h-20 bg-slate-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const opportunities = data?.opportunities || [];

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">EV Scanner</CardTitle>
              <p className="text-xs text-slate-400">Positive expected value opportunities</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchEV} disabled={loading} className="text-slate-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              {data?.source === 'unavailable' ? 'Live odds data is loading...' : 'No +EV opportunities found right now'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Data refreshes automatically</p>
            <Button variant="outline" size="sm" onClick={fetchEV} className="mt-3 text-xs border-slate-700 text-slate-400 hover:text-white">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh Now
            </Button>
          </div>
        ) : (
          opportunities.map((opp, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">{opp.sport}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{opp.game}</p>
                    <p className="text-xs text-slate-400">
                      True: {opp.true_probability}% • Odds: {opp.true_odds}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">+{opp.best_edge}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500">@ {opp.best_book}</p>
                  </div>
                  {expandedIdx === i ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </button>

              {/* Expanded: all sportsbook odds */}
              {expandedIdx === i && opp.book_odds && (
                <div className="px-3 pb-3 border-t border-slate-700/50">
                  <p className="text-[10px] text-slate-500 mt-2 mb-1.5 font-semibold uppercase tracking-wide">Sportsbook Odds</p>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(opp.book_odds)
                      .sort(([,a], [,b]) => b.edge - a.edge)
                      .map(([book, odds]) => (
                        <div key={book} className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${
                          odds.edge > 0 ? 'bg-emerald-500/5' : 'bg-slate-800/50'
                        }`}>
                          <span className="text-slate-300 font-medium">{book}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{odds.american}</span>
                            <span className="text-slate-500">{odds.implied_prob}%</span>
                            <span className={`font-semibold ${odds.edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {odds.edge > 0 ? '+' : ''}{odds.edge}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                    <span className="text-xs text-slate-500">Kelly: {opp.kelly_bet}% of bankroll</span>
                    <span className="text-xs text-emerald-400 font-semibold">Best: {opp.best_book} ({opp.best_odds})</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {data?.last_updated && (
          <p className="text-[10px] text-slate-600 text-center pt-2">
            Last updated: {new Date(data.last_updated).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EVScanner;
