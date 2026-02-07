import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, ExternalLink, TrendingUp, Star, Sparkles, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Sportsbook info with colors and links
const SPORTSBOOKS = {
  'DraftKings': { color: 'bg-green-600', url: 'https://www.draftkings.com' },
  'FanDuel': { color: 'bg-blue-600', url: 'https://www.fanduel.com' },
  'BetMGM': { color: 'bg-amber-600', url: 'https://www.betmgm.com' },
  'Caesars': { color: 'bg-red-600', url: 'https://www.caesars.com/sportsbook' },
  'PointsBet': { color: 'bg-slate-600', url: 'https://www.pointsbet.com' },
};

const BestValueFinder = ({ analysisResult }) => {
  const [valueFindings, setValueFindings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (analysisResult) {
      fetchBestValue();
    }
  }, [analysisResult]);

  const fetchBestValue = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/best-value-finder`,
        {},
        { headers }
      );
      setValueFindings(response.data);
    } catch (error) {
      console.error('Error fetching best value:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border-emerald-500/30 mt-4">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-800 rounded" />
            <div className="flex-1 h-4 bg-emerald-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!valueFindings?.success || !valueFindings?.findings?.length) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border-emerald-500/30 mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                Best Value Finder
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </CardTitle>
              <p className="text-xs text-slate-400">Find better odds for your bets</p>
            </div>
          </div>
          {valueFindings.average_improvement > 0 && (
            <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
              <span className="text-emerald-400 font-bold text-sm">
                +{valueFindings.average_improvement}% Potential
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-slate-300">{valueFindings.summary}</p>
          </div>
        </div>

        {/* Top Recommendation */}
        {valueFindings.top_recommendation && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold text-white">Best Value Found</span>
              </div>
              <a
                href={SPORTSBOOKS[valueFindings.top_recommendation.best_book]?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`${SPORTSBOOKS[valueFindings.top_recommendation.best_book]?.color || 'bg-slate-600'} 
                  text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80`}
              >
                {valueFindings.top_recommendation.best_book}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-sm text-slate-300 mt-2 truncate">
              {valueFindings.top_recommendation.bet}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-xs">
                <span className="text-slate-400">Your odds: </span>
                <span className="text-white">{valueFindings.top_recommendation.current_odds}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400">Best: </span>
                <span className="text-emerald-400 font-bold">{valueFindings.top_recommendation.best_odds}</span>
              </div>
              <div className="text-xs text-emerald-400">
                +{valueFindings.top_recommendation.savings_percent}% better
              </div>
            </div>
          </div>
        )}

        {/* Toggle for all findings */}
        {valueFindings.findings.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-slate-400 hover:text-white"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide All Comparisons
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                View All {valueFindings.findings.length} Comparisons
              </>
            )}
          </Button>
        )}

        {/* All Findings */}
        {expanded && (
          <div className="space-y-2">
            {valueFindings.findings.map((finding, index) => (
              <div 
                key={index}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white truncate flex-1 mr-2">{finding.bet}</p>
                  <a
                    href={SPORTSBOOKS[finding.best_book]?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${SPORTSBOOKS[finding.best_book]?.color || 'bg-slate-600'} 
                      text-white text-xs px-2 py-0.5 rounded flex items-center gap-1 hover:opacity-80 flex-shrink-0`}
                  >
                    {finding.best_book}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Your: </span>
                    <span className="text-slate-300">{finding.current_odds}</span>
                  </div>
                  <div className="text-slate-500">→</div>
                  <div>
                    <span className="text-slate-500">Best: </span>
                    <span className="text-emerald-400 font-semibold">{finding.best_odds}</span>
                  </div>
                  <div className="ml-auto text-emerald-400 font-medium">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    +{finding.savings_percent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">Compare odds at:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPORTSBOOKS).slice(0, 4).map(([name, info]) => (
              <a
                key={name}
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${info.color} text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:opacity-80`}
              >
                {name}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BestValueFinder;
