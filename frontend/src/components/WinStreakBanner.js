import { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, TrendingUp, Trophy, X } from 'lucide-react';
import { BACKEND_URL } from '@/config/api';

const WinStreakBanner = () => {
  const [streak, setStreak] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/picks-performance`);
        const data = res.data;
        if (data.current_streak >= 3 && data.streak_type === 'won') {
          setStreak(data);
        }
      } catch { }
    };
    fetchStreak();
  }, []);

  if (!streak || dismissed) return null;

  const streakCount = streak.current_streak;
  const isHot = streakCount >= 5;

  return (
    <div
      data-testid="win-streak-banner"
      className={`border-b ${isHot
        ? 'bg-gradient-to-r from-yellow-950/60 via-orange-950/40 to-yellow-950/60 border-yellow-500/40'
        : 'bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border-emerald-500/30'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHot ? (
              <div className="flex items-center gap-1">
                <Flame className="w-5 h-5 text-yellow-400 animate-pulse" />
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              </div>
            ) : (
              <Trophy className="w-5 h-5 text-emerald-400" />
            )}
            <p className="text-sm font-semibold">
              <span className={isHot ? 'text-yellow-400' : 'text-emerald-400'}>
                AI is on a {streakCount}-pick win streak!
              </span>
              <span className="text-slate-400 ml-2 hidden sm:inline">
                {streak.win_rate}% overall win rate ({streak.won}W-{streak.lost}L)
              </span>
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinStreakBanner;
