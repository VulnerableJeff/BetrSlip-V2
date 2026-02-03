import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Tv, Crown, X, ExternalLink, Radio, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LiveGames = ({ usage, onSubscribe }) => {
  const [liveGames, setLiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showAd, setShowAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  const isProUser = usage?.is_subscribed === true;

  useEffect(() => {
    fetchLiveGames();
    // Refresh every 2 minutes
    const interval = setInterval(fetchLiveGames, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveGames = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/live-games`);
      setLiveGames(response.data.games || []);
    } catch (error) {
      console.error('Error fetching live games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchGame = (game) => {
    if (!isProUser) {
      // Show ad for free users
      setSelectedGame(game);
      setShowAd(true);
      setAdCountdown(5);
      
      // Countdown timer
      const timer = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowAd(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Pro users go straight to stream
      setSelectedGame(game);
      setShowAd(false);
    }
  };

  const closePlayer = () => {
    setSelectedGame(null);
    setShowAd(false);
  };

  const getSportEmoji = (sport) => {
    const emojis = {
      'NFL': '🏈',
      'NBA': '🏀',
      'MLB': '⚾',
      'NHL': '🏒',
      'Soccer': '⚽',
      'UFC': '🥊'
    };
    return emojis[sport] || '🎮';
  };

  if (loading) {
    return (
      <Card className="glass border-red-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Tv className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Live Games</h2>
            <p className="text-slate-400 text-sm">Loading streams...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass border-red-500/30 p-6" data-testid="live-games-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center relative">
              <Tv className="w-5 h-5 text-red-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Live Games
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                  LIVE
                </span>
              </h2>
              <p className="text-slate-400 text-sm">
                {liveGames.length} games streaming now
              </p>
            </div>
          </div>
          {!isProUser && (
            <Button
              onClick={onSubscribe}
              size="sm"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold"
            >
              <Crown className="w-4 h-4 mr-1" />
              Ad-Free
            </Button>
          )}
        </div>

        {liveGames.length === 0 ? (
          <div className="text-center py-8">
            <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No live games right now</p>
            <p className="text-slate-500 text-sm mt-1">Check back during game times</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveGames.map((game) => (
              <div
                key={game.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-red-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getSportEmoji(game.sport)}</span>
                    <div>
                      <p className="text-white font-semibold">{game.title}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">{game.sport}</span>
                        {game.network && (
                          <span className="text-blue-400 text-xs px-1.5 py-0.5 bg-blue-500/10 rounded">
                            {game.network}
                          </span>
                        )}
                        {game.score && (
                          <span className="text-emerald-400 font-mono font-bold">
                            {game.score}
                          </span>
                        )}
                        {game.quarter && (
                          <span className="text-yellow-400 text-xs">
                            {game.quarter}
                          </span>
                        )}
                      </div>
                      {/* Stream sources */}
                      {game.stream_sources && game.stream_sources.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {game.stream_sources.slice(0, 3).map((source, idx) => (
                            <span key={idx} className="text-xs text-slate-500">
                              {source.name}{idx < Math.min(game.stream_sources.length, 3) - 1 ? ' •' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleWatchGame(game)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    size="sm"
                    data-testid={`watch-game-${game.id}`}
                  >
                    <Play className="w-4 h-4 mr-1 fill-current" />
                    Watch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isProUser && liveGames.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm text-center">
              <Crown className="w-4 h-4 inline mr-1" />
              Upgrade to Pro for <span className="font-bold">ad-free streaming</span>
            </p>
          </div>
        )}
      </Card>

      {/* Video Player Modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-5xl">
            {/* Ad overlay for free users */}
            {showAd && !isProUser && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md">
                    <p className="text-slate-400 text-sm mb-2">Advertisement</p>
                    <div className="w-full h-48 bg-gradient-to-br from-violet-600 to-purple-800 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                        <p className="text-white font-bold text-lg">BetrSlip Pro</p>
                        <p className="text-white/80 text-sm">Ad-free streaming + Daily Picks</p>
                        <p className="text-yellow-400 font-bold mt-2">Only $5/month</p>
                      </div>
                    </div>
                    <p className="text-white text-lg">
                      Stream starts in <span className="text-red-400 font-bold text-2xl">{adCountdown}</span> seconds
                    </p>
                    <Button
                      onClick={onSubscribe}
                      className="mt-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold"
                    >
                      Skip Ads - Go Pro
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Player header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getSportEmoji(selectedGame.sport)}</span>
                <div>
                  <h3 className="text-white font-bold text-lg">{selectedGame.title}</h3>
                  <p className="text-slate-400 text-sm">
                    {selectedGame.sport} • {selectedGame.score || 'Live'}
                  </p>
                </div>
                {isProUser && (
                  <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                    PRO - AD FREE
                  </span>
                )}
              </div>
              <Button
                onClick={closePlayer}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-700">
              {selectedGame.stream_url ? (
                <iframe
                  src={selectedGame.stream_url}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  title={selectedGame.title}
                />
              ) : selectedGame.external_url ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <Tv className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-4">Stream available on external site</p>
                    <Button
                      onClick={() => window.open(selectedGame.external_url, '_blank')}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Stream
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Stream not available yet</p>
                    <p className="text-slate-500 text-sm mt-2">Check back closer to game time</p>
                  </div>
                </div>
              )}
            </div>

            {/* Game info */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-slate-500">
                {selectedGame.quarter || 'In Progress'} • {selectedGame.network || 'Stream'}
              </p>
              {!isProUser && (
                <p className="text-yellow-400">
                  <Crown className="w-4 h-4 inline mr-1" />
                  Go Pro for ad-free streaming
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveGames;
