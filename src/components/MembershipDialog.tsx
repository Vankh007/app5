import { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, Zap, Wallet, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { KHQRPaymentDialog } from './payment/KHQRPaymentDialog';
import { AuthDialog } from './AuthDialog';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
  device_limit: number;
  show_ads: boolean;
  is_active: boolean;
}

interface MembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MembershipDialog({ open, onOpenChange }: MembershipDialogProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [currentMembership, setCurrentMembership] = useState<any>(null);
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchPlans();
      if (user) {
        fetchWalletBalance();
        checkCurrentMembership();
      }
    }
  }, [open, user]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load membership plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const checkCurrentMembership = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentMembership(data);
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };

  const handleSelectPlan = (plan: MembershipPlan) => {
    console.log('handleSelectPlan called, user:', user);
    if (!user) {
      console.log('No user, showing auth dialog');
      setShowAuthDialog(true);
      return;
    }

    console.log('User exists, selecting plan');
    setSelectedPlan(plan);
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    fetchWalletBalance();
    checkCurrentMembership();
  };

  const handleTopUp = () => {
    setShowQRPayment(true);
  };

  const handleQRPaymentSuccess = (newBalance: number) => {
    setWalletBalance(newBalance);
    setShowQRPayment(false);
    toast({
      title: 'Top-up Successful',
      description: `Your wallet has been topped up. New balance: $${newBalance.toFixed(2)}`,
    });
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !user) return;

    if (walletBalance < selectedPlan.price) {
      toast({
        title: 'Insufficient Balance',
        description: `Your wallet balance is $${walletBalance.toFixed(2)}. You need $${selectedPlan.price.toFixed(2)} to subscribe.`,
        variant: 'destructive'
      });
      return;
    }

    setProcessingPurchase(true);

    try {
      const { error } = await supabase.rpc('purchase_membership_with_wallet', {
        p_user_id: user.id,
        p_plan_id: selectedPlan.id,
        p_amount: selectedPlan.price
      });

      if (error) throw error;

      toast({
        title: 'Subscription Successful!',
        description: `You are now subscribed to ${selectedPlan.name}. $${selectedPlan.price} deducted from your wallet.`,
      });

      onOpenChange(false);
      setSelectedPlan(null);
      fetchWalletBalance();
      checkCurrentMembership();
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setProcessingPurchase(false);
    }
  };

  const getPlanIcon = (index: number) => {
    const icons = [Sparkles, Zap, Crown];
    return icons[index % icons.length];
  };

  const features = [
    'Unlimited streaming',
    'HD & 4K quality',
    'Multiple devices',
    'Ad-free experience'
  ];

  if (!selectedPlan) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Crown className="h-6 w-6 text-primary" />
                Join Premium Membership
              </DialogTitle>
              <DialogDescription>
                Choose your perfect plan and unlock unlimited access
              </DialogDescription>
            </DialogHeader>

            {currentMembership && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40">
                  Active
                </Badge>
                <span className="text-foreground">
                  Current Plan: {currentMembership.membership_type}
                </span>
              </div>
            )}

            {user && (
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Wallet Balance</span>
                </div>
                <span className="font-bold text-lg">${walletBalance.toFixed(2)}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                {plans.map((plan, index) => {
                  const Icon = getPlanIcon(index);
                  const isPopular = index === 1;
                  const isCurrentPlan = currentMembership?.membership_type === plan.name;
                  
                  return (
                    <Card 
                      key={plan.id}
                      className={`relative transition-all hover:shadow-lg ${
                        isPopular ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-full">
                          Popular
                        </div>
                      )}
                      
                      {isCurrentPlan && (
                        <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-full">
                          Active
                        </div>
                      )}

                      <CardHeader className="pb-4">
                        <div className="inline-flex items-center justify-center rounded-full bg-primary/10 w-12 h-12 mb-3">
                          <Icon className="text-primary h-6 w-6" />
                        </div>
                        
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        
                        <CardDescription className="text-xs">
                          {plan.duration} {plan.duration_unit}
                        </CardDescription>

                        <div className="mt-3">
                          <div className="flex items-baseline">
                            <span className="text-3xl font-bold text-foreground">
                              ${plan.price}
                            </span>
                            <span className="text-muted-foreground ml-1 text-xs">
                              {plan.currency}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ${(plan.price / plan.duration).toFixed(2)} per day
                          </p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2 pb-4 text-xs">
                        {features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Check className="text-primary h-4 w-4 flex-shrink-0" />
                            <span className="text-foreground">{feature}</span>
                          </div>
                        ))}
                        
                        <div className="flex items-center gap-2">
                          <Check className="text-primary h-4 w-4 flex-shrink-0" />
                          <span className="text-foreground">
                            Up to {plan.device_limit} devices
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter>
                        <Button
                          className="w-full"
                          variant={isPopular ? 'default' : 'outline'}
                          onClick={() => handleSelectPlan(plan)}
                          disabled={isCurrentPlan}
                        >
                          {isCurrentPlan ? 'Current Plan' : 'Select'}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Auth Dialog */}
        <AuthDialog 
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // Purchase confirmation view
  return (
    <>
      <Dialog open={open && !showQRPayment} onOpenChange={(open) => {
        if (!open) setSelectedPlan(null);
        onOpenChange(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Purchase</DialogTitle>
            <DialogDescription>
              Review your purchase and complete payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Plan Info */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-foreground">{selectedPlan.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedPlan.duration} {selectedPlan.duration_unit}
              </p>
            </div>

            {/* Wallet Balance */}
            <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Wallet Balance</span>
              </div>
              <span className="font-bold text-lg">${walletBalance.toFixed(2)}</span>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Price</span>
              </div>
              <span className="font-bold text-lg text-red-500">
                ${selectedPlan.price.toFixed(2)} {selectedPlan.currency}
              </span>
            </div>

            {/* Insufficient balance warning or remaining balance */}
            {walletBalance < selectedPlan.price ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Insufficient Balance
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                  You need ${(selectedPlan.price - walletBalance).toFixed(2)} more to complete this purchase.
                </p>
                <Button 
                  onClick={handleTopUp}
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Top Up Wallet
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="bg-muted/20 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Remaining balance after purchase</p>
                <p className="text-sm font-semibold text-foreground">
                  ${(walletBalance - selectedPlan.price).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedPlan(null)}
              disabled={processingPurchase}
            >
              Back
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={processingPurchase || walletBalance < selectedPlan.price}
              className="gap-2"
            >
              {processingPurchase ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Processing...
                </>
              ) : (
                `Purchase for $${selectedPlan.price.toFixed(2)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Payment Dialog */}
      <KHQRPaymentDialog 
        isOpen={showQRPayment}
        onClose={() => setShowQRPayment(false)}
        onSuccess={handleQRPaymentSuccess}
      />

      {/* Auth Dialog */}
      <AuthDialog 
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
