import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Gift, Share2, Copy, CheckCircle, Zap } from 'lucide-react';
import { BACKEND_URL } from '@/config/api';

const FreeTrialExtension = ({ usage, onExtended }) => {
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(false);

  // Only show when user has 0 or 1 analyses remaining and is not subscribed
  if (!usage || usage.is_subscribed || usage.analyses_remaining > 1) return null;

  const shareUrl = `${window.location.origin}?ref=share`;
  const shareText = `I use BetrSlip to analyze my bet slips with AI. Try it free: ${shareUrl}`;

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BetrSlip - AI Bet Slip Analysis',
          text: 'I use BetrSlip to analyze my bet slips with AI. Try it free!',
          url: shareUrl,
        });
        await grantExtension();
        return;
      } catch { }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Link copied! Share it to unlock 3 more analyses');
      await grantExtension();
    } catch {
      toast.error('Could not copy link');
    }
  };

  const grantExtension = async () => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/usage/extend`, {
        reason: 'share'
      });
      setShared(true);
      toast.success('3 bonus analyses unlocked!');
      if (onExtended) onExtended();
    } catch (err) {
      if (err.response?.status === 400) {
        toast.info(err.response.data?.detail || 'Extension already used');
      } else {
        toast.error('Could not grant extension');
      }
    } finally {
      setLoading(false);
    }
  };

  if (shared) {
    return (
      <Card className="bg-emerald-500/10 border-emerald-500/30 p-4" data-testid="trial-extended">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-400 font-semibold text-sm">3 Bonus Analyses Unlocked!</p>
            <p className="text-slate-400 text-xs">Thanks for sharing BetrSlip</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 p-4" data-testid="trial-extension-offer">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm">Want 3 more free analyses?</p>
            <p className="text-slate-400 text-xs">Share BetrSlip with a friend to unlock</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleShare}
          disabled={loading}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold whitespace-nowrap"
          data-testid="share-to-extend-btn"
        >
          <Share2 className="w-3.5 h-3.5 mr-1" />
          {loading ? '...' : 'Share & Unlock'}
        </Button>
      </div>
    </Card>
  );
};

export default FreeTrialExtension;
