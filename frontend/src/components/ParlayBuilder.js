import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, X, Calculator, Save, Trash2, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ParlayBuilder = () => {
  const [legs, setLegs] = useState([]);
  const [stake, setStake] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  const addLeg = () => {
    setLegs([...legs, { description: '', odds: '-110', sport: 'NFL', game: '', probability: 50 }]);
    setResult(null);
  };

  const updateLeg = (idx, field, value) => {
    const updated = [...legs];
    updated[idx] = { ...updated[idx], [field]: value };
    setLegs(updated);
    setResult(null);
  };

  const removeLeg = (idx) => {
    setLegs(legs.filter((_, i) => i !== idx));
    setResult(null);
  };

  const calculate = async () => {
    if (legs.length < 2) { toast.error('Add at least 2 legs'); return; }
    if (legs.some(l => !l.description.trim())) { toast.error('Fill in all bet descriptions'); return; }
    setLoading(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/parlay-builder/calculate`,
        { legs, stake: Number(stake) },
        { headers }
      );
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const saveParlay = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/parlay-builder/save`, { legs, stake: Number(stake) }, { headers });
      toast.success('Parlay saved!');
    } catch {
      toast.error('Failed to save parlay');
    }
  };

  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'UFC', 'Other'];

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Parlay Builder</CardTitle>
              <p className="text-xs text-slate-400">Build & analyze multi-leg parlays</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBuilder(!showBuilder)}
            className="border-slate-700 text-slate-300 text-xs"
          >
            {showBuilder ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {showBuilder ? 'Collapse' : 'Build Parlay'}
          </Button>
        </div>
      </CardHeader>

      {showBuilder && (
        <CardContent className="space-y-3">
          {/* Legs */}
          {legs.map((leg, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-3 space-y-2 border border-slate-700/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">LEG {i + 1}</span>
                <button onClick={() => removeLeg(i)} className="p-1 hover:bg-red-500/10 rounded">
                  <X className="w-3 h-3 text-red-400" />
                </button>
              </div>
              <Input
                placeholder="e.g. Chiefs -3.5, Lakers ML, Over 220.5"
                value={leg.description}
                onChange={(e) => updateLeg(i, 'description', e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white text-sm h-8"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Odds</label>
                  <Input
                    placeholder="-110"
                    value={leg.odds}
                    onChange={(e) => updateLeg(i, 'odds', e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white text-sm h-7"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Win %</label>
                  <Input
                    type="number"
                    value={leg.probability}
                    onChange={(e) => updateLeg(i, 'probability', Number(e.target.value))}
                    className="bg-slate-900/50 border-slate-700 text-white text-sm h-7"
                    min={1}
                    max={99}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Sport</label>
                  <select
                    value={leg.sport}
                    onChange={(e) => updateLeg(i, 'sport', e.target.value)}
                    className="w-full h-7 rounded-md bg-slate-900/50 border border-slate-700 text-white text-sm px-2"
                  >
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <Input
                placeholder="Game (optional, e.g. Chiefs vs Bills)"
                value={leg.game}
                onChange={(e) => updateLeg(i, 'game', e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white text-sm h-7 text-xs"
              />
            </div>
          ))}

          {/* Add Leg + Stake */}
          <div className="flex items-center gap-2">
            <Button onClick={addLeg} variant="outline" className="flex-1 border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-violet-500 text-xs h-8">
              <Plus className="w-3 h-3 mr-1" /> Add Leg
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">$</span>
              <Input
                type="number"
                value={stake}
                onChange={(e) => { setStake(e.target.value); setResult(null); }}
                className="w-20 bg-slate-800 border-slate-700 text-white text-sm h-8"
                min={1}
              />
            </div>
          </div>

          {/* Actions */}
          {legs.length >= 2 && (
            <div className="flex gap-2">
              <Button onClick={calculate} disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-700 text-sm h-8">
                <Calculator className="w-3 h-3 mr-1" />
                {loading ? 'Calculating...' : 'Calculate Parlay'}
              </Button>
              {result && (
                <Button onClick={saveParlay} variant="outline" className="border-slate-700 text-slate-300 text-sm h-8">
                  <Save className="w-3 h-3 mr-1" /> Save
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3 border-t border-slate-700/50 pt-3">
              {/* Headline stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-white">{result.combined_odds}</p>
                  <p className="text-[10px] text-slate-500">Combined Odds</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-400">${result.potential_payout}</p>
                  <p className="text-[10px] text-slate-500">Potential Payout</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                  <p className={`text-lg font-bold ${result.expected_value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.ev_percentage > 0 ? '+' : ''}{result.ev_percentage}%
                  </p>
                  <p className="text-[10px] text-slate-500">Expected Value</p>
                </div>
              </div>

              {/* Details */}
              <div className="bg-slate-800/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Win Probability</span>
                  <span className="text-white font-medium">{result.parlay_probability}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Kelly Criterion</span>
                  <span className="text-white font-medium">{result.kelly_percentage}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Better Strategy</span>
                  <span className="text-violet-400 font-medium">{result.parlay_vs_individual}</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className={`rounded-lg p-2.5 text-center text-sm font-bold ${
                result.recommendation === 'BET'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {result.recommendation === 'BET' ? '✓' : '✕'} {result.recommendation}
              </div>

              {/* Correlation warnings */}
              {result.correlation_warnings?.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                  {result.correlation_warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Leg breakdown */}
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Leg Analysis</p>
                {result.legs?.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 bg-slate-800/30 rounded text-xs">
                    <span className="text-slate-300">{leg.description}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{leg.odds}</span>
                      <span className={`font-semibold ${leg.edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {leg.edge > 0 ? '+' : ''}{leg.edge}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ParlayBuilder;
