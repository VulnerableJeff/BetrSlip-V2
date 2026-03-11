import { useState } from 'react';
import axios from 'axios';
import { Star, Trophy, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config/api';

const SubmitTestimonial = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [winAmount, setWinAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please share your experience');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/testimonials`,
        { rating, message, win_amount: winAmount || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Thank you! Your testimonial has been submitted for review.');
      onClose();
      setMessage('');
      setWinAmount('');
      setRating(5);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="bg-slate-900 border-slate-700 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Share Your Win</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="text-slate-400 text-sm block mb-2">Your Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Win Amount */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Win Amount (optional)</label>
            <input
              type="text"
              value={winAmount}
              onChange={(e) => setWinAmount(e.target.value)}
              placeholder="e.g., $500, 3x parlay"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Your Experience</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share how BetrSlip helped you win..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 h-28 resize-none"
              maxLength={500}
            />
            <p className="text-slate-600 text-xs mt-1 text-right">{message.length}/500</p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Testimonial
              </>
            )}
          </Button>

          <p className="text-slate-500 text-xs text-center">
            Your testimonial will be reviewed before appearing publicly
          </p>
        </div>
      </Card>
    </div>
  );
};

export default SubmitTestimonial;
