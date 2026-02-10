import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Sparkles, TrendingUp, AlertCircle, Plus, X, Info, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { BACKEND_URL } from '@/config/api';

const ParlayOptimizer = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [optimalParlays, setOptimalParlays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLegs, setSelectedLegs] = useState([]);
  const [showOptimal, setShowOptimal] = useState(true);

  useEffect(() => { fetchSuggestions(); }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const response = await axios.get(`${BACKEND_URL}/api/parlay-optimizer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuggestions(response.data.suggestions || []);
        setOptimalParlays(response.data.optimal_parlays || []);
      }
    } catch (err) {
      console.error('Error fetching parlay suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLeg = (leg) => {
    if (selectedLegs.length >= 6) { toast.error('Maximum 6 legs'); return; }
    if (selectedLegs.find(l => l.id === leg.id)) { toast.error('Already added'); return; }
    setSelectedLegs([...selectedLegs, leg]);
    toast.success('Leg added');
  };

  const removeLeg = (legId) => setSelectedLegs(selectedLegs.filter(l => l.id !== legId));

  const calculateParlayOdds = () => {
    if (selectedLegs.length < 2) return null;
    let totalDecimal = 1;
    selectedLegs.forEach(leg => {
      const dec = leg.decimal_odds || ((leg.probability / 100) > 0 ? 1 / (leg.probability / 100) : 2);
      totalDecimal *= dec;
    });
    const american = totalDecimal >= 2 ? `+${Math.round((totalDecimal - 1) * 100)}` : `${Math.round(-100 / (totalDecimal - 1))}`;
    return { probability: (1 / totalDecimal * 100).toFixed(1), american };
  };

  const getEVColor = (ev) => {
    if (ev > 5) return 'text-emerald-400';
    if (ev > 0) return 'text-green-400';
    return 'text-yellow-400';
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/3" />
            <div className="h-16 bg-slate-800 rounded" />
            <div className="h-16 bg-slate-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const parlayData = calculateParlayOdds();

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-violet-950/30 border-slate-800" data-testid="parlay-optimizer">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <CardTitle className="text-lg text-white">AI Parlay Optimizer</CardTitle>
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-800 border-slate-700 text-white p-3">
                <p className="font-semibold mb-1">Parlay Builder</p>
                <p className="text-sm text-slate-300">Click + to add legs. AI suggests uncorrelated bets with positive EV for optimal parlays.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-slate-400">EV-optimized combinations from live odds</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Legs */}
        {selectedLegs.length > 0 && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-violet-400">Your Parlay ({selectedLegs.length} legs)</span>
              {parlayData && (
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{parlayData.american}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({parlayData.probability}%)</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              {selectedLegs.map((leg) => (
                <div key={leg.id} className="flex items-center justify-between text-sm bg-slate-800/50 rounded px-2 py-1">
                  <span className="text-slate-300 truncate flex-1">{leg.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{leg.odds}</span>
                    <button onClick={() => removeLeg(leg.id)} className="text-slate-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimal AI Parlays */}
        {optimalParlays.length > 0 && (
          <div>
            <button
              onClick={() => setShowOptimal(!showOptimal)}
              className="flex items-center gap-1 text-sm text-amber-400 font-semibold mb-2 hover:text-amber-300 transition-colors"
              data-testid="optimal-parlays-toggle"
            >
              <Zap className="w-3.5 h-3.5" />
              AI Optimal Parlays ({optimalParlays.length})
            </button>
            {showOptimal && optimalParlays.map((parlay, idx) => (
              <div key={parlay.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 mb-2" data-testid={`optimal-parlay-${idx}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-amber-400 font-semibold">{parlay.leg_count}-Leg Parlay</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white font-bold">{parlay.combined_odds}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${parlay.risk_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {parlay.risk_level}
                    </span>
                  </div>
                </div>
                {parlay.legs.map((leg, li) => (
                  <div key={li} className="text-xs text-slate-300 py-0.5 flex justify-between">
                    <span className="truncate">{leg.description} <span className="text-slate-500">({leg.sport})</span></span>
                    <span className="text-slate-400 ml-2">{leg.odds}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-amber-500/10">
                  <span className="text-[10px] text-slate-500">Win Prob: {parlay.combined_probability}%</span>
                  <span className={`text-[10px] font-semibold ${parlay.combined_ev > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    EV: {parlay.combined_ev > 0 ? '+' : ''}{parlay.combined_ev}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Individual Leg Suggestions */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Build Your Own
          </p>
          {suggestions.length === 0 ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No suggestions available</p>
              <p className="text-xs text-slate-500">Check back when more games are available</p>
            </div>
          ) : (
            suggestions.slice(0, 4).map((suggestion) => (
              <div 
                key={suggestion.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-violet-500/50 transition-all"
                data-testid={`parlay-suggestion-${suggestion.id}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{suggestion.description}</p>
                    <p className="text-xs text-slate-400">{suggestion.sport} &middot; {suggestion.bet_type} &middot; {suggestion.game_time || ''}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLeg(suggestion)}
                    className="border-violet-500/50 text-violet-400 hover:bg-violet-500/20 h-7 w-7 p-0"
                    data-testid={`add-leg-${suggestion.id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400">{suggestion.odds}</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{suggestion.probability}%</span>
                  </div>
                  <span className={getEVColor(suggestion.ev)}>
                    EV: {suggestion.ev > 0 ? '+' : ''}{suggestion.ev}%
                  </span>
                  {suggestion.confidence === 'high' && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">High</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParlayOptimizer;
