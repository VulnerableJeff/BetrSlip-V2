import { useState } from 'react';
import axios from 'axios';
import { Target, DollarSign, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config/api';

const LogBetModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    bet_type: 'daily_pick',
    result: 'win',
    amount_wagered: '',
    amount_won: '',
    odds: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.amount_wagered) {
      toast.error('Please enter amount wagered');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        amount_wagered: parseFloat(form.amount_wagered) || 0,
        amount_won: form.result === 'win' ? parseFloat(form.amount_won) || 0 : 0
      };

      await axios.post(`${BACKEND_URL}/api/bets/log`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(
        form.result === 'win' 
          ? `Nice win! +$${(payload.amount_won - payload.amount_wagered).toFixed(2)} profit logged!`
          : form.result === 'loss'
          ? `Bet logged. Keep grinding!`
          : `Push logged.`
      );
      
      onClose();
      if (onSuccess) onSuccess();
      
      // Reset form
      setForm({
        bet_type: 'daily_pick',
        result: 'win',
        amount_wagered: '',
        amount_won: '',
        odds: '',
        description: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to log bet');
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
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Target className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Log Bet Result</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Bet Type */}
          <div>
            <label className="text-slate-400 text-sm block mb-2">Bet Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'daily_pick', label: 'Daily Pick' },
                { value: 'analysis', label: 'Analysis' },
                { value: 'custom', label: 'Custom' }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setForm({ ...form, bet_type: type.value })}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    form.bet_type === type.value
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div>
            <label className="text-slate-400 text-sm block mb-2">Result</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setForm({ ...form, result: 'win' })}
                className={`px-3 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.result === 'win'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Win
              </button>
              <button
                onClick={() => setForm({ ...form, result: 'loss' })}
                className={`px-3 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.result === 'loss'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Loss
              </button>
              <button
                onClick={() => setForm({ ...form, result: 'push' })}
                className={`px-3 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.result === 'push'
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Minus className="w-4 h-4" />
                Push
              </button>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-sm block mb-1">Amount Wagered</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  value={form.amount_wagered}
                  onChange={(e) => setForm({ ...form, amount_wagered: e.target.value })}
                  placeholder="100"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-3 text-white"
                />
              </div>
            </div>
            {form.result === 'win' && (
              <div>
                <label className="text-slate-400 text-sm block mb-1">Amount Won (Total)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    value={form.amount_won}
                    onChange={(e) => setForm({ ...form, amount_won: e.target.value })}
                    placeholder="190"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-3 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Odds (optional) */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Odds (optional)</label>
            <input
              type="text"
              value={form.odds}
              onChange={(e) => setForm({ ...form, odds: e.target.value })}
              placeholder="-110, +150, etc."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="text-slate-400 text-sm block mb-1">Notes (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Lakers ML, 4-leg parlay, etc."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
            />
          </div>

          {/* Profit Preview */}
          {form.amount_wagered && (
            <div className={`p-3 rounded-lg ${
              form.result === 'win' ? 'bg-emerald-500/10 border border-emerald-500/30' :
              form.result === 'loss' ? 'bg-red-500/10 border border-red-500/30' :
              'bg-amber-500/10 border border-amber-500/30'
            }`}>
              <p className="text-center text-sm">
                <span className="text-slate-400">Profit/Loss: </span>
                <span className={`font-bold ${
                  form.result === 'win' ? 'text-emerald-400' :
                  form.result === 'loss' ? 'text-red-400' :
                  'text-amber-400'
                }`}>
                  {form.result === 'win' 
                    ? `+$${((parseFloat(form.amount_won) || 0) - (parseFloat(form.amount_wagered) || 0)).toFixed(2)}`
                    : form.result === 'loss'
                    ? `-$${(parseFloat(form.amount_wagered) || 0).toFixed(2)}`
                    : '$0.00'
                  }
                </span>
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !form.amount_wagered}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Log Bet'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LogBetModal;
