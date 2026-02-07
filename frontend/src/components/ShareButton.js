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
        const width = 600;
        const scale = 2;

        // Calculate content
        const prob = result?.win_probability != null ? Number(result.win_probability).toFixed(1) : 'N/A';
        const confidence = result?.confidence_score || result?.confidence || 'N/A';
        const ev = result?.expected_value != null ? `${Number(result.expected_value).toFixed(1)}%` : 'N/A';
        const kelly = result?.kelly_percentage != null ? `${Number(result.kelly_percentage).toFixed(1)}%` : 'N/A';
        const recommendation = result?.recommendation || result?.overall_recommendation || '';
        const bets = result?.bets || result?.individual_bets || [];

        // Estimate height
        let height = 360 + (bets.length * 55);
        if (recommendation) height += 60;

        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Header bar
        const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
        headerGrad.addColorStop(0, '#8b5cf6');
        headerGrad.addColorStop(1, '#9333ea');
        
        // BetrSlip logo area
        ctx.fillStyle = headerGrad;
        roundRect(ctx, 24, 24, 110, 36, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('BetrSlip', 36, 49);

        // LIVE badge
        ctx.fillStyle = '#10b981';
        roundRect(ctx, 146, 28, 64, 26, 13);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillText('● LIVE', 158, 45);

        // Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText('AI Bet Slip Analysis', 24, 84);

        // Divider
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, 96);
        ctx.lineTo(width - 24, 96);
        ctx.stroke();

        let y = 120;

        // Win Probability - big number
        const probColor = Number(prob) >= 60 ? '#10b981' : Number(prob) >= 45 ? '#eab308' : '#ef4444';
        ctx.fillStyle = probColor;
        ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${prob}%`, width / 2, y);
        y += 24;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText('Win Probability', width / 2, y);
        ctx.textAlign = 'left';
        y += 30;

        // Stats row
        const stats = [
          { label: 'Confidence', value: `${confidence}/10`, color: '#8b5cf6' },
          { label: 'Expected Value', value: ev, color: '#10b981' },
          { label: 'Kelly', value: kelly, color: '#3b82f6' }
        ];

        const statWidth = (width - 72) / 3;
        stats.forEach((stat, i) => {
          const sx = 24 + i * (statWidth + 12);
          ctx.fillStyle = '#1e293b';
          roundRect(ctx, sx, y, statWidth, 56, 8);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          roundRect(ctx, sx, y, statWidth, 56, 8);
          ctx.stroke();

          ctx.fillStyle = stat.color;
          ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
          ctx.fillText(stat.value, sx + 12, y + 26);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px system-ui, -apple-system, sans-serif';
          ctx.fillText(stat.label, sx + 12, y + 44);
        });
        y += 76;

        // Recommendation
        if (recommendation) {
          const recColor = recommendation.toUpperCase().includes('BET') ? '#10b981' : 
                          recommendation.toUpperCase().includes('PASS') ? '#ef4444' : '#eab308';
          ctx.fillStyle = recColor + '20';
          roundRect(ctx, 24, y, width - 48, 36, 8);
          ctx.fill();
          ctx.fillStyle = recColor;
          ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Recommendation: ${recommendation}`, width / 2, y + 23);
          ctx.textAlign = 'left';
          y += 52;
        }

        // Individual bets
        if (bets.length > 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.fillText('BET BREAKDOWN', 24, y);
          y += 16;

          bets.forEach((bet) => {
            ctx.fillStyle = '#1e293b';
            roundRect(ctx, 24, y, width - 48, 42, 6);
            ctx.fill();

            const desc = bet.description || bet.bet || 'Bet';
            const betProb = bet.probability || bet.win_probability || '';

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '13px system-ui, -apple-system, sans-serif';
            const truncDesc = desc.length > 40 ? desc.substring(0, 40) + '...' : desc;
            ctx.fillText(truncDesc, 36, y + 26);

            if (betProb) {
              ctx.fillStyle = '#10b981';
              ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
              ctx.textAlign = 'right';
              ctx.fillText(`${betProb}%`, width - 36, y + 26);
              ctx.textAlign = 'left';
            }
            y += 50;
          });
        }

        // Footer
        y = Math.max(y + 10, height - 40);
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(24, y - 12);
        ctx.lineTo(width - 24, y - 12);
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Get your analysis at betrslip.com', width / 2, y + 6);

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
        if (!blob) {
          toast.error('Failed to create image');
          return;
        }
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
      if (!canvas) {
        toast.error('Failed to generate image');
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to create image');
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          toast.success('Copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } catch (clipErr) {
          // Fallback: copy text summary
          const text = `BetrSlip Analysis\nWin Probability: ${result?.win_probability?.toFixed?.(1) || 'N/A'}%\nConfidence: ${result?.confidence_score || 'N/A'}/10\nEV: ${result?.expected_value?.toFixed?.(1) || 'N/A'}%\nGet yours at betrslip.com`;
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success('Analysis summary copied!');
          setTimeout(() => setCopied(false), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Copy failed. Try download instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const canvas = await generateShareCanvas();
      if (!canvas) {
        toast.error('Failed to generate image');
        setIsGenerating(false);
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownload();
          return;
        }

        const file = new File([blob], 'betrslip-analysis.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: 'My BetrSlip Analysis',
              text: `Check out my bet analysis! Win probability: ${result?.win_probability?.toFixed?.(1) || 'N/A'}%`,
              files: [file],
            });
            toast.success('Shared successfully!');
          } catch (shareErr) {
            if (shareErr.name !== 'AbortError') {
              // Fallback to download
              handleDownload();
            }
          }
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `betrslip-analysis-${Date.now()}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast.success('Image downloaded! (Share not supported in this browser)');
        }
        setIsGenerating(false);
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
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
        {copied ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <Copy className="w-4 h-4 mr-2" />
        )}
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

// Helper: Draw rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
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
