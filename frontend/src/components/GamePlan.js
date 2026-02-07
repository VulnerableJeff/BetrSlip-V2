import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Map, Crosshair, DollarSign, Shield, TrendingUp, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GamePlan = () => {
  const [risk, setRisk] = useState('medium');
  const [bankroll, setBankroll] = useState(500);
  const [sports, setSports] = useState(['NBA', 'NFL']);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  const allSports = ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

  const toggleSport = (s) => {
    setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setPlan(null);
  };

  const generate = async () => {
    if (sports.length === 0) { toast.error('Select at least one sport'); return; }
    setLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/game-plan`,
        { risk_tolerance: risk, bankroll: Number(bankroll), preferred_sports: sports },
        { headers }
      );
      setPlan(res.data);
    } catch { toast.error('Failed to generate plan'); }
    finally { setLoading(false); }
  };

  const riskOptions = [
    { value: 'low', label: 'Conservative', icon: Shield, color: 'text-blue-400 bg-blue-400/10' },
    { value: 'medium', label: 'Balanced', icon: Crosshair, color: 'text-violet-400 bg-violet-400/10' },
    { value: 'high', label: 'Aggressive', icon: TrendingUp, color: 'text-red-400 bg-red-400/10' }
  ];

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center">
            <Map className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">Game Plan</CardTitle>
            <p className="text-xs text-slate-400">AI-personalized betting strategy</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Tolerance */}
        <div>
          <p className="text-xs text-slate-500 font-semibold mb-2">RISK TOLERANCE</p>
          <div className="grid grid-cols-3 gap-2">
            {riskOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setRisk(opt.value); setPlan(null); }}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  risk === opt.value
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <opt.icon className={`w-4 h-4 mx-auto mb-1 ${opt.color.split(' ')[0]}`} />
                <p className="text-xs font-medium text-white">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Bankroll & Sports */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">BANKROLL</p>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-500" />
              <Input
                type="number"
                value={bankroll}
                onChange={(e) => { setBankroll(e.target.value); setPlan(null); }}
                className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
                min={10}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">SPORTS</p>
            <div className="flex flex-wrap gap-1">
              {allSports.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSport(s)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    sports.includes(s) ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-sm h-9">
          {loading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</> : 'Generate Game Plan'}
        </Button>

        {/* Results */}
        {plan && (
          <div className="space-y-3 border-t border-slate-700/50 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-violet-400">{plan.profile?.label}</p>
                <p className="text-[10px] text-slate-500">Strategy</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-emerald-400">${plan.profile?.daily_budget}</p>
                <p className="text-[10px] text-slate-500">Daily Budget</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-white">{plan.performance?.record || '0W-0L'}</p>
                <p className="text-[10px] text-slate-500">Your Record</p>
              </div>
            </div>

            {plan.recommendations?.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 font-semibold mb-1.5">TODAY'S PLAYS</p>
                {plan.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2.5 bg-slate-800/30 rounded-lg mb-1">
                    <div>
                      <p className="text-sm font-medium text-white">{rec.pick}</p>
                      <p className="text-xs text-slate-400">{rec.sport} • {rec.odds} • {rec.win_probability}% win</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">${rec.suggested_stake}</p>
                      <p className="text-[10px] text-slate-500">Kelly: {rec.kelly_fraction}%</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-700/30 text-xs">
                  <span className="text-slate-500">Total Action</span>
                  <span className="text-white font-medium">${plan.total_action}</span>
                </div>
              </div>
            )}

            {plan.rules?.length > 0 && (
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-2.5">
                <p className="text-[10px] text-violet-400 font-semibold mb-1">YOUR RULES</p>
                {plan.rules.map((rule, i) => (
                  <p key={i} className="text-xs text-slate-400 leading-relaxed">• {rule}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GamePlan;
