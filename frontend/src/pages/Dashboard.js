import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, LogOut, History, TrendingUp, BarChart3, AlertCircle, CheckCircle2, HelpCircle, Thermometer, Activity, Sparkles, Clock, AlertTriangle, Lightbulb, BookOpen, Target, ShieldAlert, Shield, Crown } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import InfoTooltip from '@/components/InfoTooltip';
import SubscriptionModal from '@/components/SubscriptionModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin email for showing admin link
const ADMIN_EMAIL = 'hundojeff@icloud.com';

// Notification component for analysis time
const AnalysisNotification = ({ onDismiss }) => {
  return (
    <div className="bg-gradient-to-r from-violet-950/80 to-purple-950/80 border border-violet-500/30 rounded-lg p-4 mb-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm mb-1">Analysis in Progress</p>
          <p className="text-slate-300 text-xs">
            Your bet slip analysis typically takes 3-5 minutes. We&apos;re gathering real-time data on injuries, weather, and team stats to give you the most accurate prediction.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white text-xs font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

const Dashboard = ({ onLogout }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [usage, setUsage] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showAnalysisNotification, setShowAnalysisNotification] = useState(false);
  const [hasSeenNotification, setHasSeenNotification] = useState(
    localStorage.getItem('hasSeenAnalysisNotification') === 'true'
  );
  const resultRef = useRef(null);
  const navigate = useNavigate();

  // Fetch usage status on mount
  useEffect(() => {
    fetchUsageStatus();
    // Get user email from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || '');
      } catch (e) {
        console.log('Could not parse token');
      }
    }
  }, []);

  const fetchUsageStatus = async () => {
    try {
      const response = await axios.get(`${API}/usage`);
      setUsage(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

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

  const dismissNotification = () => {
    setShowAnalysisNotification(false);
    setHasSeenNotification(true);
    localStorage.setItem('hasSeenAnalysisNotification', 'true');
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a betting slip image');
      return;
    }

    // Check usage limit first
    if (usage && !usage.is_subscribed && usage.analyses_remaining <= 0) {
      setShowSubscriptionModal(true);
      return;
    }

    setAnalyzing(true);
    
    // Show notification if user hasn't seen it before
    if (!hasSeenNotification) {
      setShowAnalysisNotification(true);
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      setShowAnalysisNotification(false);
      toast.success('Analysis complete!');
      
      // Refresh usage status
      fetchUsageStatus();
    } catch (error) {
      // Check if it's a usage limit error
      if (error.response?.status === 403) {
        const detail = error.response?.data?.detail;
        if (detail?.show_subscription) {
          setShowSubscriptionModal(true);
        } else {
          toast.error(detail?.message || 'Access denied');
        }
      } else {
        toast.error(error.response?.data?.detail || 'Analysis failed');
      }
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
      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)}
        usage={usage}
      />

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
              {/* Usage Badge */}
              {usage && (
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  usage.is_subscribed 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {usage.is_subscribed ? (
                    <>
                      <Crown className="w-3 h-3" />
                      Pro
                    </>
                  ) : (
                    <>
                      <span>{usage.analyses_remaining}/{usage.free_limit} free</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Admin Link - Only for admin user */}
              {userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
                <Button
                  variant="ghost"
                  className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                  onClick={() => navigate('/admin')}
                >
                  <Shield className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <Button
                data-testid="history-nav-btn"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-violet-500/10"
                onClick={() => navigate('/history')}
              >
                <History className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">History</span>
              </Button>
              {!usage?.is_subscribed && (
                <Button
                  variant="ghost"
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => setShowSubscriptionModal(true)}
                >
                  <Crown className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Upgrade</span>
                </Button>
              )}
              <Button
                data-testid="logout-btn"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-violet-500/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Usage Banner for Free Users */}
      {usage && !usage.is_subscribed && usage.analyses_remaining <= 2 && (
        <div className="bg-gradient-to-r from-violet-950/50 to-purple-950/50 border-b border-violet-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <p className="text-violet-200 text-sm">
                {usage.analyses_remaining === 0 
                  ? "You've used all free analyses!"
                  : `⚡ ${usage.analyses_remaining} free ${usage.analyses_remaining === 1 ? 'analysis' : 'analyses'} remaining`
                }
              </p>
              <Button
                size="sm"
                onClick={() => setShowSubscriptionModal(true)}
                className="bg-violet-500 hover:bg-violet-600 text-white text-xs"
              >
                Upgrade to Pro - $5/mo
              </Button>
            </div>
          </div>
        </div>
      )}

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
            
            {/* Analysis Notification */}
            {analyzing && showAnalysisNotification && (
              <AnalysisNotification onDismiss={dismissNotification} />
            )}

            {/* Loading State */}
            {analyzing && (
              <Card className="glass border-slate-800 p-8 text-center">
                <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-white font-bold text-lg mb-2">Analyzing Your Bet Slip</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Gathering real-time data on injuries, weather, and team stats...
                </p>
                <div className="flex items-center justify-center gap-2 text-violet-400 text-xs">
                  <Clock className="w-4 h-4" />
                  <span>This usually takes 3-5 minutes</span>
                </div>
              </Card>
            )}
            
            {!analyzing && result ? (
              <Card className="glass border-slate-800 p-6 sm:p-8" data-testid="results-card">
                <div ref={resultRef} className="space-y-4 sm:space-y-6">
                  
                  {/* Game Status Warning Banner */}
                  {result.games_status?.warning_message && (
                    <div className={`rounded-lg p-4 flex items-start gap-3 ${
                      result.games_status.has_expired && !result.games_status.has_live
                        ? 'bg-orange-950/30 border border-orange-500/50'
                        : result.games_status.has_live
                        ? 'bg-red-950/30 border border-red-500/50'
                        : 'bg-yellow-950/30 border border-yellow-500/50'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        result.games_status.has_live ? 'text-red-400' : 'text-orange-400'
                      }`} />
                      <div>
                        <p className={`font-semibold text-sm ${
                          result.games_status.has_live ? 'text-red-400' : 'text-orange-400'
                        }`}>
                          {result.games_status.warning_message}
                        </p>
                        {result.games_status.expired_games?.length > 0 && (
                          <div className="mt-2 text-xs text-slate-400">
                            <p className="font-medium text-orange-300 mb-1">Completed Games:</p>
                            {result.games_status.expired_games.slice(0, 3).map((game, idx) => (
                              <p key={idx} className="ml-2">• {game.name} - {game.status}</p>
                            ))}
                          </div>
                        )}
                        {result.games_status.live_games?.length > 0 && (
                          <div className="mt-2 text-xs text-slate-400">
                            <p className="font-medium text-red-300 mb-1">Live Now:</p>
                            {result.games_status.live_games.map((game, idx) => (
                              <p key={idx} className="ml-2">🔴 {game.name}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                      </div>
                      {result.expected_value !== null && (
                        <p className="text-slate-400 text-sm mt-2">
                          EV: <span className={result.expected_value > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {result.expected_value > 0 ? '+' : ''}{result.expected_value.toFixed(1)}%
                          </span>
                          {result.kelly_percentage !== null && (
                            <> • Kelly: <span className="text-violet-400 font-semibold">{result.kelly_percentage.toFixed(1)}%</span></>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Real-Time Intelligence Section */}
                  {(result.injuries_data?.length > 0 || result.weather_data || result.team_form_data?.length > 0) && (
                    <div className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/30 rounded-lg p-4 sm:p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                        Real-Time Intelligence
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-3 text-center mb-4">
                        {/* Injuries Summary */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-slate-400 text-xs mb-1">🏥 Injuries</p>
                          {result.injuries_data && result.injuries_data.length > 0 ? (
                            <>
                              <p className="text-red-400 font-bold text-lg">
                                {result.injuries_data.filter(i => i.status === 'Out').length} Key OUT
                              </p>
                              <p className="text-yellow-400 text-xs">
                                {result.injuries_data.filter(i => i.status !== 'Out').length} Questionable
                              </p>
                            </>
                          ) : (
                            <p className="text-emerald-400 font-bold text-sm">No Major Injuries</p>
                          )}
                        </div>

                        {/* Weather Summary */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-slate-400 text-xs mb-1">🌤️ Weather</p>
                          {result.weather_data ? (
                            <>
                              <p className="text-white font-bold text-lg">
                                {result.weather_data.temp <= 32 ? '❄️' : result.weather_data.temp >= 85 ? '🔥' : '☀️'} {result.weather_data.temp?.toFixed(0) || 'N/A'}°F
                              </p>
                              <p className="text-slate-300 text-xs">{result.weather_data.conditions}</p>
                            </>
                          ) : (
                            <p className="text-slate-400 text-sm">🏟️ Indoor/Dome</p>
                          )}
                        </div>

                        {/* Team Form Summary */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <p className="text-slate-400 text-xs mb-1">📈 Form</p>
                          {result.team_form_data && result.team_form_data.length > 0 ? (
                            <>
                              <p className="font-bold text-lg">
                                {result.team_form_data[0]?.form?.split('').map((char, i) => (
                                  <span key={i} className={char === 'W' ? 'text-emerald-400' : 'text-red-400'}>
                                    {char}
                                  </span>
                                ))}
                              </p>
                              <p className="text-slate-300 text-xs">
                                {result.team_form_data[0]?.rating?.includes('Hot') ? '🔥 Hot Streak' :
                                 result.team_form_data[0]?.rating?.includes('Cold') ? '❄️ Cold Streak' :
                                 result.team_form_data[0]?.rating?.includes('Good') ? '✅ Good Form' :
                                 '⚠️ Mixed Form'}
                              </p>
                            </>
                          ) : (
                            <p className="text-slate-400 text-sm">No Data</p>
                          )}
                        </div>
                      </div>

                      {/* Detailed Breakdown */}
                      <div className="space-y-3">
                        {/* Injury Details */}
                        {result.injuries_data && result.injuries_data.length > 0 && (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                              <span>View injury details</span>
                              <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-2 pl-2 border-l-2 border-emerald-500/30 space-y-1">
                              {result.injuries_data.slice(0, 5).map((injury, idx) => (
                                <p key={idx} className="text-xs">
                                  <span className={`font-semibold ${injury.status === 'Out' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {injury.status === 'Out' ? '❌' : '⚠️'} {injury.status}
                                  </span>
                                  <span className="text-slate-300"> - {injury.player}</span>
                                  <span className="text-slate-500"> ({injury.position}) - {injury.injury}</span>
                                </p>
                              ))}
                              {result.injuries_data.length > 5 && (
                                <p className="text-slate-500 text-xs">+{result.injuries_data.length - 5} more injuries</p>
                              )}
                            </div>
                          </details>
                        )}

                        {/* Weather Details */}
                        {result.weather_data && (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                              <span>View weather details</span>
                              <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-2 pl-2 border-l-2 border-emerald-500/30 text-xs text-slate-300 space-y-1">
                              <p>🌡️ Temperature: <span className="text-white font-semibold">{result.weather_data.temp?.toFixed(0)}°F</span></p>
                              <p>💨 Wind: <span className="text-white font-semibold">{result.weather_data.wind_speed?.toFixed(0)} mph</span></p>
                              <p>💧 Humidity: <span className="text-white font-semibold">{result.weather_data.humidity}%</span></p>
                              {result.weather_data.precipitation_chance > 0 && (
                                <p>🌧️ Rain Chance: <span className={result.weather_data.precipitation_chance > 30 ? 'text-yellow-400 font-semibold' : 'text-white font-semibold'}>
                                  {result.weather_data.precipitation_chance}%
                                </span></p>
                              )}
                              {(result.weather_data.temp <= 32 || result.weather_data.wind_speed >= 15 || result.weather_data.precipitation_chance >= 50) && (
                                <p className="text-yellow-400 mt-2">⚠️ Weather may impact game - favors running/defensive play</p>
                              )}
                            </div>
                          </details>
                        )}

                        {/* Team Form Details */}
                        {result.team_form_data && result.team_form_data.length > 0 && (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                              <span>View team form details</span>
                              <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-2 pl-2 border-l-2 border-emerald-500/30 space-y-2">
                              {result.team_form_data.map((team, idx) => (
                                <div key={idx} className="text-xs">
                                  <p className="text-white font-semibold">{team.team}</p>
                                  <p className="text-slate-400">
                                    Record: <span className="text-slate-300">{team.record}</span> • 
                                    Last 5: {team.form?.split('').map((char, i) => (
                                      <span key={i} className={char === 'W' ? 'text-emerald-400' : 'text-red-400'}>
                                        {char}
                                      </span>
                                    ))}
                                  </p>
                                  <p className="text-slate-400">
                                    Avg Margin: <span className={team.avg_margin > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                      {team.avg_margin > 0 ? '+' : ''}{team.avg_margin} pts
                                    </span>
                                  </p>
                                  {team.recent && team.recent.length > 0 && (
                                    <div className="mt-1 text-slate-500">
                                      {team.recent.slice(0, 3).map((game, gIdx) => (
                                        <p key={gIdx} className="ml-2">
                                          {game.startsWith('W') ? '✅' : '❌'} {game}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
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

                  {/* === IMPROVEMENT SUGGESTIONS SECTION === */}
                  {/* Risk Level Warning Banner */}
                  {result.risk_level && ['high', 'extreme'].includes(result.risk_level) && (
                    <div className={`rounded-lg p-4 ${
                      result.risk_level === 'extreme' 
                        ? 'bg-red-950/40 border-2 border-red-500/50' 
                        : 'bg-orange-950/30 border border-orange-500/40'
                    }`}>
                      <div className="flex items-start gap-3">
                        <ShieldAlert className={`w-6 h-6 flex-shrink-0 ${
                          result.risk_level === 'extreme' ? 'text-red-400' : 'text-orange-400'
                        }`} />
                        <div>
                          <h3 className={`font-bold text-sm sm:text-base mb-1 ${
                            result.risk_level === 'extreme' ? 'text-red-400' : 'text-orange-400'
                          }`}>
                            {result.risk_level === 'extreme' ? '🚨 Extreme Risk Bet' : '⚠️ High Risk Bet'}
                          </h3>
                          <p className="text-slate-300 text-xs sm:text-sm">
                            {result.risk_level === 'extreme' 
                              ? `With only ${result.win_probability?.toFixed(1)}% win probability, this bet is essentially a lottery ticket. Consider the suggestions below.`
                              : `This bet has a ${result.win_probability?.toFixed(1)}% chance of winning. See our suggestions to improve your odds.`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Smart Suggestions */}
                  {result.improvement_suggestions && result.improvement_suggestions.length > 0 && (
                    <div className="bg-gradient-to-r from-violet-950/30 to-blue-950/30 border border-violet-500/30 rounded-lg p-4 sm:p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        Smart Suggestions to Improve Your Bet
                      </h3>
                      
                      <div className="space-y-3">
                        {result.improvement_suggestions.map((suggestion, index) => (
                          <div 
                            key={index}
                            className={`rounded-lg p-3 sm:p-4 border ${
                              suggestion.type === 'remove_leg' ? 'bg-red-950/20 border-red-500/30' :
                              suggestion.type === 'bet_individually' ? 'bg-blue-950/20 border-blue-500/30' :
                              suggestion.type === 'alternative' ? 'bg-emerald-950/20 border-emerald-500/30' :
                              suggestion.type === 'stake_warning' ? 'bg-red-950/30 border-red-500/40' :
                              'bg-yellow-950/20 border-yellow-500/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                suggestion.type === 'remove_leg' ? 'bg-red-500/20' :
                                suggestion.type === 'bet_individually' ? 'bg-blue-500/20' :
                                suggestion.type === 'alternative' ? 'bg-emerald-500/20' :
                                'bg-yellow-500/20'
                              }`}>
                                {suggestion.type === 'remove_leg' && <Target className="w-4 h-4 text-red-400" />}
                                {suggestion.type === 'bet_individually' && <BarChart3 className="w-4 h-4 text-blue-400" />}
                                {suggestion.type === 'alternative' && <Lightbulb className="w-4 h-4 text-emerald-400" />}
                                {(suggestion.type === 'stake_warning' || suggestion.type === 'stake_advice') && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-white text-sm mb-1">{suggestion.title}</h4>
                                <p className="text-slate-300 text-xs sm:text-sm mb-2">{suggestion.description}</p>
                                {suggestion.impact && (
                                  <p className={`text-xs font-semibold ${
                                    suggestion.new_probability && suggestion.new_probability > result.win_probability 
                                      ? 'text-emerald-400' 
                                      : 'text-yellow-400'
                                  }`}>
                                    📈 {suggestion.impact}
                                  </p>
                                )}
                                {suggestion.recommended_legs && (
                                  <div className="mt-2 text-xs text-slate-400">
                                    <p className="font-semibold text-violet-400 mb-1">Recommended legs:</p>
                                    {suggestion.recommended_legs.map((leg, i) => (
                                      <p key={i} className="ml-2">✓ {leg}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Educational Tips */}
                  {result.educational_tips && result.educational_tips.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 sm:p-6">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                        Betting Tips & Education
                      </h3>
                      <div className="space-y-2">
                        {result.educational_tips.map((tip, index) => (
                          <p key={index} className="text-slate-300 text-xs sm:text-sm flex items-start gap-2">
                            <span className="text-blue-400 flex-shrink-0">→</span>
                            <span>{tip}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* === END IMPROVEMENT SUGGESTIONS SECTION === */}

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

                  {/* Quick Reference Guide */}
                  <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
                    <details className="group">
                      <summary className="flex items-center gap-2 text-slate-400 text-xs cursor-pointer hover:text-violet-400 transition-colors">
                        <HelpCircle className="w-4 h-4" />
                        <span>What do these terms mean?</span>
                        <span className="ml-auto group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-3 space-y-2 text-xs text-slate-400 pl-6">
                        <p><span className="text-violet-400 font-semibold">EV (Expected Value):</span> Average profit/loss per $100 bet. Positive = profit, negative = loss.</p>
                        <p><span className="text-violet-400 font-semibold">Kelly:</span> Optimal bet size as % of bankroll based on your edge.</p>
                        <p><span className="text-violet-400 font-semibold">Confidence:</span> AI confidence in prediction (8-10 = high, 5-7 = moderate, 1-4 = low).</p>
                        <p><span className="text-violet-400 font-semibold">Parlay vs Individual:</span> Compares combined parlay vs separate bets.</p>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Share Button - Outside the screenshot area */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <ShareButton resultRef={resultRef} result={result} />
                </div>
              </Card>
            ) : !analyzing ? (
              <Card className="glass border-slate-800 p-8" data-testid="empty-results-card">
                <div className="text-center py-8 sm:py-12">
                  <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">Upload a betting slip to see analysis</p>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
