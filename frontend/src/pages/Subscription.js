import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attemptNum = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attemptNum >= maxAttempts) {
      setStatus('error');
      return;
    }

    setAttempts(attemptNum + 1);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${BACKEND_URL}/api/subscription/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        return;
      } else if (response.data.status === 'expired') {
        setStatus('error');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attemptNum + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attemptNum + 1), pollInterval);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950 flex items-center justify-center p-4">
      <Card className="glass border-slate-800 p-8 max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <Loader2 className="w-16 h-16 text-violet-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">Processing Payment</h2>
            <p className="text-slate-400 mb-4">Please wait while we confirm your subscription...</p>
            <p className="text-slate-500 text-sm">Attempt {attempts}/5</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Pro! 🎉</h2>
            <p className="text-slate-400 mb-6">
              Your subscription is now active. Enjoy unlimited bet slip analyses!
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold w-full"
            >
              Start Analyzing
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Issue</h2>
            <p className="text-slate-400 mb-6">
              We couldn't confirm your payment. Please try again or contact support.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950 flex items-center justify-center p-4">
      <Card className="glass border-slate-800 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-12 h-12 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h2>
        <p className="text-slate-400 mb-6">
          No worries! Your free analyses are still available. You can subscribe anytime.
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold w-full"
        >
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export { SubscriptionSuccess, SubscriptionCancel };
