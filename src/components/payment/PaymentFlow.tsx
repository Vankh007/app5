import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Calendar, Tv, AlertCircle, Crown, Check, Wallet, ArrowLeft, Loader2, QrCode, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { AuthDialog } from '@/components/AuthDialog';
import QRCode from 'react-qr-code';
import { toast as sonnerToast } from 'sonner';

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

type FlowStep = 'plans' | 'payment' | 'topup' | 'processing' | 'success';

interface PaymentFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'rent' | 'subscribe';
  // Rental specific
  title?: string;
  mediaId?: string;
  mediaType?: string;
  rentalPrice?: number;
  rentalPeriodDays?: number;
  onSuccess?: () => void;
}

export const PaymentFlow = ({
  open,
  onOpenChange,
  mode,
  title,
  mediaId,
  mediaType,
  rentalPrice = 0,
  rentalPeriodDays = 7,
  onSuccess
}: PaymentFlowProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, loading: walletLoading, refetch: refetchBalance } = useWallet();
  
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [step, setStep] = useState<FlowStep>(mode === 'rent' ? 'payment' : 'plans');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(balance);

  // KHQR state
  const [topupAmount, setTopupAmount] = useState('10');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrChecking, setQrChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed'>('idle');

  // Update wallet balance when it changes
  useEffect(() => {
    setWalletBalance(balance);
  }, [balance]);

  // Fetch plans when dialog opens in subscribe mode
  useEffect(() => {
    const fetchPlans = async () => {
      if (mode === 'subscribe' && open) {
        setPlansLoading(true);
        const { data } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (data) setPlans(data);
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, [mode, open]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(mode === 'rent' ? 'payment' : 'plans');
      setSelectedPlan(null);
      setQrCode(null);
      setTransactionId(null);
      setPaymentStatus('idle');
    }
  }, [open, mode]);

  // Check payment status periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentStatus === 'pending' && transactionId) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStatus, transactionId]);

  // Check if user is logged in when trying to proceed
  const checkAuthAndProceed = (callback: () => void) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    callback();
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const getRequiredAmount = () => {
    if (mode === 'rent') return rentalPrice;
    return selectedPlan?.price || 0;
  };

  const insufficientBalance = walletBalance < getRequiredAmount();

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
        body: {
          action: 'generate',
          amount: parseFloat(topupAmount),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setQrCode(data.qrCode);
        setTransactionId(data.transactionId);
        setPaymentStatus('pending');
        sonnerToast.success('QR Code generated! Scan with Bakong app to pay');
      } else {
        throw new Error('Failed to generate QR code');
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
      
      if (!session) {
        setQrChecking(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: {
          action: 'check',
          transactionId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        setQrChecking(false);
        return;
      }

      if (data.status === 'completed') {
        setPaymentStatus('completed');
        setWalletBalance(data.newBalance);
        await refetchBalance();
        sonnerToast.success(`Successfully added $${parseFloat(topupAmount).toFixed(2)} to wallet!`);
        
        // Return to payment step
        setTimeout(() => {
          setStep('payment');
          setQrCode(null);
          setTransactionId(null);
          setPaymentStatus('idle');
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setQrChecking(false);
    }
  };

  const handleRentPayment = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    if (insufficientBalance) {
      setTopupAmount(Math.ceil(rentalPrice - walletBalance + 1).toString());
      setStep('topup');
      return;
    }

    setStep('processing');
    setLoading(true);
    try {
      // Use RPC function for atomic wallet deduction + purchase creation
      const { error } = await supabase.rpc('purchase_content_with_wallet', {
        p_user_id: user.id,
        p_content_id: mediaId,
        p_amount: rentalPrice,
        p_currency: 'USD'
      });

      if (error) {
        if (error.message?.includes('Insufficient')) {
          toast({ title: 'Insufficient balance', variant: 'destructive' });
          setStep('topup');
          return;
        }
        throw error;
      }

      await refetchBalance();
      setStep('success');
      toast({ title: `Successfully rented "${title}" for ${rentalPeriodDays} days!` });
      
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Rental error:', error);
      toast({ title: 'Failed to process rental', variant: 'destructive' });
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribePayment = async () => {
    if (!user || !selectedPlan) {
      return;
    }

    if (insufficientBalance) {
      setTopupAmount(Math.ceil(selectedPlan.price - walletBalance + 1).toString());
      setStep('topup');
      return;
    }

    setStep('processing');
    setLoading(true);
    try {
      // Use RPC function for atomic wallet deduction + membership creation
      const { error } = await supabase.rpc('purchase_membership_with_wallet', {
        p_user_id: user.id,
        p_plan_id: selectedPlan.id,
        p_amount: selectedPlan.price
      });

      if (error) {
        if (error.message?.includes('Insufficient')) {
          toast({ title: 'Insufficient balance', variant: 'destructive' });
          setStep('topup');
          return;
        }
        throw error;
      }

      await refetchBalance();
      setStep('success');
      toast({ title: `Successfully subscribed to ${selectedPlan.name}!` });
      
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Subscription error:', error);
      toast({ title: 'Failed to process subscription', variant: 'destructive' });
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [5, 10, 20, 50];

  // Render Plans Step (Subscribe mode)
  const renderPlansStep = () => (
    <div className="space-y-4">
      {plansLoading ? (
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
              selectedPlan?.id === plan.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{plan.name}</h3>
              <span className="text-lg font-bold text-primary">
                ${plan.price}/{plan.duration_unit}
              </span>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {plan.device_limit} devices
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {plan.show_ads ? 'With ads' : 'Ad-free'}
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
        onClick={() => selectedPlan && checkAuthAndProceed(() => setStep('payment'))}
        disabled={!selectedPlan}
      >
        <Crown className="h-4 w-4" />
        Continue to Payment
      </Button>
    </div>
  );

  // Render Payment Step
  const renderPaymentStep = () => {
    const amount = getRequiredAmount();
    const itemName = mode === 'rent' ? title : selectedPlan?.name;

    return (
      <div className="space-y-4">
        {mode === 'subscribe' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setStep('plans')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Plans
          </Button>
        )}

        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {mode === 'rent' ? 'Content' : 'Plan'}
            </span>
            <span className="font-medium">{itemName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="font-semibold text-primary">${amount}</span>
          </div>
          {mode === 'rent' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rental Period</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {rentalPeriodDays} days
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className={`font-medium ${insufficientBalance ? 'text-destructive' : 'text-green-500'}`}>
              {walletLoading ? '...' : `$${walletBalance.toFixed(2)}`}
            </span>
          </div>
        </div>

        {insufficientBalance && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Insufficient Balance</p>
              <p className="text-xs mt-1">
                You need ${(amount - walletBalance).toFixed(2)} more. Top up your wallet to continue.
              </p>
            </div>
          </div>
        )}

        <Button
          className="w-full gap-2"
          onClick={() => {
            if (insufficientBalance) {
              setTopupAmount(Math.ceil(amount - walletBalance + 1).toString());
              checkAuthAndProceed(() => setStep('topup'));
              return;
            }

            if (mode === 'rent') {
              handleRentPayment();
            } else {
              handleSubscribePayment();
            }
          }}
          disabled={loading}
        >
          {insufficientBalance ? (
            <>
              <Wallet className="h-4 w-4" />
              Top Up Wallet
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4" />
              {loading ? 'Processing...' : `Pay $${amount}`}
            </>
          )}
        </Button>
      </div>
    );
  };

  // Render Topup Step with KHQR
  const renderTopupStep = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setStep('payment');
          setQrCode(null);
          setTransactionId(null);
          setPaymentStatus('idle');
        }}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        <p>Your balance: <span className="text-primary font-semibold">${walletBalance.toFixed(2)}</span></p>
        <p>Required: <span className="text-yellow-500 font-semibold">${getRequiredAmount().toFixed(2)}</span></p>
      </div>

      {paymentStatus === 'idle' && (
        <>
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Amount (USD)"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              min="1"
              className="text-center"
            />
            <div className="grid grid-cols-4 gap-1">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant={topupAmount === amt.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopupAmount(amt.toString())}
                  className="text-xs"
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={generateQRCode}
            disabled={qrLoading || !topupAmount || parseFloat(topupAmount) <= 0}
            className="w-full gap-2"
          >
            {qrLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            Generate Bakong KHQR
          </Button>
        </>
      )}

      {paymentStatus === 'pending' && qrCode && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4 flex justify-center">
            <QRCode value={qrCode} size={200} />
          </div>
          <p className="text-center text-sm font-medium">
            Scan to Pay ${parseFloat(topupAmount).toFixed(2)}
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Waiting for Bakong payment...
          </div>
          <Button
            variant="outline"
            size="sm"
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
          <p className="text-sm text-muted-foreground">Returning to payment...</p>
        </div>
      )}
    </div>
  );

  // Render Processing Step
  const renderProcessingStep = () => (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-muted-foreground">Processing payment...</p>
    </div>
  );

  // Render Success Step
  const renderSuccessStep = () => (
    <div className="flex flex-col items-center gap-3 py-6">
      <CheckCircle2 className="w-16 h-16 text-green-500" />
      <p className="text-lg font-semibold">
        {mode === 'rent' ? 'Rental Successful!' : 'Subscription Activated!'}
      </p>
      <p className="text-sm text-muted-foreground">
        {mode === 'rent' ? `Enjoy watching "${title}"` : 'Welcome to premium membership!'}
      </p>
    </div>
  );

  const getDialogTitle = () => {
    if (step === 'topup') return 'Top Up Wallet';
    if (mode === 'rent') return `Rent ${mediaType === 'movie' ? 'Movie' : 'Series'}`;
    if (step === 'payment') return 'Complete Payment';
    return 'VIP Membership';
  };

  const getDialogIcon = () => {
    if (step === 'topup') return <Wallet className="h-5 w-5 text-primary" />;
    if (mode === 'rent') return <Tv className="h-5 w-5 text-primary" />;
    return <Crown className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getDialogIcon()}
              {getDialogTitle()}
            </DialogTitle>
            {mode === 'rent' && step === 'payment' && (
              <DialogDescription>
                Get access to "{title}" for a limited time
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-4">
            {step === 'plans' && renderPlansStep()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'topup' && renderTopupStep()}
            {step === 'processing' && renderProcessingStep()}
            {step === 'success' && renderSuccessStep()}
          </div>
        </DialogContent>
      </Dialog>

      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};
