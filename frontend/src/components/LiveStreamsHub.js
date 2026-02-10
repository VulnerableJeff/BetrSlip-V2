import { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Tv, Radio, RefreshCw, X, Maximize2, Volume2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { BACKEND_URL } from '@/config/api';

const LiveStreamsHub = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchLiveMatches();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLiveMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/streams/live`);
      if (response.data.success) {
        setMatches(response.data.matches);
        setError(null);
      } else {
        setError(response.data.error || 'Failed to load streams');
      }
    } catch (err) {
      console.error('Error fetching live streams:', err);
      setError('Failed to load live streams');
    } finally {
      setLoading(false);
    }
  };

  const openStream = (match, streamIndex = 0) => {
    setSelectedMatch(match);
    if (match.streams && match.streams.length > 0) {
      setSelectedStream(match.streams[streamIndex]);
    }
  };

  const closeStream = () => {
    setSelectedMatch(null);
    setSelectedStream(null);
    setIsFullscreen(false);
  };

  const switchStream = (streamIndex) => {
    if (selectedMatch && selectedMatch.streams[streamIndex]) {
      setSelectedStream(selectedMatch.streams[streamIndex]);
    }
  };

  if (loading && matches.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading live streams...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Tv className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Live Streams</h2>
            <p className="text-sm text-slate-400">
              {matches.length} match{matches.length !== 1 ? 'es' : ''} live now
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchLiveMatches}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* No Matches */}
      {!loading && matches.length === 0 && !error && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <Radio className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Live Matches</h3>
            <p className="text-slate-400">Check back later for live games</p>
          </CardContent>
        </Card>
      )}

      {/* Live Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((match) => (
          <Card 
            key={match.id} 
            className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 transition-all cursor-pointer group"
            onClick={() => match.has_streams && openStream(match)}
          >
            <CardContent className="p-4">
              {/* League Info */}
              <div className="flex items-center gap-2 mb-3">
                {match.league?.logo && (
                  <img src={match.league.logo} alt="" className="w-5 h-5 rounded" />
                )}
                <span className="text-xs text-slate-400 truncate">
                  {match.league?.name} • {match.league?.country}
                </span>
              </div>

              {/* Teams */}
              <div className="space-y-2 mb-3">
                {/* Home Team */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {match.teams?.home?.badge && (
                      <img src={match.teams.home.badge} alt="" className="w-6 h-6" />
                    )}
                    <span className="text-white font-medium text-sm truncate max-w-[120px]">
                      {match.teams?.home?.name}
                    </span>
                  </div>
                  <span className="text-white font-bold">
                    {match.score?.split(' - ')[0] || '0'}
                  </span>
                </div>
                
                {/* Away Team */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {match.teams?.away?.badge && (
                      <img src={match.teams.away.badge} alt="" className="w-6 h-6" />
                    )}
                    <span className="text-white font-medium text-sm truncate max-w-[120px]">
                      {match.teams?.away?.name}
                    </span>
                  </div>
                  <span className="text-white font-bold">
                    {match.score?.split(' - ')[1] || '0'}
                  </span>
                </div>
              </div>

              {/* Status & Watch Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-400 font-medium">{match.status}</span>
                </div>
                
                {match.has_streams ? (
                  <Button 
                    size="sm" 
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs group-hover:scale-105 transition-transform"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Watch Live
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">No stream</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stream Player Modal */}
      {selectedMatch && selectedStream && (
        <div className={`fixed inset-0 z-50 bg-black/95 flex flex-col ${isFullscreen ? '' : 'p-4 md:p-8'}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-900/80">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-sm font-medium">LIVE</span>
              </div>
              <h3 className="text-white font-semibold">{selectedMatch.title}</h3>
              <span className="text-2xl font-bold text-white">{selectedMatch.score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-slate-400 hover:text-white"
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={closeStream}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stream Selector */}
          <div className="flex items-center gap-2 p-4 bg-slate-900/60 overflow-x-auto">
            <span className="text-slate-400 text-sm mr-2">Sources:</span>
            {selectedMatch.streams.map((stream, index) => (
              <Button
                key={stream.id}
                size="sm"
                variant={selectedStream.id === stream.id ? "default" : "outline"}
                onClick={() => switchStream(index)}
                className={selectedStream.id === stream.id 
                  ? "bg-violet-600 text-white" 
                  : "border-slate-700 text-slate-300"}
              >
                {stream.hd && <span className="text-xs bg-green-500 text-white px-1 rounded mr-1">HD</span>}
                Stream {stream.streamNo}
              </Button>
            ))}
          </div>

          {/* Video Player */}
          <div className="flex-1 relative">
            <iframe
              src={selectedStream.embedUrl}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              scrolling="no"
            />
          </div>

          {/* Footer Info */}
          <div className="p-3 bg-slate-900/80 text-center">
            <p className="text-slate-500 text-xs">
              {selectedMatch.venue && `📍 ${selectedMatch.venue} • `}
              Stream may contain ads from source provider
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStreamsHub;
