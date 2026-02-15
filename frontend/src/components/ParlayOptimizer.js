import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Sparkles, Info, Zap, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { BACKEND_URL } from '@/config/api';

const ParlayOptimizer = () => {
  const [optimalParlays, setOptimalParlays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSuggestions(); }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const response = await axios.get(`${BACKEND_URL}/api/parlay-optimizer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setOptimalParlays(response.data.optimal_parlays || []);
      }
    } catch (err) {
      console.error('Error fetching parlay suggestions:', err);
    } finally {
      setLoading(false);
    }
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

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-violet-950/30 border-slate-800" data-testid="parlay-optimizer">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <CardTitle className="text-lg text-white">AI Parlay Picks</CardTitle>
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-800 border-slate-700 text-white p-3">
                <p className="font-semibold mb-1">How AI Parlay Picks work</p>
                <p className="text-sm text-slate-300">Our AI scans today's games and builds 2-3 leg parlays with the best chance of hitting. Green EV% means you're getting better odds than you should.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-slate-400">Smart 2-leg parlays picked by AI from live odds</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {optimalParlays.length > 0 ? (
          optimalParlays.map((parlay, idx) => (
            <div key={parlay.id} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3" data-testid={`optimal-parlay-${idx}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400 font-semibold">{parlay.leg_count}-Leg Parlay</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-bold">{parlay.combined_odds}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${parlay.risk_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {parlay.risk_level}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                {parlay.legs.map((leg, li) => (
                  <div key={li} className="text-xs text-slate-300 py-1 px-2 bg-slate-800/30 rounded flex justify-between items-center">
                    <span className="truncate flex-1">{leg.description} <span className="text-slate-500">({leg.sport})</span></span>
                    <span className="text-slate-400 ml-2 font-medium">{leg.odds}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/10">
                <span className="text-[10px] text-slate-500">Win Prob: {parlay.combined_probability}%</span>
                <span className={`text-xs font-bold ${parlay.combined_ev > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  EV: {parlay.combined_ev > 0 ? '+' : ''}{parlay.combined_ev}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No parlay picks available right now</p>
            <p className="text-xs text-slate-500 mt-1">Check back when more games are live</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParlayOptimizer;
