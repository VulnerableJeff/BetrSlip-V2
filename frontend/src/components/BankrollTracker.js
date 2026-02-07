import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, Plus, Minus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BankrollTracker = () => {
  const [bankroll, setBankroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('deposit');

  useEffect(() => {
    fetchBankroll();
  }, []);

  const fetchBankroll = async () => {
    try {
      const token = localStorage.getItem('betrslip_token');
      const response = await axios.get(`${BACKEND_URL}/api/bankroll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBankroll(response.data);
    } catch (err) {
      console.error('Error fetching bankroll:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const token = localStorage.getItem('betrslip_token');
      await axios.post(`${BACKEND_URL}/api/bankroll/transaction`, {
        type: transactionType,
        amount: parseFloat(amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${transactionType === 'deposit' ? 'Deposited' : 'Withdrew'} $${amount}`);
      setAmount('');
      setShowAddFunds(false);
      fetchBankroll();
    } catch (err) {
      toast.error('Transaction failed');
    }
  };

  const getROIColor = (roi) => {
    if (roi > 0) return 'text-emerald-400';
    if (roi < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-16 bg-slate-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-violet-950/30 border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <CardTitle className="text-white">Bankroll Tracker</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddFunds(!showAddFunds)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Funds
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Funds Form */}
        {showAddFunds && (
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={transactionType === 'deposit' ? 'default' : 'outline'}
                onClick={() => setTransactionType('deposit')}
                className={transactionType === 'deposit' ? 'bg-emerald-600' : 'border-slate-700'}
              >
                <Plus className="w-4 h-4 mr-1" />
                Deposit
              </Button>
              <Button
                size="sm"
                variant={transactionType === 'withdraw' ? 'default' : 'outline'}
                onClick={() => setTransactionType('withdraw')}
                className={transactionType === 'withdraw' ? 'bg-red-600' : 'border-slate-700'}
              >
                <Minus className="w-4 h-4 mr-1" />
                Withdraw
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <Button onClick={handleTransaction} className="bg-violet-600 hover:bg-violet-700">
                Confirm
              </Button>
            </div>
          </div>
        )}

        {/* Current Bankroll */}
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm mb-1">Current Bankroll</p>
          <p className="text-4xl font-black text-white">
            ${bankroll?.current_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <PiggyBank className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Total Deposited</p>
            <p className="text-lg font-bold text-white">
              ${bankroll?.total_deposited?.toLocaleString() || '0'}
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Total Profit</p>
            <p className={`text-lg font-bold ${getROIColor(bankroll?.total_profit || 0)}`}>
              {bankroll?.total_profit >= 0 ? '+' : ''}${bankroll?.total_profit?.toLocaleString() || '0'}
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <BarChart3 className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">ROI</p>
            <p className={`text-lg font-bold ${getROIColor(bankroll?.roi || 0)}`}>
              {bankroll?.roi >= 0 ? '+' : ''}{bankroll?.roi?.toFixed(1) || '0'}%
            </p>
          </div>
          
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <Target className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Win Rate</p>
            <p className="text-lg font-bold text-white">
              {bankroll?.win_rate?.toFixed(1) || '0'}%
            </p>
          </div>
        </div>

        {/* Recent Transactions */}
        {bankroll?.recent_transactions?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-400 mb-2">Recent Activity</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {bankroll.recent_transactions.slice(0, 5).map((tx, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-slate-800/30 rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    {tx.type === 'deposit' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : tx.type === 'withdraw' ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : tx.type === 'win' ? (
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <DollarSign className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-slate-300 capitalize">{tx.type}</span>
                  </div>
                  <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kelly Criterion Suggestion */}
        {bankroll?.current_balance > 0 && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-violet-400">Kelly Criterion Suggests</span>
            </div>
            <p className="text-xs text-slate-300">
              Based on your bankroll, recommended max bet size: <span className="text-white font-bold">${(bankroll.current_balance * 0.05).toFixed(2)}</span> (5% of bankroll)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BankrollTracker;
