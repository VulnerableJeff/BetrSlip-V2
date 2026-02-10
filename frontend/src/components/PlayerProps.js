import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, RefreshCw, ChevronDown, ChevronUp, Star } from 'lucide-react';

import { BACKEND_URL } from '@/config/api';

const PlayerProps = () => {
  const [data, setData] = useState(null);
  const [sport, setSport] = useState('NBA');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProps();
    const timer = setTimeout(() => { if (!data?.props?.length) fetchProps(); }, 15000);
    return () => clearTimeout(timer);
  }, [sport]);

  const fetchProps = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/player-props?sport=${sport}`, { headers });
      setData(res.data);
    } catch { toast.error('Failed to load props'); }
    finally { setLoading(false); }
  };

  const props = data?.props || [];
  const sports = ['NBA', 'NHL', 'NCAAB'];
  const shown = expanded ? props : props.slice(0, 6);

  return (
    <Card className="bg-slate-900/50 border-slate-800" data-testid="player-props">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Player Props</CardTitle>
              <p className="text-xs text-slate-400">
                {data?.source === 'live' ? 'Live odds across books' : 'Player performance lines'}
              </p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            {sports.map(s => (
              <button
                key={s}
                onClick={() => setSport(s)}
                data-testid={`props-sport-${s.toLowerCase()}`}
                className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${
                  sport === s ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={fetchProps} disabled={loading} className="text-slate-400 hover:text-white ml-1 h-6 w-6 p-0">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded" />)}</div>
        ) : props.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400">{data?.message || `No props available for ${sport}`}</p>
            <p className="text-xs text-slate-500 mt-1">Check back closer to game time</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {shown.map((prop, i) => (
                <div key={i} className={`flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-800/60 transition-colors ${
                  prop.is_value ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-slate-800/30'
                }`} data-testid={`prop-row-${i}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {prop.is_value && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      <p className="text-sm font-medium text-white truncate">{prop.player}</p>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{prop.game} &middot; {prop.market}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right flex-shrink-0">
                    <div>
                      <p className="text-sm font-bold text-white">{prop.over_under} {prop.line}</p>
                      <p className="text-[10px] text-slate-500">
                        {prop.book}{prop.books_available > 1 ? ` +${prop.books_available - 1}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${prop.odds > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-300 bg-slate-700/50'}`}>
                        {prop.odds > 0 ? '+' : ''}{prop.odds}
                      </span>
                      {prop.edge_vs_avg > 0 && (
                        <span className="text-[9px] text-emerald-500 mt-0.5">+{prop.edge_vs_avg} edge</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {props.length > 6 && (
              <button
                onClick={() => setExpanded(!expanded)}
                data-testid="props-toggle-expand"
                className="w-full mt-2 py-1.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {props.length} props</>}
              </button>
            )}
            {data?.last_updated && (
              <p className="text-[10px] text-slate-600 text-center pt-2">
                Updated: {new Date(data.last_updated).toLocaleTimeString()} &middot; {data.source}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerProps;
