import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, Check, X, Sparkles, Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SubscriptionModal = ({ isOpen, onClose, usage }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BACKEND_URL}/api/subscription/create-checkout`,
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating checkout');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="glass border-violet-500/30 p-6 max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Upgrade to Pro</h2>
          <p className="text-slate-400">
            You've used all {usage?.free_limit || 5} free analyses
          </p>
        </div>

        {/* Pricing */}
        <div className="bg-slate-900/50 rounded-xl p-6 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-4xl font-black text-white">$5</span>
            <span className="text-slate-400">/month</span>
          </div>
          <p className="text-emerald-400 text-sm font-semibold">Unlimited Analyses</p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-slate-300 text-sm">Unlimited bet slip analyses</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-slate-300 text-sm">Real-time injury & weather data</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-slate-300 text-sm">Smart improvement suggestions</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-slate-300 text-sm">Historical performance tracking</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-slate-300 text-sm">Cancel anytime</span>
          </div>
        </div>

        {/* CTA */}
        <Button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-6"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {loading ? 'Loading...' : 'Subscribe Now'}
        </Button>

        <p className="text-center text-slate-500 text-xs mt-4">
          Secure payment powered by Stripe
        </p>
      </Card>
    </div>
  );
};

export default SubscriptionModal;
