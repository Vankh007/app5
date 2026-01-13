import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Check, Wallet, Mail, Lock, CheckCircle2, ArrowLeft, Plus, Loader2, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import QRCode from 'react-qr-code';
import { toast as sonnerToast } from 'sonner';
import defaultLogoDark from '@/assets/khmerzoon.png';
import defaultLogoLight from '@/assets/logo-light-new.png';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
  device_limit: number;
  show_ads: boolean;
}

type ViewMode = 'plans' | 'auth' | 'topup';

// KHQR Logo Component
const KHQRLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="12" fill="#E31937" />
    <rect x="15" y="15" width="20" height="20" rx="2" fill="white" />
    <rect x="65" y="15" width="20" height="20" rx="2" fill="white" />
    <rect x="15" y="65" width="20" height="20" rx="2" fill="white" />
    <rect x="19" y="19" width="12" height="12" rx="1" fill="#E31937" />
    <rect x="69" y="19" width="12" height="12" rx="1" fill="#E31937" />
    <rect x="19" y="69" width="12" height="12" rx="1" fill="#E31937" />
    <rect x="22" y="22" width="6" height="6" fill="white" />
    <rect x="72" y="22" width="6" height="6" fill="white" />
    <rect x="22" y="72" width="6" height="6" fill="white" />
    <rect x="40" y="15" width="8" height="8" fill="white" />
    <rect x="52" y="15" width="8" height="8" fill="white" />
    <rect x="40" y="40" width="20" height="20" rx="2" fill="white" />
    <rect x="15" y="40" width="8" height="8" fill="white" />
    <rect x="65" y="40" width="8" height="8" fill="white" />
    <rect x="77" y="40" width="8" height="8" fill="white" />
    <rect x="40" y="65" width="8" height="8" fill="white" />
    <rect x="52" y="65" width="8" height="8" fill="white" />
    <rect x="65" y="65" width="20" height="20" rx="2" fill="white" />
    <rect x="77" y="77" width="4" height="4" fill="#E31937" />
  </svg>
);

