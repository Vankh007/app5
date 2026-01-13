import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Wallet, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { AuthDialog } from '@/components/AuthDialog';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupportUsColors {
  buttonBg: string;
  buttonText: string;
  selectedBg: string;
  selectedText: string;
}

interface SupportUsOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  onSkip: () => void;
  contentId?: string;
  contentTitle?: string;
  countdownSeconds?: number;
  supportAmounts?: number[];
  episodeId?: string;
  colors?: SupportUsColors;
}

const defaultColors: SupportUsColors = {
  buttonBg: '#FFFFFF',
  buttonText: '#0F172A',
  selectedBg: '#00BCD4',
  selectedText: '#FFFFFF',
};

export const SupportUsOverlay = ({
  isVisible,
  onClose,
  onSkip,
  contentId,
  contentTitle,
  countdownSeconds = 10,
  supportAmounts = [0.5, 1, 2, 5],
  episodeId,
  colors = defaultColors
}: SupportUsOverlayProps) => {
  const { user } = useAuth();
  const { balance, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { toast } = useToast();
  
  const [countdown, setCountdown] = useState(10);
  const [step, setStep] = useState<'initial' | 'wallet'>('initial');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showKHQRDialog, setShowKHQRDialog] = useState(false);
  const [supportAmount, setSupportAmount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isSupporting, setIsSupporting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showAuthDialogPending, setShowAuthDialogPending] = useState(false);

  // Auto-dismiss countdown - pause when auth dialog is shown or processing payment
  useEffect(() => {
    if (!isVisible) {
      setCountdown(countdownSeconds);
      setStep('initial');
      setIsProcessingPayment(false);
      setShowAuthDialogPending(false);
      setCustomAmount('');
      return;
    }

    // Don't countdown if auth dialog is open or processing payment
    if (showAuthDialog || isProcessingPayment) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Only auto-skip if not processing payment and not waiting for auth
          if (!isProcessingPayment && step === 'initial' && !showAuthDialog) {
            onSkip();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, onSkip, isProcessingPayment, step, showAuthDialog, countdownSeconds]);

  const handleSupportClick = useCallback(() => {
    if (!user) {
      setShowAuthDialog(true);
      setShowAuthDialogPending(true);
      return;
    }
    setStep('wallet');
    setIsProcessingPayment(true);
  }, [user]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthDialog(false);
    setShowAuthDialogPending(false);
    // After login, go to wallet step
    setTimeout(() => {
      setStep('wallet');
      setIsProcessingPayment(true);
    }, 100);
  }, []);

  const handleAuthDialogClose = useCallback((open: boolean) => {
    setShowAuthDialog(open);
    if (!open) {
      setShowAuthDialogPending(false);
    }
  }, []);

  const handleTopupClick = useCallback(() => {
    setShowKHQRDialog(true);
  }, []);

  const handleTopupSuccess = useCallback((newBalance: number) => {
    setShowKHQRDialog(false);
    refetchWallet();
  }, [refetchWallet]);

  const handleAmountSelect = (amount: number) => {
    setSupportAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setSupportAmount(numValue);
    }
  };

  const handleConfirmSupport = useCallback(async () => {
    if (!user || !contentId) return;
    
    const finalAmount = customAmount ? parseFloat(customAmount) : supportAmount;
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }
    
    if (balance < finalAmount) {
      toast({
        title: "Insufficient Balance",
        description: "Please top up your wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsSupporting(true);
    try {
      const { data, error } = await supabase.rpc('support_content_with_wallet', {
        p_user_id: user.id,
        p_content_id: contentId,
        p_amount: finalAmount,
        p_episode_id: episodeId || null
      });

      if (error) throw error;

      toast({
        title: "Thank you! ❤️",
        description: `You supported this content with $${finalAmount.toFixed(2)}`,
      });
      
      refetchWallet();
      onClose();
    } catch (error: any) {
      toast({
        title: "Support Failed",
        description: error.message || "Could not process your support",
        variant: "destructive"
      });
    } finally {
      setIsSupporting(false);
    }
  }, [user, contentId, supportAmount, customAmount, balance, toast, refetchWallet, onClose, episodeId]);

  if (!isVisible) return null;

  const finalAmount = customAmount ? parseFloat(customAmount) : supportAmount;
  const isValidAmount = !isNaN(finalAmount) && finalAmount > 0;

  return (
    <>
      <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        {/* Countdown circle - positioned at 50% of video height (right side) */}
        <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1.5">
          <div className="relative w-7 h-7">
            <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray={100}
                strokeDashoffset={100 - (countdown / countdownSeconds) * 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
              {countdown}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-white/70 hover:text-white hover:bg-white/10 text-[10px] px-1 h-6 gap-0.5"
          >
            Skip <ChevronRight className="w-2.5 h-2.5" />
          </Button>
        </div>

        {/* Main Content - Scaled down 50% */}
        <div className="text-center max-w-[200px] mx-2 space-y-2">
          {/* Initial Step - Support Us prompt */}
          {step === 'initial' && (
            <>
              <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center animate-pulse">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-white text-sm font-bold">Support Us</h3>
                <p className="text-white/70 text-[10px] leading-tight">
                  Love this content? Support us!
                </p>
              </div>

              <Button
                onClick={handleSupportClick}
                size="sm"
                className="w-full h-7 gap-1 text-xs bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-semibold"
              >
                <Heart className="w-3 h-3" />
                Support
              </Button>
            </>
          )}

          {/* Wallet Step - Show balance */}
          {step === 'wallet' && (
            <>
              <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-white text-sm font-bold">Your Wallet</h3>
                <div className="flex items-center justify-center gap-1">
                  <Wallet className="w-3 h-3 text-primary" />
                  <span className="text-primary text-lg font-bold">
                    {walletLoading ? '...' : `$${balance.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {balance <= 0 ? (
                <>
                  <p className="text-white/70 text-[10px]">
                    Wallet empty. Top up first!
                  </p>
                  <Button
                    onClick={handleTopupClick}
                    size="sm"
                    className="w-full h-7 gap-1 text-xs bg-primary hover:bg-primary/90 font-semibold"
                  >
                    <Wallet className="w-3 h-3" />
                    Top Up
                  </Button>
                </>
              ) : (
                <>
                  {/* Amount Selection - Redesigned */}
                  <div className="space-y-2">
                    <p className="text-white/70 text-[10px]">Choose amount:</p>
                    <div className="grid grid-cols-4 gap-1">
                      {supportAmounts.map((amount) => {
                        const isSelected = supportAmount === amount && !customAmount;
                        return (
                          <button
                            key={amount}
                            onClick={() => handleAmountSelect(amount)}
                            disabled={balance < amount}
                            className="h-7 rounded-full text-[10px] font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: isSelected ? colors.selectedBg : colors.buttonBg,
                              color: isSelected ? colors.selectedText : colors.buttonText,
                            }}
                          >
                            ${amount}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Custom Amount Input */}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        placeholder="Custom"
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        className="h-7 text-[10px] rounded-full text-center px-2"
                        style={{
                          backgroundColor: colors.buttonBg,
                          color: colors.buttonText,
                          borderColor: customAmount ? colors.selectedBg : 'transparent',
                        }}
                        min="0.01"
                        step="0.01"
                      />
                      <button
                        onClick={handleConfirmSupport}
                        disabled={isSupporting || !isValidAmount || balance < finalAmount}
                        className="h-7 px-3 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white"
                      >
                        {isSupporting ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Heart className="w-2.5 h-2.5" fill="white" />
                        )}
                        ${isValidAmount ? finalAmount.toFixed(2) : '0.00'}
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTopupClick}
                    className="w-full h-6 gap-1 text-[10px] text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <Wallet className="w-2.5 h-2.5" />
                    Top Up Wallet
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('initial')}
                className="text-white/50 hover:text-white text-[10px] h-5"
              >
                ← Back
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Auth Dialog */}
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={handleAuthDialogClose}
        onSuccess={handleAuthSuccess}
      />

      {/* KHQR Payment Dialog for Top Up */}
      <KHQRPaymentDialog
        isOpen={showKHQRDialog}
        onClose={() => setShowKHQRDialog(false)}
        onSuccess={handleTopupSuccess}
      />
    </>
  );
};