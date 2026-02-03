import { useState } from 'react';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { CreditCard, Check, X, Sparkles, Shield, DollarSign, MessageSquare } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID;

const SubscriptionModal = ({ isOpen, onClose, usage }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe', 'paypal', 'cashapp'
  const [cashAppRequested, setCashAppRequested] = useState(false);

  if (!isOpen) return null;

  const handleStripeSubscribe = async () => {
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

  const handlePayPalApprove = async (data, actions) => {
    try {
      const token = localStorage.getItem('token');
      // Capture the PayPal order
      const details = await actions.order.capture();
      
      // Record the payment on our backend
      await axios.post(
        `${BACKEND_URL}/api/subscription/paypal-confirm`,
        { 
          order_id: data.orderID,
          payer_email: details.payer?.email_address,
          amount: details.purchase_units?.[0]?.amount?.value
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Payment successful! Welcome to Pro!');
      window.location.reload();
    } catch (error) {
      console.error('PayPal capture error:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  const handleCashAppRequest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${BACKEND_URL}/api/subscription/cashapp-request`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCashAppRequested(true);
      toast.success('CashApp request submitted!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error submitting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="glass border-violet-500/30 p-6 max-w-md w-full relative my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          data-testid="close-subscription-modal"
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
            {usage?.analyses_used >= (usage?.free_limit || 5) 
              ? `You've used all ${usage?.free_limit || 5} free analyses`
              : 'Get unlimited analyses & daily AI picks'}
          </p>
        </div>

        {/* Pricing */}
        <div className="bg-slate-900/50 rounded-xl p-6 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-4xl font-black text-white">$5</span>
            <span className="text-slate-400">/month</span>
          </div>
          <p className="text-emerald-400 text-sm font-semibold">Unlimited Analyses + Daily AI Picks</p>
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
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-slate-300 text-sm font-semibold">Daily AI Top Picks (Pro Exclusive)</span>
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
            <span className="text-slate-300 text-sm">Historical performance tracking</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-slate-300 text-sm">Cancel anytime</span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs mb-3 text-center">Choose payment method</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('stripe')}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'stripe' 
                  ? 'border-violet-500 bg-violet-500/10' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <CreditCard className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'stripe' ? 'text-violet-400' : 'text-slate-400'}`} />
              <p className={`text-xs ${paymentMethod === 'stripe' ? 'text-violet-400' : 'text-slate-400'}`}>Card</p>
            </button>
            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'paypal' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <DollarSign className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'paypal' ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className={`text-xs ${paymentMethod === 'paypal' ? 'text-blue-400' : 'text-slate-400'}`}>PayPal</p>
            </button>
            <button
              onClick={() => setPaymentMethod('cashapp')}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'cashapp' 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <MessageSquare className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === 'cashapp' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <p className={`text-xs ${paymentMethod === 'cashapp' ? 'text-emerald-400' : 'text-slate-400'}`}>CashApp</p>
            </button>
          </div>
        </div>

        {/* Payment CTAs */}
        {paymentMethod === 'stripe' && (
          <>
            <Button
              onClick={handleStripeSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-6"
              data-testid="stripe-subscribe-btn"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {loading ? 'Loading...' : 'Pay with Card'}
            </Button>
            <p className="text-center text-slate-500 text-xs mt-3">
              Secure payment powered by Stripe
            </p>
          </>
        )}

        {paymentMethod === 'paypal' && (
          <div className="space-y-3">
            {PAYPAL_CLIENT_ID ? (
              <PayPalScriptProvider options={{ 
                clientId: PAYPAL_CLIENT_ID,
                currency: "USD"
              }}>
                <PayPalButtons
                  style={{ layout: "vertical", color: "blue", shape: "rect" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [{
                        amount: {
                          value: "5.00",
                          currency_code: "USD"
                        },
                        description: "BetrSlip Pro Subscription - 1 Month"
                      }]
                    });
                  }}
                  onApprove={handlePayPalApprove}
                  onError={(err) => {
                    console.error('PayPal error:', err);
                    toast.error('PayPal payment failed');
                  }}
                />
              </PayPalScriptProvider>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm mb-3">PayPal coming soon!</p>
                <Button
                  onClick={() => setPaymentMethod('stripe')}
                  variant="outline"
                  className="border-slate-600"
                >
                  Use Card Instead
                </Button>
              </div>
            )}
            <p className="text-center text-slate-500 text-xs">
              One-time $5 payment via PayPal
            </p>
          </div>
        )}

        {paymentMethod === 'cashapp' && (
          <div className="space-y-4">
            {cashAppRequested ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 font-semibold mb-1">Request Submitted!</p>
                <p className="text-slate-400 text-sm">
                  Send $5 to <span className="text-white font-mono font-bold">$BetrSlip</span>
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Include your email in the note. We'll activate your Pro within 24 hours.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-white font-semibold mb-2">Manual CashApp Payment</p>
                  <p className="text-slate-400 text-sm mb-3">
                    Send $5 to <span className="text-emerald-400 font-mono font-bold">$BetrSlip</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    Include your email address in the payment note
                  </p>
                </div>
                <Button
                  onClick={handleCashAppRequest}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-6"
                  data-testid="cashapp-request-btn"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {loading ? 'Submitting...' : 'I Sent Payment - Activate Pro'}
                </Button>
              </>
            )}
            <p className="text-center text-slate-500 text-xs">
              Pro activated within 24 hours after payment verification
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SubscriptionModal;
