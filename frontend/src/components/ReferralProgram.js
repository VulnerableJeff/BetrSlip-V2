import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Gift, Copy, Users, Crown, CheckCircle, Share2, Link2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ReferralProgram = () => {
  const [referralData, setReferralData] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchReferralCode();
  }, []);

  const fetchReferralCode = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/referrals/my-code`, { headers });
      setReferralData(response.data);
    } catch (error) {
      console.error('Error fetching referral code:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BetrSlip',
          text: `Get AI-powered bet slip analysis! Use my code ${referralData.code} for bonus features.`,
          url: referralData.referral_link
        });
      } catch (err) {
        copyToClipboard(referralData.referral_link);
      }
    } else {
      copyToClipboard(referralData.referral_link);
    }
  };

  const applyReferralCode = async () => {
    if (!inputCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    setApplying(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/referrals/apply`,
        { code: inputCode.trim() },
        { headers }
      );
      toast.success(response.data.message);
      setInputCode('');
      fetchReferralCode();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply code');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3" />
            <div className="h-16 bg-slate-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-violet-950/30 to-purple-950/30 border-violet-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-violet-400" />
          <CardTitle className="text-lg text-white">Referral Program</CardTitle>
        </div>
        <p className="text-sm text-slate-400">
          Invite friends and earn <span className="text-yellow-400 font-bold">1 week free Pro</span> when they subscribe!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Referral Code */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <p className="text-xs text-slate-400 mb-2">YOUR REFERRAL CODE</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-lg p-3 font-mono text-xl text-center text-violet-400 font-bold tracking-wider">
              {referralData?.code || '--------'}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(referralData?.code)}
              className="border-violet-500/50 text-violet-400 hover:bg-violet-500/20"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Share Link */}
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 truncate">
            {referralData?.referral_link || 'Loading...'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(referralData?.referral_link)}
            className="border-slate-700 text-slate-300"
          >
            <Link2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={shareReferral}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{referralData?.total_referrals || 0}</p>
            <p className="text-xs text-slate-400">Signups</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{referralData?.successful_referrals || 0}</p>
            <p className="text-xs text-slate-400">Subscribed</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-yellow-400">{referralData?.rewards_earned || 0}</p>
            <p className="text-xs text-slate-400">Weeks Earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <p className="text-sm font-semibold text-white mb-3">How it works</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-violet-400">1</span>
              </div>
              <p className="text-sm text-slate-300">Share your unique code with friends</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-violet-400">2</span>
              </div>
              <p className="text-sm text-slate-300">They sign up and use your code</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Crown className="w-3 h-3 text-yellow-400" />
              </div>
              <p className="text-sm text-slate-300">When they go Pro, <span className="text-yellow-400 font-semibold">you get 1 week free!</span></p>
            </div>
          </div>
        </div>

        {/* Apply Code */}
        <div className="border-t border-slate-800 pt-4">
          <p className="text-sm text-slate-400 mb-2">Have a referral code?</p>
          <div className="flex gap-2">
            <Input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="bg-slate-800 border-slate-700 text-white uppercase"
              maxLength={8}
            />
            <Button
              onClick={applyReferralCode}
              disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {applying ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralProgram;
