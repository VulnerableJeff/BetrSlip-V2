import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Crown, Download, Copy, Zap, Shield, TrendingUp, Clock } from 'lucide-react';

import { BACKEND_URL } from '@/config/api';

const DailyBetCard = ({ isSubscribed }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);

  useEffect(() => { fetchCard(); }, []);

  const fetchCard = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const res = await axios.get(`${BACKEND_URL}/api/daily-bet-card`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch daily bet card:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const w = 600;
      const h = 520;
      canvas.width = w;
      canvas.height = h;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0a0e1a');
      bg.addColorStop(0.5, '#111827');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Neon glow accents
      ctx.fillStyle = 'rgba(124, 58, 237, 0.06)';
      ctx.beginPath();
      ctx.arc(100, 100, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
      ctx.beginPath();
      ctx.arc(500, 400, 180, 0, Math.PI * 2);
      ctx.fill();

      // Top border accent
      const accent = ctx.createLinearGradient(0, 0, w, 0);
      accent.addColorStop(0, '#7c3aed');
      accent.addColorStop(0.5, '#a855f7');
      accent.addColorStop(1, '#10b981');
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, 3);

      // BetrSlip logo
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      const lx = 30, ly = 25;
      ctx.roundRect(lx, ly, 100, 32, 6);
      ctx.fill();
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText('BetrSlip', lx + 12, ly + 17);

      // Date and badge
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(data?.date || '', w - 30, 35);
      ctx.fillStyle = '#10b981';
      ctx.fillText('LIVE DATA', w - 30, 52);
      ctx.textAlign = 'left';

      // Title
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText("Today's Top +EV Picks", 30, 90);

      // Subtitle
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${data?.total_scanned || 0} opportunities scanned`, 30, 112);

      // Picks
      const picks = data?.picks || [];
      const cardY = 130;
      const cardH = 110;
      const gap = 12;

      picks.forEach((pick, i) => {
        const y = cardY + i * (cardH + gap);

        // Card background
        ctx.fillStyle = i === 0 ? 'rgba(124, 58, 237, 0.12)' : 'rgba(30, 41, 59, 0.8)';
        ctx.beginPath();
        ctx.roundRect(30, y, w - 60, cardH, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = i === 0 ? 'rgba(124, 58, 237, 0.4)' : 'rgba(51, 65, 85, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rank circle
        const circleColor = i === 0 ? '#7c3aed' : i === 1 ? '#3b82f6' : '#6366f1';
        ctx.fillStyle = circleColor;
        ctx.beginPath();
        ctx.arc(62, y + 30, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}`, 62, y + 35);
        ctx.textAlign = 'left';

        // Pick description
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pick.pick || '', 90, y + 30);

        // Game
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#94a3b8';
        const gameText = `${pick.game || ''} · ${pick.sport || ''}`;
        ctx.fillText(gameText, 90, y + 52);

        // Bet type + time
        ctx.fillStyle = '#64748b';
        ctx.fillText(`${pick.bet_type || ''} · ${pick.game_time || ''}`, 90, y + 72);

        // Book
        ctx.fillStyle = '#64748b';
        ctx.fillText(`@ ${pick.book || ''}`, 90, y + 90);

        // Odds badge (right side)
        const oddsStr = pick.odds || '';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.beginPath();
        ctx.roundRect(w - 160, y + 14, 100, 30, 6);
        ctx.fill();
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(oddsStr, w - 110, y + 34);

        // Edge badge
        const edgeStr = `+${pick.edge}% EV`;
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.beginPath();
        ctx.roundRect(w - 160, y + 54, 100, 26, 6);
        ctx.fill();
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(edgeStr, w - 110, y + 71);

        // Confidence
        const confColor = pick.confidence === 'high' ? '#10b981' : pick.confidence === 'medium' ? '#f59e0b' : '#94a3b8';
        ctx.fillStyle = confColor;
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(pick.confidence?.toUpperCase() || '', w - 110, y + 96);

        ctx.textAlign = 'left';
      });

      // Footer
      const fy = cardY + picks.length * (cardH + gap) + 10;
      ctx.fillStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.fillRect(30, fy, w - 60, 1);

      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Powered by real-time odds data · Not financial advice', 30, fy + 18);
      ctx.textAlign = 'right';
      ctx.fillText('betrslip.com', w - 30, fy + 18);
      ctx.textAlign = 'left';

      // Download
      const link = document.createElement('a');
      link.download = `betrslip-picks-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card downloaded!');
    } catch (err) {
      toast.error('Failed to generate image');
    }
  }, [data]);

  const copyCard = useCallback(() => {
    if (!data?.picks?.length) return;
    const text = [
      `BetrSlip Daily Picks - ${data.date}`,
      `${data.total_scanned} opportunities scanned`,
      '',
      ...data.picks.map((p, i) =>
        `${i + 1}. ${p.pick} (${p.odds}) +${p.edge}% EV\n   ${p.game} · ${p.sport} @ ${p.book}`
      ),
      '',
      'Powered by BetrSlip · Real-time odds data'
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-800 rounded w-48" />
            <div className="h-24 bg-slate-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pro gate
  if (!isSubscribed || data?.pro_required) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/80 to-violet-950/30 border-violet-500/20 relative overflow-hidden" data-testid="daily-bet-card-pro-gate">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg text-white">Daily Bet Card</CardTitle>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">PRO</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-3 opacity-80" />
            <p className="text-sm font-medium text-white mb-1">Unlock Daily Bet Card</p>
            <p className="text-xs text-slate-400 max-w-[250px] mx-auto">
              Get a shareable card with today's top 3 +EV picks, auto-scanned from live odds across all sportsbooks.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const picks = data?.picks || [];

  if (picks.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800" data-testid="daily-bet-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-lg text-white">Daily Bet Card</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-4">No picks available right now. Check back later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-violet-950/20 border-slate-800 relative overflow-hidden" data-testid="daily-bet-card">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-purple-500 to-emerald-500" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Daily Bet Card</CardTitle>
              <p className="text-[10px] text-slate-500">{data?.date} &middot; {data?.total_scanned} scanned</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={copyCard}
              className="h-7 px-2 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800"
              data-testid="daily-card-copy"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
            <Button
              size="sm"
              onClick={downloadCard}
              className="h-7 px-2 bg-violet-600 hover:bg-violet-500 text-white"
              data-testid="daily-card-download"
            >
              <Download className="w-3 h-3 mr-1" /> Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={cardRef}>
        <div className="space-y-2.5">
          {picks.map((pick, i) => (
            <div
              key={i}
              className={`relative rounded-lg p-3 transition-all ${
                i === 0
                  ? 'bg-violet-500/10 border border-violet-500/30'
                  : 'bg-slate-800/40 border border-slate-700/50'
              }`}
              data-testid={`daily-pick-${i}`}
            >
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white ${
                  i === 0 ? 'bg-violet-600' : i === 1 ? 'bg-blue-600' : 'bg-indigo-600'
                }`}>
                  {i + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{pick.pick}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{pick.game} &middot; {pick.sport}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> {pick.game_time}
                    </span>
                    <span className="text-[10px] text-slate-500">@ {pick.book}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      pick.confidence === 'high'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : pick.confidence === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {pick.confidence}
                    </span>
                  </div>
                </div>

                {/* Odds & Edge */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-emerald-400">{pick.odds}</p>
                  <p className="text-xs font-semibold text-amber-400">+{pick.edge}% EV</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-600" />
            <span className="text-[9px] text-slate-600">Real-time odds · Not financial advice</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span className="text-[9px] text-emerald-600">LIVE</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyBetCard;
