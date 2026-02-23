import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500 blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg font-black text-2xl">
                BetrSlip
              </div>
            </div>
          </div>
          <p className="text-slate-400">AI Bet Slip Companion</p>
        </div>

        {/* Auth Form */}
        <div className="glass rounded-sm p-8" data-testid="auth-form">
          <h2 className="text-2xl font-bold text-white mb-6">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">
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
                className={`mt-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 ${emailError ? 'border-red-500' : ''}`}
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
                <Label htmlFor="confirmEmail" className="text-slate-300">
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
                  className={`mt-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 ${confirmEmail.length > 0 && !emailsMatch ? 'border-red-500' : emailsMatch ? 'border-emerald-500' : ''}`}
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
              <Label htmlFor="password" className="text-slate-300">
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
                className="mt-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
              {!isLogin && (
                <p className="text-slate-500 text-xs mt-1">Minimum 6 characters</p>
              )}
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25"
              disabled={loading || (!isLogin && (!!emailError || !emailsMatch))}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center">
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
        </div>
      </div>
    </div>
  );
};

export default Auth;
