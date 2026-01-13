import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreditCard, Crown, Wallet, Loader2, QrCode, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
}

interface InlineRentSubscribeProps {
  accessType?: 'free' | 'rent' | 'vip';
  excludeFromPlan?: boolean;
  rentalPrice?: number;
  rentalPeriodDays?: number;
  contentId?: string;
  mediaType?: 'movie' | 'series' | 'anime';
  title?: string;
  onSuccess?: () => void;
  onAuthRequired?: () => void;
}

type FlowStep = 'buttons' | 'topup' | 'select-plan' | 'confirm-rent' | 'confirm-subscribe' | 'processing' | 'success';

export const InlineRentSubscribe = ({
  accessType = 'free',
  excludeFromPlan = false,
  rentalPrice = 0,
  rentalPeriodDays = 7,
  contentId,
  mediaType,
  title,
  onSuccess,
  onAuthRequired,
}: InlineRentSubscribeProps) => {
  const { user } = useAuth();
  const { balance, refetch: refetchBalance } = useWallet();
  
  const [step, setStep] = useState<FlowStep>('buttons');
  const [selectedAction, setSelectedAction] = useState<'rent' | 'subscribe' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  
  // Top-up state
  const [topupAmount, setTopupAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed'>('idle');

  // Fetch membership plans
  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('membership_plans')
        .select('id, name, price, currency, duration, duration_unit')
        .eq('is_active', true)
        .order('price', { ascending: true });
      
      if (data && data.length > 0) {
        setPlans(data);
        setSelectedPlan(data[0]);
      }
    };
    fetchPlans();
  }, []);

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

  const handleRentClick = () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    
    if (balance < rentalPrice) {
      setSelectedAction('rent');
      setStep('topup');
    } else {
      setSelectedAction('rent');
      setStep('confirm-rent');
    }
  };

  const handleSubscribeClick = () => {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    
    if (plans.length === 0) {
      toast.error('No subscription plans available');
      return;
    }
    
    setSelectedAction('subscribe');
    
    // If only one plan, go directly to confirm or topup
    if (plans.length === 1) {
      const plan = plans[0];
      setSelectedPlan(plan);
      if (balance < plan.price) {
        setStep('topup');
      } else {
        setStep('confirm-subscribe');
      }
    } else {
      setStep('select-plan');
    }
  };

  const handlePlanSelect = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    if (balance < plan.price) {
      setStep('topup');
    } else {
      setStep('confirm-subscribe');
    }
  };

  const generateQRCode = async () => {
    if (!user || !topupAmount || parseFloat(topupAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        setLoading(false);
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
        toast.success('QR Code generated! Scan to pay');
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId || checking || !user) return;

    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setChecking(false);
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
        setChecking(false);
        return;
      }

      if (data.status === 'completed') {
        setPaymentStatus('completed');
        await refetchBalance();
        toast.success(`Payment successful! Balance: $${data.newBalance.toFixed(2)}`);
        
        // After top-up, check if balance is now sufficient
        setTimeout(() => {
          if (selectedAction === 'rent') {
            setStep('confirm-rent');
          } else if (selectedAction === 'subscribe') {
            setStep('confirm-subscribe');
          }
          resetTopupState();
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setChecking(false);
    }
  };

  const manualCheckPayment = async () => {
    if (!transactionId || !user) return;

    setChecking(true);
    toast.info('Checking payment status...');
    
    try {
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('status, amount')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (transaction?.status === 'completed') {
        await refetchBalance();
        setPaymentStatus('completed');
        toast.success('Payment confirmed!');
        
        setTimeout(() => {
          if (selectedAction === 'rent') {
            setStep('confirm-rent');
          } else if (selectedAction === 'subscribe') {
            setStep('confirm-subscribe');
          }
          resetTopupState();
        }, 1500);
      } else {
        toast.info('Payment not confirmed yet. Please wait or contact support.');
      }
    } catch (error) {
      toast.error('Failed to verify payment');
    } finally {
      setChecking(false);
    }
  };

  const resetTopupState = () => {
    setQrCode(null);
    setTransactionId(null);
    setPaymentStatus('idle');
    setTopupAmount('10');
  };

  const handleConfirmRent = async () => {
    if (!user || !contentId) return;
    
    setStep('processing');
    
    try {
      // Use the existing RPC function
      const { error } = await supabase.rpc('purchase_content_with_wallet', {
        p_user_id: user.id,
        p_content_id: contentId,
        p_amount: rentalPrice,
        p_currency: 'USD'
      });

      if (error) {
        if (error.message?.includes('Insufficient')) {
          toast.error('Insufficient balance. Please top up.');
          setStep('topup');
          return;
        }
        throw error;
      }

      setStep('success');
      toast.success('Content unlocked successfully!');
      
      setTimeout(() => {
        onSuccess?.();
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Rent error:', error);
      toast.error(error.message || 'Failed to complete rental');
      setStep('buttons');
    }
  };

  const handleConfirmSubscribe = async () => {
    if (!user || !selectedPlan) return;
    
    setStep('processing');
    
    try {
      // Use the existing RPC function
      const { error } = await supabase.rpc('purchase_membership_with_wallet', {
        p_user_id: user.id,
        p_plan_id: selectedPlan.id,
        p_amount: selectedPlan.price
      });

      if (error) {
        if (error.message?.includes('Insufficient')) {
          toast.error('Insufficient balance. Please top up.');
          setStep('topup');
          return;
        }
        throw error;
      }

      setStep('success');
      toast.success('Subscription activated!');
      
      setTimeout(() => {
        onSuccess?.();
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast.error(error.message || 'Failed to subscribe');
      setStep('buttons');
    }
  };

  const quickAmounts = [5, 10, 20, 50];
  const requiredAmount = selectedAction === 'rent' ? rentalPrice : (selectedPlan?.price || 0);

  // Render buttons
  if (step === 'buttons') {
    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
        {accessType === 'rent' && rentalPrice > 0 && (
          <Button 
            className="flex-1 gap-2 bg-yellow-500 hover:bg-yellow-600 text-black h-11 text-sm font-semibold"
            onClick={handleRentClick}
          >
            <CreditCard className="w-4 h-4" />
            Rent ${rentalPrice} ({rentalPeriodDays}d)
          </Button>
        )}
        
        {(!excludeFromPlan || accessType === 'vip') && (
          <Button 
            className="flex-1 gap-2 bg-primary hover:bg-primary/90 h-11 text-sm font-semibold"
            onClick={handleSubscribeClick}
          >
            <Crown className="w-4 h-4" />
            {accessType === 'rent' && !excludeFromPlan ? 'Or Subscribe' : 'Subscribe Now'}
          </Button>
        )}
      </div>
    );
  }

  // Render plan selection
  if (step === 'select-plan') {
    return (
      <div className="w-full max-w-sm mx-auto space-y-3 bg-black/60 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('buttons')}
            className="text-white/70 hover:text-white p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Choose Plan
          </h4>
        </div>

        <div className="space-y-2">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              variant="outline"
              className={`w-full justify-between h-auto py-3 ${selectedPlan?.id === plan.id ? 'border-primary' : ''}`}
              onClick={() => handlePlanSelect(plan)}
            >
              <span className="font-medium">{plan.name}</span>
              <span className="text-primary font-bold">
                ${plan.price}/{plan.duration_unit === 'months' ? 'mo' : plan.duration_unit}
              </span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Render top-up flow
  if (step === 'topup') {
    return (
      <div className="w-full max-w-sm mx-auto space-y-4 bg-black/60 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStep('buttons'); resetTopupState(); }}
            className="text-white/70 hover:text-white p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-white font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Top Up Wallet
          </h4>
        </div>

        <div className="text-center text-sm text-white/70">
          <p>Your balance: <span className="text-primary font-semibold">${balance.toFixed(2)}</span></p>
          <p>Required: <span className="text-yellow-400 font-semibold">${requiredAmount.toFixed(2)}</span></p>
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
                className="bg-white/10 border-white/20 text-white text-center"
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
              disabled={loading || !topupAmount || parseFloat(topupAmount) <= 0}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              Generate KHQR
            </Button>
          </>
        )}

        {paymentStatus === 'pending' && qrCode && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 flex justify-center">
              <QRCode value={qrCode} size={180} />
            </div>
            <p className="text-center text-white text-sm font-medium">
              Scan to Pay ${parseFloat(topupAmount).toFixed(2)}
            </p>
            <div className="flex items-center justify-center gap-2 text-white/60 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for payment...
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={manualCheckPayment}
              disabled={checking}
              className="w-full"
            >
              {checking ? 'Checking...' : 'I have paid'}
            </Button>
          </div>
        )}

        {paymentStatus === 'completed' && (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-white font-medium">Payment Successful!</p>
          </div>
        )}
      </div>
    );
  }

  // Confirm rent
  if (step === 'confirm-rent') {
    return (
      <div className="w-full max-w-sm mx-auto space-y-4 bg-black/60 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('buttons')}
            className="text-white/70 hover:text-white p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-white font-semibold">Confirm Rental</h4>
        </div>

        <div className="text-center space-y-2">
          <p className="text-white/70 text-sm">
            Rent <span className="text-white font-medium">{title || 'this content'}</span>
          </p>
          <p className="text-2xl font-bold text-yellow-400">${rentalPrice}</p>
          <p className="text-white/50 text-xs">Valid for {rentalPeriodDays} days</p>
          <p className="text-white/60 text-sm">
            Balance after: <span className="text-primary">${(balance - rentalPrice).toFixed(2)}</span>
          </p>
        </div>

        <Button
          onClick={handleConfirmRent}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Confirm Rent
        </Button>
      </div>
    );
  }

  // Confirm subscribe
  if (step === 'confirm-subscribe' && selectedPlan) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-4 bg-black/60 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('buttons')}
            className="text-white/70 hover:text-white p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h4 className="text-white font-semibold">Confirm Subscription</h4>
        </div>

        <div className="text-center space-y-2">
          <p className="text-white/70 text-sm">{selectedPlan.name}</p>
          <p className="text-2xl font-bold text-primary">
            ${selectedPlan.price}/{selectedPlan.duration} {selectedPlan.duration_unit}
          </p>
          <p className="text-white/50 text-xs">Unlimited access to premium content</p>
          <p className="text-white/60 text-sm">
            Balance after: <span className="text-primary">${(balance - selectedPlan.price).toFixed(2)}</span>
          </p>
        </div>

        <Button onClick={handleConfirmSubscribe} className="w-full">
          <Crown className="w-4 h-4 mr-2" />
          Confirm Subscribe
        </Button>
      </div>
    );
  }

  // Processing
  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-white font-medium">Processing...</p>
      </div>
    );
  }

  // Success
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-white font-medium">Success!</p>
        <p className="text-white/60 text-sm">Refreshing...</p>
      </div>
    );
  }

  return null;
};