export const SubscriptionDialog = ({ open, onOpenChange }: SubscriptionDialogProps) => {
  const { toast } = useToast();
  const { user, signUp, signIn, signInWithGoogle } = useAuth();
  const { effectiveTheme } = useTheme();
  const { logos } = useSiteSettings();
  
  // Use dynamic logos from admin settings, fallback to default imports
  const logo = effectiveTheme === 'light' 
    ? (logos.light_logo || defaultLogoLight) 
    : (logos.dark_logo || defaultLogoDark);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  const [viewMode, setViewMode] = useState<ViewMode>('plans');
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // KHQR inline state
  const [topupAmount, setTopupAmount] = useState('10');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [qrChecking, setQrChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed'>('idle');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: plansData } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (plansData) setPlans(plansData);

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setWalletBalance(profileData.wallet_balance || 0);
        }
      }

      setLoading(false);
    };

    if (open) {
      fetchData();
      setViewMode('plans');
    }
  }, [open, user]);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast({ title: 'Please select a plan', variant: 'destructive' });
      return;
    }

    if (!user) {
      setViewMode('auth');
      return;
    }

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    if (walletBalance < plan.price) {
      setViewMode('topup');
      return;
    }

    setSubscribing(true);

    try {
      const { error } = await supabase.rpc('purchase_membership_with_wallet', {
        p_user_id: user.id,
        p_plan_id: plan.id,
        p_amount: plan.price,
      });

      if (error) throw error;

      toast({ 
        title: 'Subscription successful!', 
        description: `You are now subscribed to ${plan.name}` 
      });
      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      toast({ 
        title: 'Subscription failed', 
        description: error.message || 'Please try again later',
        variant: 'destructive' 
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp && !agreedToTerms) {
      toast({
        title: 'Agreement Required',
        description: 'Please agree to the terms and conditions to sign up.',
        variant: 'destructive'
      });
      return;
    }
    
    setAuthLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({
          title: 'Success',
          description: isSignUp ? 'Account created! Please check your email.' : 'Welcome back!'
        });
        if (!isSignUp) {
          setViewMode('plans');
          setEmail('');
          setPassword('');
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTopupSuccess = async (newBalance: number) => {
    setWalletBalance(newBalance);
    setPaymentStatus('idle');
    setQrCode(null);
    setTransactionId(null);
    setViewMode('plans');
    toast({ title: 'Wallet topped up!', description: `New balance: $${newBalance.toFixed(2)}` });
  };

  // KHQR functions
  const generateQRCode = async () => {
    if (!user || !topupAmount || parseFloat(topupAmount) <= 0) {
      sonnerToast.error('Please enter a valid amount');
      return;
    }

    setQrLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        sonnerToast.error('Session expired. Please login again');
        return;
      }

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: { action: 'generate', amount: parseFloat(topupAmount) },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data.success) {
        setQrCode(data.qrCode);
        setTransactionId(data.transactionId);
        setPaymentStatus('pending');
        sonnerToast.success('QR Code generated! Scan to pay');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      sonnerToast.error('Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId || qrChecking || !user) return;
    setQrChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.functions.invoke('khqr-payment', {
        body: { action: 'check', transactionId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (data?.status === 'completed') {
        setPaymentStatus('completed');
        handleTopupSuccess(data.newBalance);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setQrChecking(false);
    }
  };

  // Auto-check payment status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (paymentStatus === 'pending' && transactionId) {
      interval = setInterval(checkPaymentStatus, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [paymentStatus, transactionId]);

  const selectedPlanData = plans.find(p => p.id === selectedPlan);
  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {viewMode === 'plans' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                VIP Membership
              </DialogTitle>
              <DialogDescription>
                Subscribe to unlock premium content and features
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {user && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Your Balance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">${walletBalance.toFixed(2)}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0"
                      onClick={() => setViewMode('topup')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No plans available</p>
                </div>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <span className="text-lg font-bold text-primary">
                        ${plan.price}/{plan.duration} {plan.duration_unit}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.device_limit} devices
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.show_ads ? 'With ads' : 'Ad-free experience'}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Premium content access
                      </li>
                    </ul>
                  </div>
                ))
              )}

              <Button
                className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold"
                onClick={handleSubscribe}
                disabled={!selectedPlan || subscribing}
              >
                {subscribing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    {selectedPlanData ? `Subscribe for $${selectedPlanData.price}` : 'Subscribe Now'}
                  </>
                )}
              </Button>

              {!user && selectedPlan && (
                <p className="text-center text-sm text-muted-foreground">
                  Click subscribe to login or create an account
                </p>
              )}
            </div>
          </>
        )}

        {viewMode === 'auth' && (
          <>
            <DialogHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-4 top-4"
                onClick={() => setViewMode('plans')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex justify-center mb-4 pt-6">
                <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
              </div>
              <DialogTitle className="text-center text-2xl">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </DialogTitle>
              <DialogDescription className="text-center">
                {isSignUp ? 'Join to subscribe to VIP' : 'Sign in to continue'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAuthSubmit} className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-11 h-12"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-11 h-12"
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      agreedToTerms ? 'bg-primary border-primary' : 'border-muted-foreground/50'
                    }`}>
                      {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                    </div>
                  </button>
                  <label 
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                  >
                    I agree to the terms and conditions
                  </label>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12" 
                disabled={authLoading || (isSignUp && !agreedToTerms)}
              >
                {authLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12" 
                onClick={handleGoogleSignIn}
                disabled={authLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary hover:underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          </>
        )}

        {viewMode === 'topup' && (
          <>
            <DialogHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute left-4 top-4"
                onClick={() => {
                  setViewMode('plans');
                  setPaymentStatus('idle');
                  setQrCode(null);
                  setTransactionId(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <DialogTitle className="flex items-center gap-2 pt-6">
                <Wallet className="h-5 w-5 text-primary" />
                Top Up Wallet
              </DialogTitle>
              <DialogDescription>
                {selectedPlanData && walletBalance < selectedPlanData.price && (
                  <span className="text-destructive">
                    You need ${selectedPlanData.price.toFixed(2)} but only have ${walletBalance.toFixed(2)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {paymentStatus === 'idle' && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">Current Balance</span>
                    <span className="font-semibold">${walletBalance.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        variant={topupAmount === amt.toString() ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTopupAmount(amt.toString())}
                        className="font-semibold"
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="Custom amount"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      min="1"
                      className="text-center"
                    />
                  </div>

                  <Button
                    onClick={generateQRCode}
                    disabled={qrLoading || !topupAmount || parseFloat(topupAmount) <= 0}
                    className="w-full h-12 gap-2"
                    size="lg"
                  >
                    {qrLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Add ${parseFloat(topupAmount || '0').toFixed(2)} to Wallet
                      </>
                    )}
                  </Button>
                </>
              )}

              {paymentStatus === 'pending' && qrCode && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 flex justify-center">
                    <QRCode value={qrCode} size={200} />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-lg font-semibold">Scan to Pay ${parseFloat(topupAmount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Use any Cambodian banking app</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for payment...
                  </div>

                  <Button
                    variant="outline"
                    onClick={checkPaymentStatus}
                    disabled={qrChecking}
                    className="w-full"
                  >
                    {qrChecking ? 'Checking...' : 'I have paid'}
                  </Button>
                </div>
              )}

              {paymentStatus === 'completed' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                  <p className="text-lg font-semibold">Payment Successful!</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
