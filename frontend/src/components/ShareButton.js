import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Download, Copy, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

const ShareButton = ({ resultRef, result }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareImage = async () => {
    if (!resultRef.current) {
      toast.error('No results to share');
      return null;
    }

    setIsGenerating(true);

    try {
      // Create a temporary container for the branded share card
      const shareContainer = document.createElement('div');
      shareContainer.style.position = 'absolute';
      shareContainer.style.left = '-9999px';
      shareContainer.style.background = '#0f172a';
      shareContainer.style.padding = '40px';
      shareContainer.style.width = '600px';
      shareContainer.style.fontFamily = 'Manrope, sans-serif';
      document.body.appendChild(shareContainer);

      // Create branded header
      const header = document.createElement('div');
      header.style.marginBottom = '24px';
      header.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #9333ea); color: white; padding: 8px 16px; border-radius: 8px; font-weight: 900; font-size: 20px;">
              BetrSlip
            </div>
            <div style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 700;">
              ● LIVE
            </div>
          </div>
        </div>
        <div style="color: #94a3b8; font-size: 14px;">AI Bet Slip Analysis</div>
      `;
      shareContainer.appendChild(header);

      // Clone the results content
      const resultsClone = resultRef.current.cloneNode(true);
      resultsClone.style.background = '#1e293b';
      resultsClone.style.borderRadius = '16px';
      resultsClone.style.padding = '24px';
      resultsClone.style.border = '1px solid #334155';
      shareContainer.appendChild(resultsClone);

      // Add footer
      const footer = document.createElement('div');
      footer.style.marginTop = '24px';
      footer.style.paddingTop = '16px';
      footer.style.borderTop = '1px solid #334155';
      footer.style.color = '#64748b';
      footer.style.fontSize = '12px';
      footer.style.textAlign = 'center';
      footer.innerHTML = 'Get your analysis at betrslip.com';
      shareContainer.appendChild(footer);

      // Capture the image
      const canvas = await html2canvas(shareContainer, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Clean up
      document.body.removeChild(shareContainer);

      return canvas;
    } catch (error) {
      console.error('Error generating share image:', error);
      toast.error('Failed to generate image');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const canvas = await generateShareImage();
    if (!canvas) return;

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `betrslip-analysis-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    });
  };

  const handleCopyToClipboard = async () => {
    const canvas = await generateShareImage();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        toast.success('Copied to clipboard! Ready to share.');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy. Try download instead.');
      }
    });
  };

  const handleShare = async () => {
    const canvas = await generateShareImage();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `betrslip-analysis.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'My BetrSlip Analysis',
            text: `Check out my bet analysis! Win probability: ${result.win_probability.toFixed(1)}%`,
            files: [file],
          });
          toast.success('Shared successfully!');
        } catch (error) {
          if (error.name !== 'AbortError') {
            toast.error('Sharing failed. Try download instead.');
          }
        }
      } else {
        // Fallback: download the image
        handleDownload();
      }
    });
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

export default ShareButton;
