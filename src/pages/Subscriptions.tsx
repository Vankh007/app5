import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, Sparkles, Zap, Shield, Award, Wallet, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

const Subscriptions = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentMembership, setCurrentMembership] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmPlanDetails, setConfirmPlanDetails] = useState<MembershipPlan | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPlans();
    if (user) {
      checkCurrentMembership();
      fetchWalletBalance();
    }
  }, [user]);

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

  const checkCurrentMembership = async () => {
    try {
      const { data, error } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentMembership(data);
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to subscribe',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setConfirmPlanDetails(plan);
    setConfirmDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmPlanDetails || !user) return;

    setSelectedPlan(confirmPlanDetails.id);

    try {
      if (walletBalance < confirmPlanDetails.price) {
        toast({
          title: 'Insufficient Balance',
          description: `Your wallet balance is $${walletBalance.toFixed(2)}. You need $${confirmPlanDetails.price.toFixed(2)} to subscribe. Please top up your wallet.`,
          variant: 'destructive'
        });
        setSelectedPlan(null);
        setConfirmDialogOpen(false);
        navigate('/dashboard');
        return;
      }

      const { error } = await supabase.rpc('purchase_membership_with_wallet', {
        p_user_id: user.id,
        p_plan_id: confirmPlanDetails.id,
        p_amount: confirmPlanDetails.price
      });

      if (error) throw error;

      toast({
        title: 'Subscription Successful!',
        description: `You are now subscribed to ${confirmPlanDetails.name}. $${confirmPlanDetails.price} deducted from your wallet.`,
      });

      setConfirmDialogOpen(false);
      checkCurrentMembership();
      fetchWalletBalance();
    } catch (error: any) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setSelectedPlan(null);
    }
  };

  const getPlanIcon = (index: number) => {
    const icons = [Sparkles, Zap, Crown];
    return icons[index % icons.length];
  };

  const features = [
    'Unlimited streaming',
    'HD & 4K quality',
    'Watch on multiple devices',
    'Cancel anytime',
    'Exclusive content access'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <section className="relative bg-gradient-to-b from-primary/10 to-background pt-16 pb-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge 
            variant="outline" 
            className="mb-4 bg-primary/10 border-primary/30 text-primary text-xs px-2 py-1"
          >
            <Crown className="mr-1 h-3 w-3" />
            Premium Membership
          </Badge>
          
          <h1 className="font-bold text-foreground mb-4 text-2xl">
            Choose Your Perfect Plan
          </h1>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm px-2">
            Unlock unlimited access to premium content. Watch anywhere, anytime.
          </p>

          {currentMembership && (
            <div className="mt-6 inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-xs">
              <Shield className="text-primary h-4 w-4" />
              <span className="text-foreground font-medium">
                Current Plan: {currentMembership.membership_type}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Plans Grid */}
      <section className="px-4 py-8">
        <div className="max-w-7xl mx-auto grid gap-6 grid-cols-1">
          {plans.map((plan, index) => {
            const Icon = getPlanIcon(index);
            const isPopular = index === 1;
            const isCurrentPlan = currentMembership?.membership_type === plan.name;
            
            return (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 ${
                  isPopular 
                    ? 'border-primary shadow-lg' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
                    <Award className="inline h-3 w-3 mr-1" />
                    Active
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="inline-flex items-center justify-center rounded-full bg-primary/10 mb-4 w-12 h-12">
                    <Icon className="text-primary h-6 w-6" />
                  </div>
                  
                  <CardTitle className="text-xl">
                    {plan.name}
                  </CardTitle>
                  
                  <CardDescription className="text-xs">
                    {plan.duration} {plan.duration_unit} access
                  </CardDescription>

                  <div className="mt-4 space-y-1">
                    <div className="flex items-baseline">
                      <span className="font-bold text-foreground text-3xl">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        {plan.currency}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${(plan.price / plan.duration).toFixed(2)} per day
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-4">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="text-primary flex-shrink-0 h-4 w-4" />
                      <span className="text-foreground text-xs">
                        {feature}
                      </span>
                    </div>
                  ))}
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Check className="text-primary flex-shrink-0 h-4 w-4" />
                    <span className="text-foreground text-xs">
                      Up to {plan.device_limit} devices
                    </span>
                  </div>

                  {!plan.show_ads && (
                    <div className="flex items-center gap-2">
                      <Check className="text-primary flex-shrink-0 h-4 w-4" />
                      <span className="text-foreground text-xs">
                        Ad-free experience
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full font-semibold ${
                      isPopular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-secondary hover:bg-secondary/90'
                    } h-10 text-sm`}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/30 px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-center mb-8 text-xl">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <div className="bg-card rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm">
                Can I cancel anytime?
              </h3>
              <p className="text-muted-foreground text-xs">
                Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>

            <div className="bg-card rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm">
                How many devices can I use?
              </h3>
              <p className="text-muted-foreground text-xs">
                Each plan allows streaming on multiple devices simultaneously. Check the device limit for each plan above.
              </p>
            </div>

            <div className="bg-card rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-sm">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground text-xs">
                We accept all major credit cards, debit cards, and digital payment methods for your convenience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Content</DialogTitle>
            <DialogDescription>
              Complete your purchase using your wallet balance
            </DialogDescription>
          </DialogHeader>

          {confirmPlanDetails && (
            <div className="space-y-4 py-4">
              {/* Plan Info */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{confirmPlanDetails.name}</p>
                <p className="text-xs text-muted-foreground">
                  {confirmPlanDetails.duration} {confirmPlanDetails.duration_unit}
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
                  ${confirmPlanDetails.price.toFixed(2)} {confirmPlanDetails.currency}
                </span>
              </div>

              {/* Remaining Balance Preview */}
              {walletBalance >= confirmPlanDetails.price && (
                <div className="bg-muted/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Remaining balance after purchase</p>
                  <p className="text-sm font-semibold text-foreground">
                    ${(walletBalance - confirmPlanDetails.price).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={selectedPlan !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={selectedPlan !== null}
              className="gap-2"
            >
              {selectedPlan !== null ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Pay with Wallet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;
