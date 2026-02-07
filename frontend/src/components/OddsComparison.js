import { useState, useEffect } from 'react';
import axios from 'axios';
import { Scale, ExternalLink, TrendingUp, Star, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Sportsbook colors and logos
const SPORTSBOOKS = {
  'DraftKings': { color: 'bg-green-600', short: 'DK' },
  'FanDuel': { color: 'bg-blue-600', short: 'FD' },
  'BetMGM': { color: 'bg-amber-600', short: 'MGM' },
  'Caesars': { color: 'bg-red-600', short: 'CZR' },
  'PointsBet': { color: 'bg-slate-600', short: 'PB' },
  'BetRivers': { color: 'bg-cyan-600', short: 'BR' },
  'Barstool': { color: 'bg-orange-600', short: 'BS' },
};

const OddsComparison = () => {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('NBA');

  const sports = ['NBA', 'NFL', 'NHL', 'MLB'];

  useEffect(() => {
    fetchOdds();
  }, [selectedSport]);

  const fetchOdds = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/odds-comparison?sport=${selectedSport}`);
      if (response.data.success) {
        setComparisons(response.data.comparisons);
      }
    } catch (err) {
      console.error('Error fetching odds comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatOdds = (odds) => {
    if (!odds) return '-';
    return odds > 0 ? `+${odds}` : odds.toString();
  };

  const getBestOddsStyle = (odds, bestOdds) => {
    if (odds === bestOdds) return 'text-emerald-400 font-bold bg-emerald-500/20 rounded px-1';
    return 'text-slate-300';
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/3"></div>
            <div className="h-32 bg-slate-800 rounded"></div>
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
            <Scale className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-lg text-white">Odds Comparison</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-800 border-slate-700 text-white p-3">
                  <p className="font-semibold mb-1">Why Compare Odds?</p>
                  <p className="text-sm text-slate-300 mb-2">Different sportsbooks offer different odds. Getting the best line can mean 2-5% more profit over time. Green highlighted numbers show the best available odds.</p>
                  <p className="text-xs text-slate-400">💡 Always shop for the best line before placing your bet!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOdds}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-slate-400">Find the best odds across sportsbooks</p>
      </CardHeader>
      <CardContent>
        {/* Sport Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {sports.map((sport) => (
            <Button
              key={sport}
              size="sm"
              variant={selectedSport === sport ? "default" : "outline"}
              onClick={() => setSelectedSport(sport)}
              className={selectedSport === sport 
                ? "bg-violet-600 hover:bg-violet-700" 
                : "border-slate-700 text-slate-300"}
            >
              {sport}
            </Button>
          ))}
        </div>

        {/* Comparison Table */}
        {comparisons.length === 0 ? (
          <div className="text-center py-6">
            <Scale className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No odds data available</p>
            <p className="text-xs text-slate-500">Check back when games are scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comparisons.slice(0, 4).map((game, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-3">
                {/* Game Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">{game.game}</p>
                    <p className="text-xs text-slate-400">{game.time}</p>
                  </div>
                  {game.best_value && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <Star className="w-3 h-3" />
                      <span>Best: {game.best_value.book}</span>
                    </div>
                  )}
                </div>

                {/* Odds Grid */}
                <div className="overflow-x-auto">
                  <div className="flex gap-2 min-w-max">
                    {Object.entries(game.odds || {}).map(([book, odds]) => (
                      <div 
                        key={book}
                        className="flex flex-col items-center min-w-[60px]"
                      >
                        <span className={`${SPORTSBOOKS[book]?.color || 'bg-slate-600'} text-white text-xs px-2 py-0.5 rounded font-medium mb-1`}>
                          {SPORTSBOOKS[book]?.short || book.slice(0, 2)}
                        </span>
                        <span className={`text-sm ${getBestOddsStyle(odds.spread, game.best_spread)}`}>
                          {formatOdds(odds.spread)}
                        </span>
                        <span className="text-xs text-slate-500">spread</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Value Indicator */}
                {game.edge && game.edge > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">+{game.edge}% edge at {game.best_value?.book}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sportsbook Links */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-2">Quick Links:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPORTSBOOKS).slice(0, 4).map(([name, info]) => (
              <a
                key={name}
                href={`https://www.${name.toLowerCase().replace(' ', '')}.com`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${info.color} text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80`}
              >
                {info.short}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OddsComparison;
