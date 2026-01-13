import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, DollarSign, Wallet, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentTitle: string;
  onSupportSuccess?: () => void;
}

export const SupportDialog = ({ open, onOpenChange, contentId, contentTitle, onSupportSuccess }: SupportDialogProps) => {
  const [amount, setAmount] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const quickAmounts = [1, 5, 10, 20, 50];

  useEffect(() => {
    if (open) {
      fetchWalletBalance();
    }
  }, [open]);

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setWalletBalance(0);
        toast({
          title: 'Login Required',
          description: 'Please login to view your wallet balance',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      // Fetch all wallet transactions for the user
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('amount, transaction_type')
        .eq('user_id', user.id);

      if (error) throw error;

      // Calculate balance based on transaction types
      const balance = transactions?.reduce((total, transaction) => {
        if (transaction.transaction_type === 'credit' || transaction.transaction_type === 'topup') {
          return total + parseFloat(transaction.amount.toString());
        } else if (transaction.transaction_type === 'debit' || transaction.transaction_type === 'support') {
          return total - parseFloat(transaction.amount.toString());
        }
        return total;
      }, 0) || 0;

      setWalletBalance(balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    }
  };

  const handleContinue = () => {
    const supportAmount = parseFloat(amount);
    
    if (!supportAmount || supportAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive'
      });
      return;
    }

    // Check if user has insufficient balance
    if (supportAmount > walletBalance) {
      setShowTopUpDialog(true);
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmSupport = async () => {
    const supportAmount = parseFloat(amount);
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please login to support content',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      // Insert support record
      const { error: supportError } = await supabase
        .from('content_support')
        .insert({
          user_id: user.id,
          content_id: contentId,
          amount: supportAmount
        });

      if (supportError) throw supportError;

      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: supportAmount,
          transaction_type: 'support',
          description: `Support for ${contentTitle}`
        });

      if (walletError) throw walletError;

      toast({
        title: 'Thank You! ❤️',
        description: `Your support of $${supportAmount.toFixed(2)} helps us create more content!`,
      });

      setAmount('');
      setShowConfirmation(false);
      onOpenChange(false);
      fetchWalletBalance();
      onSupportSuccess?.();
    } catch (error: any) {
      console.error('Error processing support:', error);
      toast({
        title: 'Support Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSuccess = (newBalance: number) => {
    setWalletBalance(newBalance);
    setShowTopUpDialog(false);
    toast({
      title: 'Top Up Successful!',
      description: `Your new balance is $${newBalance.toFixed(2)}`,
    });
  };

  const supportAmount = parseFloat(amount);
  const hasInsufficientBalance = supportAmount > walletBalance;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setShowConfirmation(false);
        setAmount('');
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md scale-[0.85] max-h-[85vh] overflow-y-auto">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                Support This Content
              </DialogTitle>
              <DialogDescription>
                Show your appreciation for "{contentTitle}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              {/* Wallet Balance */}
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-2.5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Wallet Balance:</span>
                </div>
                <span className="font-bold text-base">${walletBalance.toFixed(2)}</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="space-y-2">
                <Label className="text-xs">Quick Amounts</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant={amount === quickAmount.toString() ? 'default' : 'outline'}
                      onClick={() => setAmount(quickAmount.toString())}
                      className="h-8 text-xs font-semibold"
                    >
                      ${quickAmount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs">Custom Amount ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              {/* Support Benefits */}
              <div className="bg-muted/50 rounded-lg p-2.5 space-y-1 text-[10px] text-muted-foreground">
                <p className="font-medium text-foreground text-xs">Your support helps us:</p>
                <ul className="space-y-0.5">
                  <li>• Create more quality content</li>
                  <li>• Maintain and improve the platform</li>
                  <li>• Support content creators</li>
                  <li>• Amount will be deducted from your wallet balance</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-9 text-sm"
              >
                Cancel
              </Button>
              {walletBalance === 0 || (amount && parseFloat(amount) > walletBalance) ? (
                <Button 
                  onClick={() => setShowTopUpDialog(true)}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="gap-2 h-9 text-sm"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Top Up
                </Button>
              ) : (
                <Button 
                  onClick={handleContinue}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  className="gap-2 h-9 text-sm"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Continue
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                Support Content
              </DialogTitle>
              <DialogDescription className="text-xs">
                Complete your support using your wallet balance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              {/* Content Info */}
              <div className="bg-muted/30 rounded-lg p-2.5 space-y-1">
                <p className="text-xs font-medium text-foreground">{contentTitle}</p>
                <p className="text-[10px] text-muted-foreground">Support Amount</p>
              </div>

              {/* Wallet Balance */}
              <div className="flex items-center justify-between bg-primary/10 rounded-lg p-2.5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Your Wallet Balance</span>
                </div>
                <span className="font-bold text-base">${walletBalance.toFixed(2)}</span>
              </div>

              {/* Support Amount */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Support Amount</span>
                </div>
                <span className="font-bold text-base text-red-500">${supportAmount.toFixed(2)}</span>
              </div>

              {/* Remaining Balance Preview */}
              {!hasInsufficientBalance && (
                <div className="bg-muted/20 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">Remaining balance after support</p>
                  <p className="text-sm font-semibold text-foreground">${(walletBalance - supportAmount).toFixed(2)}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="h-9 text-sm"
              >
                Back
              </Button>
              {hasInsufficientBalance ? (
                <Button 
                  onClick={() => setShowTopUpDialog(true)}
                  className="gap-2 h-9 text-sm bg-primary hover:bg-primary/90"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Top Up Balance
                </Button>
              ) : (
                <Button 
                  onClick={handleConfirmSupport}
                  disabled={loading}
                  className="gap-2 h-9 text-sm"
                >
                  <Heart className="h-3.5 w-3.5" />
                  {loading ? 'Processing...' : `Support for $${supportAmount.toFixed(2)}`}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <KHQRPaymentDialog 
        isOpen={showTopUpDialog}
        onClose={() => setShowTopUpDialog(false)}
        onSuccess={handleTopUpSuccess}
      />
    </Dialog>
  );
};
