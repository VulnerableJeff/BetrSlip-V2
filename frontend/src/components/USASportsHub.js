import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tv, RefreshCw, ExternalLink, Clock, Trophy, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Legal streaming providers for US sports
const STREAMING_PROVIDERS = {
  NBA: [
    { name: 'ESPN', url: 'https://www.espn.com/watch/', color: 'bg-red-600' },
    { name: 'TNT', url: 'https://www.tntdrama.com/sports/nba', color: 'bg-blue-600' },
    { name: 'NBA League Pass', url: 'https://www.nba.com/watch', color: 'bg-orange-600' },
  ],
  NFL: [
    { name: 'ESPN', url: 'https://www.espn.com/watch/', color: 'bg-red-600' },
    { name: 'NFL+', url: 'https://www.nfl.com/plus/', color: 'bg-blue-800' },
    { name: 'Peacock', url: 'https://www.peacocktv.com/sports/nfl', color: 'bg-purple-600' },
    { name: 'Amazon Prime', url: 'https://www.amazon.com/primevideo', color: 'bg-cyan-600' },
  ],
  NHL: [
    { name: 'ESPN+', url: 'https://plus.espn.com/nhl', color: 'bg-red-600' },
    { name: 'NHL.tv', url: 'https://www.nhl.com/subscribe', color: 'bg-slate-700' },
  ],
  MLB: [
    { name: 'ESPN', url: 'https://www.espn.com/watch/', color: 'bg-red-600' },
    { name: 'MLB.tv', url: 'https://www.mlb.com/live-stream-games', color: 'bg-blue-700' },
  ],
  NCAAF: [
    { name: 'ESPN', url: 'https://www.espn.com/watch/', color: 'bg-red-600' },
    { name: 'FOX Sports', url: 'https://www.foxsports.com/live', color: 'bg-blue-500' },
  ],
  NCAAB: [
    { name: 'ESPN', url: 'https://www.espn.com/watch/', color: 'bg-red-600' },
    { name: 'CBS Sports', url: 'https://www.cbssports.com/college-basketball/', color: 'bg-blue-600' },
  ],
};

const SPORT_ICONS = {
  NBA: '🏀',
  NFL: '🏈',
  NHL: '🏒',
  MLB: '⚾',
  NCAAF: '🏈',
  NCAAB: '🏀',
};

const USASportsHub = () => {
  const [games, setGames] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('NBA');
  const [error, setError] = useState(null);

  const sports = ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAF', 'NCAAB'];

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 120000); // Refresh every 2 min
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/usa-sports/games`);
      if (response.data.success) {
        setGames(response.data.games);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status?.includes('progress') || status?.includes('Half') || status?.includes('Quarter') || status?.includes('Period')) {
      return 'text-red-400 bg-red-500/20';
    }
    if (status?.includes('Final') || status?.includes('End')) {
      return 'text-slate-400 bg-slate-500/20';
    }
    return 'text-emerald-400 bg-emerald-500/20';
  };

  const currentGames = games[selectedSport] || [];
  const providers = STREAMING_PROVIDERS[selectedSport] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Trophy className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">USA Sports</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-800 border-slate-700 text-white p-3">
                  <p className="font-semibold mb-1">Live Scores & Streaming</p>
                  <p className="text-sm text-slate-300">Track live scores for NBA, NFL, NHL, MLB and college sports. Click the streaming service buttons to watch games legally on official platforms.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-slate-400 hidden sm:block">Live scores & where to watch</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchGames}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Sport Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sports.map((sport) => (
          <Button
            key={sport}
            variant={selectedSport === sport ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSport(sport)}
            className={selectedSport === sport 
              ? "bg-violet-600 hover:bg-violet-700 text-white" 
              : "border-slate-700 text-slate-300 hover:bg-slate-800"}
          >
            <span className="mr-1">{SPORT_ICONS[sport]}</span>
            {sport}
            {games[sport]?.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">
                {games[sport].length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Where to Watch */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tv className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Watch {selectedSport} legally on:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <a
              key={provider.name}
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${provider.color} px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-80 transition-opacity flex items-center gap-1`}
            >
              {provider.name}
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Games List */}
      {loading && currentGames.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-400">Loading {selectedSport} games...</p>
          </CardContent>
        </Card>
      ) : currentGames.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No {selectedSport} Games</h3>
            <p className="text-slate-400">Check back later or select another sport</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentGames.map((game, index) => (
            <Card 
              key={index}
              className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all"
            >
              <CardContent className="p-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(game.status)}`}>
                    {game.status || 'Scheduled'}
                  </span>
                  {game.time && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {game.time}
                    </span>
                  )}
                </div>

                {/* Teams */}
                <div className="space-y-3">
                  {/* Away Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.awayLogo && (
                        <img src={game.awayLogo} alt="" className="w-6 h-6" />
                      )}
                      <span className="text-white font-medium">{game.awayTeam}</span>
                      {game.awayRecord && (
                        <span className="text-xs text-slate-500">({game.awayRecord})</span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-white">{game.awayScore ?? '-'}</span>
                  </div>

                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.homeLogo && (
                        <img src={game.homeLogo} alt="" className="w-6 h-6" />
                      )}
                      <span className="text-white font-medium">{game.homeTeam}</span>
                      {game.homeRecord && (
                        <span className="text-xs text-slate-500">({game.homeRecord})</span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-white">{game.homeScore ?? '-'}</span>
                  </div>
                </div>

                {/* Broadcast Info */}
                {game.broadcast && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-xs text-slate-500">
                      📺 {game.broadcast}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default USASportsHub;
