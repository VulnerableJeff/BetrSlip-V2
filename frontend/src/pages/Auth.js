import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Zap, Shield, Trophy, Target, TrendingUp, Users, Crown, Upload } from 'lucide-react';

import { BACKEND_URL } from '@/config/api';
const API = `${BACKEND_URL}/api`;

const BLOCKED_DOMAINS = [
  'tempmail.com','throwaway.email','guerrillamail.com','mailinator.com',
  'yopmail.com','10minutemail.com','trashmail.com','fakeinbox.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','dispostable.com',
  'maildrop.cc','temp-mail.org','emailondeck.com','getnada.com',
  'mohmal.com','tempail.com','burnermail.io','tempmailo.com',
  'minutemail.com','emailfake.com','crazymailing.com','armyspy.com',
];

const validateEmail = (email) => {
  const trimmed = email.trim().toLowerCase();
  const basic = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
  if (!basic) return { valid: false, error: 'Please enter a valid email address' };

  const domain = trimmed.split('@')[1];
  if (BLOCKED_DOMAINS.includes(domain)) {
    return { valid: false, error: 'Temporary/disposable emails are not allowed. Please use a real email.' };
  }

  const parts = domain.split('.');
  if (parts.length < 2 || parts[parts.length - 1].length < 2) {
    return { valid: false, error: 'Please enter a valid email domain' };
  }

  return { valid: true, error: null };
};

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/public-stats`).then(res => setStats(res.data)).catch(() => {});
  }, []);

  const handleEmailChange = (val) => {
    setEmail(val);
    if (!isLogin && val.length > 3) {
      const result = validateEmail(val);
      setEmailError(result.valid ? '' : result.error);
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin) {
      const result = validateEmail(email);
      if (!result.valid) {
        toast.error(result.error);
        return;
      }
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        toast.error('Emails do not match. Please confirm your email.');
        return;
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const response = await axios.post(`${API}${endpoint}`, {
        email: email.trim().toLowerCase(),
        password,
      });

      onLogin(response.data.token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const emailsMatch = !isLogin && confirmEmail.length > 0 && email.trim().toLowerCase() === confirmEmail.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left - Social Proof & Features */}
        <div className="hidden lg:block space-y-8">
          {/* Brand */}
          <div>
            <div className="inline-flex items-center gap-2 mb-4 cursor-pointer" onClick={() => navigate('/')}>
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-xl opacity-40"></div>
                <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg font-black text-2xl">
                  BetrSlip
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-lg mt-3">
              AI-powered bet analysis that helps you make <span className="text-emerald-400 font-semibold">smarter plays</span>.
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-xl font-black text-white">{stats.total_users || 0}</p>
                <p className="text-slate-500 text-[10px]">Users</p>
              </div>
              <div className="bg-slate-900/60 border border-yellow-500/20 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <p className="text-xl font-black text-yellow-400">{stats.pro_users || 0}</p>
                <p className="text-slate-500 text-[10px]">Pro Members</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <p className="text-xl font-black text-white">{stats.total_analyses?.toLocaleString() || 0}</p>
                <p className="text-slate-500 text-[10px]">Analyzed</p>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Upload Any Bet Slip</p>
                <p className="text-slate-400 text-xs">DraftKings, FanDuel, Hard Rock, BetMGM & more</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Real-Time Data</p>
                <p className="text-slate-400 text-xs">Live odds, injuries, weather & team form</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Daily AI Picks</p>
                <p className="text-slate-400 text-xs">3 high-value bets delivered daily (Pro)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">5 Free Analyses</p>
                <p className="text-slate-400 text-xs">No credit card required to start</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Auth Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Brand (hidden on desktop) */}
          <div className="text-center mb-6 lg:hidden">
            <div className="inline-flex items-center gap-2 mb-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-xl opacity-40"></div>
                <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg font-black text-xl">
                  BetrSlip
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-sm">AI Bet Slip Companion</p>
            {/* Mobile Stats Row */}
            {stats && (
              <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                <span className="text-slate-400"><span className="text-white font-bold">{stats.total_users}</span> users</span>
                <span className="text-yellow-400 font-semibold">{stats.pro_users} Pro</span>
                <span className="text-slate-400"><span className="text-white font-bold">{stats.total_analyses?.toLocaleString()}</span> analyzed</span>
              </div>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl shadow-violet-500/5" data-testid="auth-form">
            <h2 className="text-2xl font-black text-white mb-1">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {isLogin ? 'Sign in to analyze your bets' : 'Start with 5 free analyses'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-300 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="email-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  className={`mt-1 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 h-11 ${emailError ? 'border-red-500' : ''}`}
                />
                {emailError && (
                  <p className="flex items-center gap-1 text-red-400 text-xs mt-1" data-testid="email-error">
                    <AlertCircle className="w-3 h-3" /> {emailError}
                  </p>
                )}
              </div>

              {/* Confirm Email - signup only */}
              {!isLogin && (
                <div>
                  <Label htmlFor="confirmEmail" className="text-slate-300 text-sm">
                    Confirm Email
                  </Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    data-testid="confirm-email-input"
                    placeholder="Retype your email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    required
                    className={`mt-1 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 h-11 ${confirmEmail.length > 0 && !emailsMatch ? 'border-red-500' : emailsMatch ? 'border-emerald-500' : ''}`}
                  />
                  {confirmEmail.length > 0 && !emailsMatch && (
                    <p className="flex items-center gap-1 text-red-400 text-xs mt-1" data-testid="confirm-email-error">
                      <AlertCircle className="w-3 h-3" /> Emails do not match
                    </p>
                  )}
                  {emailsMatch && (
                    <p className="flex items-center gap-1 text-emerald-400 text-xs mt-1" data-testid="confirm-email-match">
                      <CheckCircle2 className="w-3 h-3" /> Emails match
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="password" className="text-slate-300 text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="password-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? undefined : 6}
                  className="mt-1 bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 h-11"
                />
                {!isLogin && (
                  <p className="text-slate-500 text-xs mt-1">Minimum 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                data-testid="auth-submit-btn"
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-violet-500/25"
                disabled={loading || (!isLogin && (!!emailError || !emailsMatch))}
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                data-testid="toggle-auth-mode"
                onClick={() => { setIsLogin(!isLogin); setEmailError(''); setConfirmEmail(''); }}
                className="text-violet-400 hover:text-violet-300 hover:underline text-sm"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            {/* Trust badge */}
            <div className="mt-4 pt-4 border-t border-slate-800/50 text-center">
              <p className="text-slate-500 text-xs flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3" />
                Free to start &bull; No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
