import { Tv, Film, Video, Heart, Clock, Download, TrendingUp, User, ShoppingBag, Crown, Sun, Moon, Wallet, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionDialog } from '@/components/subscription/SubscriptionDialog';
import { useState } from 'react';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const HomeIcon = () => (
  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z"/>
  </svg>
);

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
  is_active: boolean;
}

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const { t } = useLanguage();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const siteSettings = useSiteSettingsOptional();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasActiveSubscription, remainingDays } = useSubscription();
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(true);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username, profile_image, wallet_balance')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch available membership plans
  const { data: membershipPlans } = useQuery({
    queryKey: ['mobile-sidebar-membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (error) throw error;
      return data as MembershipPlan[];
    },
  });

  // Fetch user's current subscription
  const { data: userSubscription } = useQuery({
    queryKey: ['mobile-user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('diamond') || name.includes('diamon')) return '💎';
    if (name.includes('gold')) return '🥇';
    if (name.includes('silver')) return '🥈';
    if (name.includes('starter') || name.includes('basic')) return '⭐';
    return '✨';
  };

  const handlePlanClick = (planId: string) => {
    setShowSubscriptionDialog(true);
    onClose();
  };

  const getUserInitials = () => {
    if (profile?.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  const handleUserClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
    onClose();
  };

  const navItems = [
    { path: '/', icon: HomeIcon, label: t('home') },
    { path: '/dashboard', icon: User, label: t('dashboard') },
    { path: '/series', icon: Tv, label: t('tvSeries') },
    { path: '/movies', icon: Film, label: t('movies') },
    { path: '/short', icon: Video, label: t('shortVideos') },
    { path: '/trending', icon: TrendingUp, label: t('trending') },
    { path: '/shop', icon: ShoppingBag, label: t('shop') },
    { path: '/premium', icon: Crown, label: t('premium') },
  ];

  const libraryItems = [
    { path: '/history', icon: Clock, label: t('history') },
    { path: '/liked', icon: Heart, label: t('likedVideos') },
    { path: '/downloads', icon: Download, label: t('downloads') },
  ];

  return (
    <>
      {/* Backdrop - Show on mobile and tablet (up to 1279px) */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-md z-40 transition-opacity duration-300 xl:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar - 85% of screen width on mobile */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-[85%] md:w-[50%] lg:w-[40%] bg-background/35 backdrop-blur-lg z-50 transform transition-transform duration-300 xl:hidden border-r border-border/30",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* User Info Section - Flat Style without background */}
            <div className="flex items-center justify-between py-3 px-2">
              <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={handleUserClick}>
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={profile?.profile_image || ''} alt="User" />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {user ? (profile?.username || t('user')) : t('guest')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || user?.phone || t('loginToAccess')}
                  </p>
                  {user && (
                    <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                      <Wallet className="w-3 h-3" />
                      <span>${profile?.wallet_balance?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-muted/50 rounded-full transition-colors"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Main Navigation */}
            <nav className="space-y-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Library */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                {t('library')}
              </h3>
              <nav className="space-y-1">
                {libraryItems.map(({ path, icon: Icon, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Subscriptions Section - Like Desktop */}
            <div className="space-y-2">
              <button
                onClick={() => setSubscriptionsExpanded(!subscriptionsExpanded)}
                className="flex items-center justify-between w-full px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>{t('subscriptions')}</span>
                {subscriptionsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {subscriptionsExpanded && (
                <div className="space-y-2">
                  {/* Current Subscription Status */}
                  {user && hasActiveSubscription && userSubscription && (
                    <div className="mx-3 p-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          {userSubscription.plan_name || 'Premium'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{remainingDays} days remaining</span>
                      </div>
                    </div>
                  )}

                  {/* Available Plans */}
                  <nav className="space-y-1">
                    {membershipPlans && membershipPlans.length > 0 ? (
                      membershipPlans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => handlePlanClick(plan.id)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-foreground/80"
                        >
                          <span className="text-xl flex-shrink-0">{getPlanIcon(plan.name)}</span>
                          <div className="flex-1 text-left">
                            <span className="block truncate">{plan.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {plan.currency} {plan.price.toFixed(2)}/{plan.duration} {plan.duration_unit}
                            </span>
                          </div>
                          {hasActiveSubscription && userSubscription?.plan_name === plan.name && (
                            <Sparkles className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No plans available
                      </div>
                    )}
                  </nav>
                </div>
              )}
            </div>

            {/* Language Toggle */}
            <div className="pt-4 border-t border-border/50">
              <LanguageToggle variant="full" />
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Subscription Dialog */}
      <SubscriptionDialog 
        open={showSubscriptionDialog} 
        onOpenChange={setShowSubscriptionDialog}
      />
    </>
  );
};

export default MobileSidebar;
