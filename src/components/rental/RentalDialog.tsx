import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Calendar, Tv, AlertCircle, Wallet, Loader2, QrCode, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'react-qr-code';
import { toast as sonnerToast } from 'sonner';

interface RentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mediaId: string;
  mediaType: string;
  rentalPrice: number;
  rentalPeriodDays: number;
  onSuccess: () => void;
}

type ViewMode = 'info' | 'topup' | 'processing' | 'success';

export const RentalDialog = ({
  open,
  onOpenChange,
  title,
  mediaId,
  mediaType,
  rentalPrice,
  rentalPeriodDays,
  onSuccess
}: RentalDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useWallet();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('info');
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  
  // KHQR state
  const [topupAmount, setTopupAmount] = useState('10');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrChecking, setQrChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed'>('idle');

  // Sync currentBalance with wallet balance
  useEffect(() => {
    setCurrentBalance(balance);
  }, [balance]);

  const insufficientBalance = currentBalance < rentalPrice;
  const amountNeeded = Math.max(0, rentalPrice - currentBalance);

  // Reset state and refetch balance when dialog opens
  useEffect(() => {
    if (open) {
      setViewMode('info');
      setQrCode(null);
      setTransactionId(null);
      setPaymentStatus('idle');
      refetchBalance(); // Fetch fresh balance
    }
  }, [open, refetchBalance]);

  // Set topup amount based on needed amount
  useEffect(() => {
    if (viewMode === 'topup' && amountNeeded > 0) {
      setTopupAmount(Math.ceil(amountNeeded + 1).toString());
    }
  }, [viewMode, amountNeeded]);

  // Check payment status periodically when QR is displayed
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
        await refetchBalance();
        sonnerToast.success(`Successfully added $${parseFloat(topupAmount).toFixed(2)} to wallet!`);
        
        // Go back to info view to complete rental
        setTimeout(() => {
          setViewMode('info');
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

  const handleRent = async () => {
    if (!user) {
      toast({ title: 'Please sign in to rent', variant: 'destructive' });
      return;
    }

    if (insufficientBalance) {
      setViewMode('topup');
      return;
    }

    setViewMode('processing');
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
          toast({ title: 'Insufficient wallet balance', variant: 'destructive' });
          setViewMode('topup');
          return;
        }
        throw error;
      }

      await refetchBalance();
      setViewMode('success');
      toast({ title: `Successfully rented "${title}" for ${rentalPeriodDays} days!` });
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Rental error:', error);
      toast({ title: 'Failed to process rental', variant: 'destructive' });
      setViewMode('info');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [5, 10, 20, 50];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-primary" />
            Rent {mediaType === 'movie' ? 'Movie' : 'Series'}
          </DialogTitle>
          <DialogDescription>
            Get access to "{title}" for a limited time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {viewMode === 'info' && (
            <>
              {/* Rental Info */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Content</span>
                  <span className="font-medium text-right max-w-[180px] truncate">{title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-semibold text-primary">${rentalPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rental Period</span>
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {rentalPeriodDays} days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Balance</span>
                  <span className={`font-medium ${insufficientBalance ? 'text-destructive' : 'text-green-500'}`}>
                    ${balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {insufficientBalance && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    <span className="font-semibold">Insufficient Balance</span>
                    <br />
                    You need ${amountNeeded.toFixed(2)} more. Top up your wallet to continue.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <Button
                className="w-full gap-2"
                onClick={handleRent}
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
                    Pay ${rentalPrice}
                  </>
                )}
              </Button>
            </>
          )}

          {viewMode === 'topup' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewMode('info');
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
                <p>Your balance: <span className="text-primary font-semibold">${balance.toFixed(2)}</span></p>
                <p>Required: <span className="text-yellow-500 font-semibold">${rentalPrice.toFixed(2)}</span></p>
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
                  <p className="text-sm text-muted-foreground">Returning to rental...</p>
                </div>
              )}
            </>
          )}

          {viewMode === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Processing rental...</p>
            </div>
          )}

          {viewMode === 'success' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg font-semibold">Rental Successful!</p>
              <p className="text-sm text-muted-foreground">Enjoy watching "{title}"</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
