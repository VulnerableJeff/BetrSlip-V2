import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const ShareButton = ({ resultRef, result }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareCanvas = () => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const W = 700;
        const S = 2; // retina scale
        const PAD = 32;

        // Parse result data
        const prob = result?.win_probability != null ? Number(result.win_probability).toFixed(1) : 'N/A';
        const confidence = result?.confidence_score || result?.confidence || 'N/A';
        const ev = result?.expected_value != null ? `${Number(result.expected_value).toFixed(1)}%` : 'N/A';
        const kelly = result?.kelly_percentage != null ? `${Number(result.kelly_percentage).toFixed(1)}%` : 'N/A';
        const recommendation = result?.recommendation || result?.overall_recommendation || '';
        const bets = result?.bets || result?.individual_bets || [];
        const trueOdds = result?.true_odds || '';

        // Calculate dynamic height
        let H = 320 + (bets.length * 52);
        if (recommendation) H += 56;
        H += 48; // footer

        canvas.width = W * S;
        canvas.height = H * S;
        ctx.scale(S, S);

        // === BACKGROUND ===
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0c1222');
        bg.addColorStop(0.5, '#111827');
        bg.addColorStop(1, '#0c1222');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Subtle grid dots
        ctx.fillStyle = 'rgba(139, 92, 246, 0.04)';
        for (let gx = 0; gx < W; gx += 24) {
          for (let gy = 0; gy < H; gy += 24) {
            ctx.beginPath();
            ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // === HEADER ===
        // Gradient accent bar at top
        const topBar = ctx.createLinearGradient(0, 0, W, 0);
        topBar.addColorStop(0, '#8b5cf6');
        topBar.addColorStop(0.5, '#a855f7');
        topBar.addColorStop(1, '#6366f1');
        ctx.fillStyle = topBar;
        ctx.fillRect(0, 0, W, 3);

        let y = 28;

        // Logo pill
        const logoGrad = ctx.createLinearGradient(PAD, y, PAD + 120, y + 32);
        logoGrad.addColorStop(0, '#8b5cf6');
        logoGrad.addColorStop(1, '#7c3aed');
        ctx.fillStyle = logoGrad;
        rr(ctx, PAD, y, 120, 34, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 17px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('BetrSlip', PAD + 16, y + 23);

        // Version tag
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        rr(ctx, PAD + 130, y + 4, 36, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('v2.1', PAD + 139, y + 20);

        // Date & time
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        ctx.fillStyle = '#475569';
        ctx.font = '500 11px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(dateStr, W - PAD, y + 22);
        ctx.textAlign = 'left';

        y += 56;

        // === MAIN CARD ===
        const cardTop = y;
        const cardH = H - y - 44;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
        rr(ctx, PAD - 4, cardTop, W - (PAD * 2) + 8, cardH, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.lineWidth = 0.5;
        rr(ctx, PAD - 4, cardTop, W - (PAD * 2) + 8, cardH, 16);
        ctx.stroke();

        y += 20;

        // Win Probability
        const probNum = parseFloat(prob);
        const probColor = probNum >= 60 ? '#10b981' : probNum >= 40 ? '#eab308' : '#ef4444';

        // Glow effect behind probability
        const glow = ctx.createRadialGradient(W / 2, y + 24, 0, W / 2, y + 24, 100);
        glow.addColorStop(0, probColor + '15');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, y - 10, W, 80);

        ctx.fillStyle = probColor;
        ctx.font = '800 56px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${prob}%`, W / 2, y + 48);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 13px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Win Probability', W / 2, y + 68);
        ctx.textAlign = 'left';

        y += 92;

        // === STATS ROW ===
        const statW = (W - PAD * 2 - 24) / 3;
        const stats = [
          { label: 'Confidence', value: `${confidence}/10`, color: '#a78bfa' },
          { label: 'Expected Value', value: ev, color: parseFloat(ev) >= 0 ? '#34d399' : '#f87171' },
          { label: 'Kelly Criterion', value: kelly, color: '#60a5fa' }
        ];

        stats.forEach((stat, i) => {
          const sx = PAD + i * (statW + 12);

          // Stat card background
          ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          rr(ctx, sx, y, statW, 64, 10);
          ctx.fill();

          // Colored top accent
          ctx.fillStyle = stat.color + '40';
          rr(ctx, sx, y, statW, 3, 10);
          ctx.fill();

          // Value
          ctx.fillStyle = stat.color;
          ctx.font = '700 20px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(stat.value, sx + 14, y + 30);

          // Label
          ctx.fillStyle = '#64748b';
          ctx.font = '500 11px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(stat.label, sx + 14, y + 50);
        });

        y += 84;

        // === RECOMMENDATION ===
        if (recommendation) {
          const isPositive = recommendation.toUpperCase().includes('BET') || recommendation.toUpperCase().includes('LEAN');
          const isNeutral = recommendation.toUpperCase().includes('CAUTION');
          const recBg = isPositive ? '#064e3b' : isNeutral ? '#713f12' : '#450a0a';
          const recColor = isPositive ? '#34d399' : isNeutral ? '#fbbf24' : '#f87171';
          const recBorder = isPositive ? '#065f4630' : isNeutral ? '#854d0e30' : '#7f1d1d30';

          ctx.fillStyle = recBg + '80';
          rr(ctx, PAD, y, W - PAD * 2, 40, 8);
          ctx.fill();
          ctx.strokeStyle = recBorder;
          ctx.lineWidth = 1;
          rr(ctx, PAD, y, W - PAD * 2, 40, 8);
          ctx.stroke();

          // Icon
          const icon = isPositive ? '✓' : isNeutral ? '⚠' : '✕';
          ctx.fillStyle = recColor;
          ctx.font = '700 13px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${icon}  ${recommendation.toUpperCase()}`, W / 2, y + 26);
          ctx.textAlign = 'left';

          y += 56;
        }

        // === BET BREAKDOWN ===
        if (bets.length > 0) {
          // Section header
          ctx.fillStyle = '#475569';
          ctx.font = '600 10px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.letterSpacing = '2px';
          ctx.fillText('INDIVIDUAL BETS', PAD, y + 2);

          // Thin line
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD + 100, y - 2);
          ctx.lineTo(W - PAD, y - 2);
          ctx.stroke();

          y += 16;

          bets.forEach((bet, i) => {
            const desc = bet.description || bet.bet || 'Bet';
            const betProb = bet.probability || bet.win_probability || '';

            // Row background (alternating subtle)
            if (i % 2 === 0) {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
              rr(ctx, PAD, y, W - PAD * 2, 42, 6);
              ctx.fill();
            }

            // Bet description - allow more chars
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '500 13px -apple-system, "Segoe UI", Roboto, sans-serif';
            const maxChars = 55;
            const truncDesc = desc.length > maxChars ? desc.substring(0, maxChars) + '...' : desc;
            ctx.fillText(truncDesc, PAD + 12, y + 27);

            // Probability badge
            if (betProb) {
              const bp = parseFloat(betProb);
              const bpColor = bp >= 55 ? '#34d399' : bp >= 45 ? '#fbbf24' : '#f87171';
              
              // Badge background
              ctx.fillStyle = bpColor + '20';
              rr(ctx, W - PAD - 62, y + 10, 50, 24, 6);
              ctx.fill();

              ctx.fillStyle = bpColor;
              ctx.font = '700 13px -apple-system, "Segoe UI", Roboto, sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText(`${betProb}%`, W - PAD - 18, y + 27);
              ctx.textAlign = 'left';
            }

            y += 48;
          });
        }

        // === FOOTER ===
        y = H - 36;
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD, y - 8);
        ctx.lineTo(W - PAD, y - 8);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '500 11px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('betrslip.com  •  AI-Powered Bet Analysis', W / 2, y + 8);
        ctx.textAlign = 'left';

        resolve(canvas);
      } catch (error) {
        console.error('Error generating share canvas:', error);
        resolve(null);
      }
    });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateShareCanvas();
      if (!canvas) {
        toast.error('Failed to generate image');
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) { toast.error('Failed to create image'); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `betrslip-analysis-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Image downloaded!');
      }, 'image/png');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateShareCanvas();
      if (!canvas) { toast.error('Failed to generate image'); return; }
      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error('Failed to create image'); return; }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true);
          toast.success('Copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } catch {
          const text = `BetrSlip Analysis\nWin Probability: ${result?.win_probability?.toFixed?.(1) || 'N/A'}%\nConfidence: ${result?.confidence_score || 'N/A'}/10\nEV: ${result?.expected_value?.toFixed?.(1) || 'N/A'}%\nbetrslip.com`;
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success('Analysis summary copied!');
          setTimeout(() => setCopied(false), 2000);
        }
      }, 'image/png');
    } catch (err) {
      toast.error('Copy failed. Try download instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateShareCanvas();
      if (!canvas) { toast.error('Failed to generate image'); setIsGenerating(false); return; }
      canvas.toBlob(async (blob) => {
        if (!blob) { handleDownload(); return; }
        const file = new File([blob], 'betrslip-analysis.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: 'My BetrSlip Analysis',
              text: `Check out my bet analysis! Win probability: ${result?.win_probability?.toFixed?.(1) || 'N/A'}%`,
              files: [file],
            });
            toast.success('Shared successfully!');
          } catch (e) {
            if (e.name !== 'AbortError') handleDownload();
          }
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `betrslip-analysis-${Date.now()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success('Image downloaded!');
        }
        setIsGenerating(false);
      }, 'image/png');
    } catch {
      toast.error('Share failed. Try download instead.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleShare}
        disabled={isGenerating}
        className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/25 flex-1 sm:flex-initial"
        data-testid="share-btn"
      >
        <Share2 className="w-4 h-4 mr-2" />
        {isGenerating ? 'Generating...' : 'Share'}
      </Button>
      <Button
        onClick={handleCopyToClipboard}
        disabled={isGenerating}
        variant="outline"
        className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
        data-testid="copy-btn"
      >
        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        variant="outline"
        className="border-slate-700 text-slate-300 hover:bg-slate-800"
        data-testid="download-btn"
      >
        <Download className="w-4 h-4 mr-2" />
        Download
      </Button>
    </div>
  );
};

// Rounded rectangle helper
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default ShareButton;
