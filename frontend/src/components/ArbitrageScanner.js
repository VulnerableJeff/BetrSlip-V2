import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, RefreshCw, AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ArbitrageScanner = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/arbitrage-scanner`, { headers });
      setData(res.data);
    } catch { toast.error('Failed to scan'); }
    finally { setLoading(false); }
  };

  const opps = data?.opportunities || [];

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Arbitrage Scanner</CardTitle>
              <p className="text-xs text-slate-400">Risk-free opportunities across books</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetch} disabled={loading} className="text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-slate-800 rounded" />
            <div className="h-16 bg-slate-800 rounded" />
          </div>
        ) : opps.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No arbitrage opportunities right now</p>
            <p className="text-xs text-slate-500 mt-1">True arbs are rare — we scan continuously</p>
          </div>
        ) : (
          <div className="space-y-2">
            {opps.map((opp, i) => (
              <div key={i} className={`rounded-lg p-3 border ${opp.is_near_arb ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{opp.game}</p>
                    <p className="text-xs text-slate-400">{opp.sport}</p>
                  </div>
                  <span className={`text-sm font-bold ${opp.is_near_arb ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {opp.profit_percentage > 0 ? '+' : ''}{opp.profit_percentage}%
                    {opp.is_near_arb && <span className="text-[10px] ml-1">near-arb</span>}
                  </span>
                </div>
                {!opp.is_near_arb && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex-1 bg-slate-800/50 rounded p-2">
                      <p className="text-slate-500">{opp.home?.team}</p>
                      <p className="text-white font-medium">{opp.home?.odds > 0 ? '+' : ''}{opp.home?.odds}</p>
                      <p className="text-slate-500">{opp.home?.book}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <div className="flex-1 bg-slate-800/50 rounded p-2">
                      <p className="text-slate-500">{opp.away?.team}</p>
                      <p className="text-white font-medium">{opp.away?.odds > 0 ? '+' : ''}{opp.away?.odds}</p>
                      <p className="text-slate-500">{opp.away?.book}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArbitrageScanner;
