import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Flame, TrendingUp, Clock, Shield, ChevronDown, ChevronUp, Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config/api';

const ConfidenceMeter = ({ score }) => {
  const radius = 54;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-[130px] h-[130px] sm:w-[140px] sm:h-[140px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-4xl font-black text-white">{score}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Confidence</span>
      </div>
    </div>
  );
};

const BetOfTheDay = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReasons, setShowReasons] = useState(false);

  useEffect(() => {
    fetchBetOfDay();
  }, []);

  const fetchBetOfDay = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const res = await axios.get(`${BACKEND_URL}/api/bet-of-the-day`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.pick) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch bet of the day:', err);
    } finally {
      setLoading(false);
    }
  };

  const sharePick = () => {
    if (!data?.pick) return;
    const p = data.pick;
    const text = [
      `BetrSlip - Bet of the Day`,
      `${p.pick} (${p.odds})`,
      `${p.game} | ${p.sport}`,
      `Win Prob: ${p.winning_probability}% | Edge: +${p.edge}%`,
      `Confidence: ${p.confidence_score}/100`,
      ``,
      `betrslip.com`
    ].join('\n');

    if (navigator.share) {
      navigator.share({ title: 'BetrSlip - Bet of the Day', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-900/50 p-6 mb-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-[130px] h-[130px] bg-slate-800 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-slate-800 rounded w-40" />
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="h-4 bg-slate-800 rounded w-48" />
          </div>
        </div>
      </Card>
    );
  }

  if (!data?.pick) return null;

  const pick = data.pick;
  const probColor = pick.winning_probability >= 60 ? 'text-emerald-400' : pick.winning_probability >= 50 ? 'text-amber-400' : 'text-orange-400';

  return (
    <Card
      className="relative overflow-hidden border-slate-700/50 mb-6"
      data-testid="bet-of-the-day"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a0a2e 40%, #0f172a 100%)' }}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-violet-500 to-amber-500" />

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Bet of the Day</h2>
              <p className="text-[10px] sm:text-xs text-slate-500">{data.date} &middot; {data.alternatives_count} games scanned</p>
            </div>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={sharePick}
            className="text-slate-400 hover:text-white h-8 w-8 p-0"
            data-testid="bet-of-day-share"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Confidence Meter */}
          <ConfidenceMeter score={pick.confidence_score} />

          {/* Pick Details */}
          <div className="flex-1 text-center sm:text-left w-full">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold uppercase">{pick.sport}</span>
              <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px] font-medium">{pick.bet_type}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white mb-1">{pick.pick}</h3>
            <p className="text-sm text-slate-400 mb-3">{pick.game}</p>

            {/* Stats row */}
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{pick.odds}</span>
              </div>
              <div className="bg-slate-800/60 rounded-full px-3 py-1">
                <span className={`text-sm font-bold ${probColor}`}>{pick.winning_probability}%</span>
                <span className="text-[10px] text-slate-500 ml-1">win prob</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                <span className="text-sm font-bold text-amber-400">+{pick.edge}%</span>
                <span className="text-[10px] text-slate-500 ml-1">edge</span>
              </div>
              {pick.fading_public && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] font-bold text-red-400 uppercase">Fading Public</span>
                </div>
              )}
            </div>

            {/* Game time + book */}
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {pick.game_time}</span>
              <span>@ {pick.book}</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {pick.books_compared} books</span>
            </div>
          </div>
        </div>

        {/* Reasoning toggle */}
        {pick.reasons?.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowReasons(!showReasons)}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              data-testid="bet-of-day-reasons-toggle"
            >
              {showReasons ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showReasons ? 'Hide analysis' : 'Why this pick?'}
            </button>
            {showReasons && (
              <div className="mt-2 space-y-1.5 pl-1">
                {pick.reasons.map((reason, i) => (
                  <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#10003;</span>
                    {reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default BetOfTheDay;
