import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, LogOut, BarChart3, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import StatsDashboard from '@/components/StatsDashboard';
import PLTracker from '@/components/PLTracker';

import { BACKEND_URL } from '@/config/api';
const API = `${BACKEND_URL}/api`;

const History = ({ onLogout }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API}/analyses`);
      setHistory(response.data.analyses || []);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const markOutcome = async (betId, outcome, stake = null, payout = null) => {
    setMarking(prev => ({ ...prev, [betId]: true }));
    try {
      await axios.post(`${API}/analysis/${betId}/outcome`, {
        outcome,
        stake_amount: stake,
        payout_amount: payout
      });
      
      toast.success(`Marked as ${outcome}!`);
      // Reload history to show updated stats
      loadHistory();
    } catch (error) {
      toast.error('Failed to mark outcome');
    } finally {
      setMarking(prev => ({ ...prev, [betId]: false }));
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const getWinColor = (probability) => {
    if (probability >= 70) return 'text-brand-win';
    if (probability >= 40) return 'text-yellow-500';
    return 'text-brand-loss';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Header */}
      <header className="border-b border-slate-800 bg-brand-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-lg opacity-40"></div>
                <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 text-white px-3 py-1 rounded-lg font-black text-xl">
                  BetrSlip
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                data-testid="back-to-dashboard-btn"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-violet-500/10"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
              <Button
                data-testid="logout-btn"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-violet-500/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-black text-white mb-8" data-testid="history-title">
          Your Bet History
        </h2>

        {/* Stats Dashboard */}
        <StatsDashboard />

        {/* P/L Performance Tracker */}
        <div className="mb-8">
          <PLTracker />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <Card className="glass border-slate-800 p-12 text-center" data-testid="empty-history">
            <p className="text-slate-400 text-lg mb-4">No bet analyses yet</p>
            <Button
              data-testid="analyze-first-bet-btn"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25"
              onClick={() => navigate('/dashboard')}
            >
              Analyze Your First Bet
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="history-grid">
            {history.map((item) => {
              // Extract data from the analysis object
              const analysis = item.analysis || {};
              const winProbability = analysis.overall_probability || 0;
              const bets = analysis.bets || [];
              const recommendation = analysis.recommendation || '';
              const riskLevel = analysis.risk_level || '';
              const keyFactors = analysis.key_factors || [];
              
              return (
                <Card
                  key={item.id}
                  className="glass border-slate-800 overflow-hidden hover:border-brand-win/50 transition-colors duration-300"
                  data-testid={`history-item-${item.id}`}
                >
                  {/* Header with Risk Level */}
                  <div className={`px-4 py-2 ${
                    riskLevel === 'Low' ? 'bg-emerald-500/20' :
                    riskLevel === 'Medium' ? 'bg-yellow-500/20' :
                    'bg-red-500/20'
                  }`}>
                    <p className="text-xs font-semibold text-slate-300">
                      Risk: {riskLevel || 'N/A'}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Win Probability */}
                    <div className="text-center">
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                        Win Probability
                      </p>
                      <p
                        className={`text-4xl font-black ${getWinColor(winProbability)}`}
                        data-testid="history-win-probability"
                      >
                        {winProbability.toFixed(1)}%
                      </p>
                    </div>

                    {/* Date */}
                    <p className="text-slate-500 text-xs text-center" data-testid="history-date">
                      {formatDate(item.created_at)}
                    </p>

                    {/* Individual Bets Count */}
                    {bets.length > 0 && (
                      <div className="bg-slate-900/70 rounded-sm p-2 text-center">
                        <p className="text-slate-400 text-xs">
                          {bets.length} bet{bets.length > 1 ? 's' : ''} analyzed
                        </p>
                      </div>
                    )}

                    {/* Key Factors */}
                    {keyFactors.length > 0 && (
                      <div className="flex gap-2 justify-center flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-violet-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{keyFactors.length} factors</span>
                        </div>
                      </div>
                    )}

                    {/* Bets Preview */}
                    {bets.length > 0 && (
                      <div className="bg-slate-900/50 rounded-sm p-3">
                        <p className="text-slate-300 text-xs line-clamp-2">
                          {bets[0].description}
                        </p>
                      </div>
                    )}

                    {/* Recommendation */}
                    {recommendation && (
                      <div className="bg-slate-900/50 rounded-sm p-3">
                        <p className="text-slate-300 text-xs line-clamp-3">
                          {recommendation}
                        </p>
                      </div>
                    )}

                    {/* Outcome Buttons */}
                    <div className="mt-2 pt-3 border-t border-slate-800">
                      <p className="text-slate-400 text-xs mb-2 text-center">Did this bet win?</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={marking[item.id]}
                          onClick={() => markOutcome(item.id, 'won')}
                          className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 text-xs"
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Won
                        </Button>
                        <Button
                          size="sm"
                          disabled={marking[item.id]}
                          onClick={() => markOutcome(item.id, 'lost')}
                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 text-xs"
                        >
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          Lost
                        </Button>
                        <Button
                          size="sm"
                          disabled={marking[item.id]}
                          onClick={() => markOutcome(item.id, 'push')}
                          className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 border border-slate-600 text-xs"
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          Push
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
