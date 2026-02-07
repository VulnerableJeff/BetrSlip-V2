import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, Sparkles, TrendingUp, AlertCircle, CheckCircle, Plus, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ParlayOptimizer = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLegs, setSelectedLegs] = useState([]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const response = await axios.get(`${BACKEND_URL}/api/parlay-optimizer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setSuggestions(response.data.suggestions);
      }
    } catch (err) {
      console.error('Error fetching parlay suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLeg = (leg) => {
    if (selectedLegs.length >= 6) {
      toast.error('Maximum 6 legs allowed');
      return;
    }
    if (selectedLegs.find(l => l.id === leg.id)) {
      toast.error('Leg already added');
      return;
    }
    setSelectedLegs([...selectedLegs, leg]);
    toast.success('Leg added to parlay');
  };

  const removeLeg = (legId) => {
    setSelectedLegs(selectedLegs.filter(l => l.id !== legId));
  };

  const calculateParlayOdds = () => {
    if (selectedLegs.length < 2) return null;
    let totalOdds = 1;
    selectedLegs.forEach(leg => {
      const odds = leg.probability / 100;
      totalOdds *= odds;
    });
    return (totalOdds * 100).toFixed(1);
  };

  const getEVColor = (ev) => {
    if (ev > 5) return 'text-emerald-400';
    if (ev > 0) return 'text-green-400';
    if (ev > -5) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-16 bg-slate-800 rounded"></div>
              <div className="h-16 bg-slate-800 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-violet-950/30 border-slate-800">
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
                <p className="font-semibold mb-1">How to Build a Parlay</p>
                <p className="text-sm text-slate-300 mb-2">Click the <span className="text-violet-400 font-bold">+</span> button to add bets to your parlay. The more legs you add, the higher the payout but lower the win probability.</p>
                <p className="text-xs text-slate-400">💡 Tip: AI suggests bets with positive Expected Value (EV) for better long-term profits.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-slate-400">AI-suggested combinations with best value</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Legs */}
        {selectedLegs.length > 0 && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-violet-400">Your Parlay ({selectedLegs.length} legs)</span>
              {calculateParlayOdds() && (
                <span className="text-sm font-bold text-white">{calculateParlayOdds()}% Win Prob</span>
              )}
            </div>
            <div className="space-y-1">
              {selectedLegs.map((leg) => (
                <div key={leg.id} className="flex items-center justify-between text-sm bg-slate-800/50 rounded px-2 py-1">
                  <span className="text-slate-300 truncate flex-1">{leg.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">{leg.probability}%</span>
                    <button onClick={() => removeLeg(leg.id)} className="text-slate-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Recommended Legs
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
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{suggestion.description}</p>
                    <p className="text-xs text-slate-400">{suggestion.sport} • {suggestion.bet_type}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addLeg(suggestion)}
                    className="border-violet-500/50 text-violet-400 hover:bg-violet-500/20"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{suggestion.probability}% Win</span>
                  </div>
                  <div className={`flex items-center gap-1 ${getEVColor(suggestion.ev)}`}>
                    <span>EV: {suggestion.ev > 0 ? '+' : ''}{suggestion.ev}%</span>
                  </div>
                  {suggestion.confidence === 'high' && (
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                      High Confidence
                    </span>
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
