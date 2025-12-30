import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, LogOut, History, TrendingUp, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import InfoTooltip from '@/components/InfoTooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ onLogout }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a betting slip image');
      return;
    }

    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    } finally {
      setAnalyzing(false);
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

  const getWinGlow = (probability) => {
    if (probability >= 70) return 'glow-win';
    if (probability >= 40) return 'shadow-lg shadow-yellow-500/20';
    return 'glow-loss';
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
                data-testid="history-nav-btn"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-violet-500/10"
                onClick={() => navigate('/history')}
              >
                <History className="w-5 h-5 mr-2" />
                History
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Upload Section */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 sm:mb-6" data-testid="upload-section-title">
              Upload Betting Slip
            </h2>
            
            <Card className="glass border-slate-800 p-8" data-testid="upload-card">
              <div className="space-y-6">
                {/* File Input */}
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-sm p-12 hover:border-brand-win/50 transition-colors duration-300">
                  {previewUrl ? (
                    <div className="w-full">
                      <img
                        src={previewUrl}
                        alt="Betting slip preview"
                        data-testid="bet-slip-preview"
                        className="w-full rounded-sm mb-4"
                      />
                      <Button
                        data-testid="change-image-btn"
                        variant="outline"
                        className="w-full border-slate-700 text-white hover:bg-slate-800"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setResult(null);
                        }}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer text-center">
                      <Upload className="w-16 h-16 text-brand-win mx-auto mb-4" />
                      <p className="text-white font-semibold mb-2">Click to upload</p>
                      <p className="text-slate-400 text-sm">PNG, JPG, or WEBP</p>
                      <input
                        type="file"
                        data-testid="file-upload-input"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Analyze Button */}
                <Button
                  data-testid="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={!selectedFile || analyzing}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-lg py-6 rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-violet-500/25"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze Bet Slip'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 sm:mb-6" data-testid="results-section-title">
              Analysis Results
            </h2>
            
            {result ? (
              <Card className="glass border-slate-800 p-6 sm:p-8" data-testid="results-card">
                <div ref={resultRef} className="space-y-4 sm:space-y-6">
                  {/* Win Probability */}
                  <div className={`text-center p-6 sm:p-8 rounded-sm ${getWinGlow(result.win_probability)}`}>
                    <p className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider mb-2">
                      Win Probability
                    </p>
                    <p
                      className={`text-5xl sm:text-6xl font-black ${getWinColor(result.win_probability)}`}
                      data-testid="win-probability"
                    >
                      {result.win_probability.toFixed(1)}%
                    </p>
                    {result.confidence_score && (
                      <p className="text-slate-400 text-xs mt-2 flex items-center justify-center gap-1">
                        Confidence: {result.confidence_score}/10
                        <InfoTooltip text="How confident the AI is in this prediction. 8-10 = high confidence with market data, 5-7 = moderate, 1-4 = limited data available." />
                      </p>
                    )}
                  </div>

                  {/* Recommendation Badge */}
                  {result.recommendation && (
                    <div className="text-center">
                      <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-lg ${
                        result.recommendation === 'STRONG BET' ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                        result.recommendation === 'BET' ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-400' :
                        result.recommendation === 'SMALL/SKIP' ? 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400' :
                        'bg-red-500/10 border border-red-500/50 text-red-400'
                      }`}>
                        {result.recommendation}
                        <InfoTooltip text="AI recommendation based on expected value, Kelly criterion, and confidence. STRONG BET = great value, BET = positive expected value, SMALL/SKIP = marginal, PASS = negative expected value." />
                      </div>
                      {result.expected_value !== null && (
                        <p className="text-slate-400 text-sm mt-2">
                          EV: 
                          <InfoTooltip text="Expected Value: How much you can expect to win or lose per $100 bet on average. Positive means profit, negative means loss." />
                          <span className={result.expected_value > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {result.expected_value > 0 ? '+' : ''}{result.expected_value.toFixed(1)}%
                          </span>
                          {result.kelly_percentage !== null && (
                            <> • Kelly: 
                            <InfoTooltip text="Kelly Criterion: Mathematically optimal bet size as % of your bankroll. Based on your edge and the odds. 0% means don't bet." />
                            <span className="text-violet-400 font-semibold">{result.kelly_percentage.toFixed(1)}%</span></>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Parlay vs Straight Comparison */}
                  {result.parlay_vs_straight && (
                    <div className="bg-gradient-to-r from-violet-950/30 to-purple-950/30 border border-violet-500/30 rounded-lg p-4 sm:p-6">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                        Parlay vs Individual Bets
                        <InfoTooltip text="Compares betting all legs together (parlay) vs betting each leg separately. Individual bets often have better value." />
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-slate-400 text-xs mb-1">
                            Parlay Value
                            <InfoTooltip text="Expected return if you bet all legs as one combined parlay bet." />
                          </p>
                          <p className={`text-xl font-bold ${result.parlay_vs_straight.parlay_ev > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {result.parlay_vs_straight.parlay_ev > 0 ? '+' : ''}{result.parlay_vs_straight.parlay_ev}%
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs mb-1">
                            Individual Value
                            <InfoTooltip text="Expected return if you bet each leg separately as straight bets." />
                          </p>
                          <p className={`text-xl font-bold ${result.parlay_vs_straight.straight_bets_ev > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {result.parlay_vs_straight.straight_bets_ev > 0 ? '+' : ''}{result.parlay_vs_straight.straight_bets_ev}%
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded px-3 py-2 text-center">
                        <p className="text-violet-300 text-sm font-semibold">
                          💡 {result.parlay_vs_straight.recommendation}
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          Value difference: {result.parlay_vs_straight.difference}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Individual Bets Breakdown */}
                  {result.individual_bets && result.individual_bets.length > 0 && (
                    <div className="bg-slate-900/50 rounded-sm p-4 sm:p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-win" />
                        Individual Bet Breakdown
                      </h3>
                      <div className="space-y-3">
                        {result.individual_bets.map((bet, index) => (
                          <div key={index} className="border-l-2 border-brand-win/30 pl-4 py-2">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-white text-xs sm:text-sm font-semibold">
                                {bet.description}
                              </p>
                              {bet.individual_probability && (
                                <span className={`text-xs font-bold ${getWinColor(bet.individual_probability)}`}>
                                  {bet.individual_probability}%
                                </span>
                              )}
                            </div>
                            {bet.odds && (
                              <p className="text-slate-400 text-xs mb-1">Odds: {bet.odds}</p>
                            )}
                            {bet.reasoning && (
                              <p className="text-slate-300 text-xs leading-relaxed">{bet.reasoning}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Factors */}
                  {result.risk_factors && result.risk_factors.length > 0 && (
                    <div className="bg-red-950/20 border border-red-900/30 rounded-sm p-4 sm:p-6">
                      <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Risk Factors
                      </h3>
                      <ul className="space-y-2">
                        {result.risk_factors.map((risk, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Positive Factors */}
                  {result.positive_factors && result.positive_factors.length > 0 && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-sm p-4 sm:p-6">
                      <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        Positive Factors
                      </h3>
                      <ul className="space-y-2">
                        {result.positive_factors.map((factor, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Bet Details */}
                  {result.bet_details && (
                    <div className="bg-slate-900/50 rounded-sm p-4 sm:p-6">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-brand-win" />
                        Bet Summary
                      </h3>
                      <p className="text-slate-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed" data-testid="bet-details">
                        {result.bet_details}
                      </p>
                    </div>
                  )}

                  {/* Analysis */}
                  <div className="bg-slate-900/50 rounded-sm p-4 sm:p-6">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-win" />
                      Overall Assessment
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap" data-testid="analysis-text">
                      {result.analysis_text}
                    </p>
                  </div>
                </div>

                {/* Share Button - Outside the screenshot area */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <ShareButton resultRef={resultRef} result={result} />
                </div>
              </Card>
            ) : (
              <Card className="glass border-slate-800 p-8" data-testid="empty-results-card">
                <div className="text-center py-8 sm:py-12">
                  <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">Upload a betting slip to see analysis</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
