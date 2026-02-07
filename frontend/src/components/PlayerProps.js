import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PlayerProps = () => {
  const [data, setData] = useState(null);
  const [sport, setSport] = useState('NBA');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchProps(); }, [sport]);

  const fetchProps = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/player-props?sport=${sport}`, { headers });
      setData(res.data);
    } catch { toast.error('Failed to load props'); }
    finally { setLoading(false); }
  };

  const props = data?.props || [];
  const sports = ['NBA', 'NFL', 'MLB', 'NHL'];
  const shown = expanded ? props : props.slice(0, 4);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Player Props</CardTitle>
              <p className="text-xs text-slate-400">Player performance lines & odds</p>
            </div>
          </div>
          <div className="flex gap-1">
            {sports.map(s => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${
                  sport === s ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded" />)}</div>
        ) : props.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">No props available for {sport}</p>
        ) : (
          <>
            <div className="space-y-1">
              {shown.map((prop, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2.5 bg-slate-800/30 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{prop.player}</p>
                    <p className="text-xs text-slate-400">{prop.game} • {prop.market}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-bold text-white">{prop.over_under} {prop.line}</p>
                      <p className="text-[10px] text-slate-500">{prop.book}</p>
                    </div>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${prop.odds > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-300 bg-slate-700/50'}`}>
                      {prop.odds > 0 ? '+' : ''}{prop.odds}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {props.length > 4 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full mt-2 py-1.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {props.length} props</>}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerProps;
