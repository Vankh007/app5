import { useState } from 'react';
import { Flame, ChevronDown, ChevronUp, Menu, Tv, Clapperboard, User, ShoppingBag, Crown, Folder, Sparkles, Clock, Wallet, LogIn, Heart } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';
import logoDefault from '@/assets/logo-red-lion.png';
import logoLightDefault from '@/assets/logo-light-new.png';
import { ForYouIcon, HomeFilledIcon, ShortsIcon } from '@/components/icons/CustomIcons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useWallet } from '@/hooks/useWallet';
import { SubscriptionDialog } from '@/components/subscription/SubscriptionDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}
interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
  is_active: boolean;
}
const Sidebar = ({
  collapsed = false,
  onToggle
}: SidebarProps) => {
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(true);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const {
    effectiveTheme
  } = useTheme();
  const {
    t
  } = useLanguage();
  const siteSettings = useSiteSettingsOptional();
  const {
    user
  } = useAuth();
  const {
    hasActiveSubscription,
    remainingDays
  } = useSubscription();
  const {
    balance
  } = useWallet();
  const navigate = useNavigate();
  const isSlideIn = !collapsed && onToggle;

  // Get logo from settings or use defaults
  const lightLogo = siteSettings?.logos?.light_logo || logoLightDefault;
  const darkLogo = siteSettings?.logos?.dark_logo || logoDefault;
  const currentLogo = effectiveTheme === 'dark' ? darkLogo : lightLogo;

  // Fetch user profile for avatar
  const {
    data: profile
  } = useQuery({
    queryKey: ['sidebar-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const {
        data
      } = await supabase.from('profiles').select('profile_image, username').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user
  });

  // Fetch available membership plans
  const {
    data: membershipPlans
  } = useQuery({
    queryKey: ['sidebar-membership-plans'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('membership_plans').select('*').eq('is_active', true).order('price', {
        ascending: true
      });
      if (error) throw error;
      return data as MembershipPlan[];
    }
  });

  // Fetch user's current subscription
  const {
    data: userSubscription
  } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const {
        data,
        error
      } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').gte('end_date', new Date().toISOString()).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
  const mainNavItems = [{
    title: t('home'),
    icon: HomeFilledIcon,
    path: '/'
  }, {
    title: t('dashboard'),
    icon: User,
    path: '/dashboard'
  }, {
    title: t('liked'),
    icon: Heart,
    path: '/liked'
  }, {
    title: 'Collections',
    icon: Folder,
    path: '/collections'
  }, {
    title: t('shorts'),
    icon: ShortsIcon,
    path: '/short'
  }, {
    title: t('series'),
    icon: Tv,
    path: '/series'
  }, {
    title: t('movies'),
    icon: Clapperboard,
    path: '/movies'
  }, {
    title: t('shop'),
    icon: ShoppingBag,
    path: '/shop'
  }, {
    title: t('premium'),
    icon: Crown,
    path: '/premium'
  }, {
    title: t('viral'),
    icon: Flame,
    path: '/viral'
  }];
  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('diamond') || name.includes('diamon')) return '💎';
    if (name.includes('gold')) return '🥇';
    if (name.includes('silver')) return '🥈';
    if (name.includes('starter') || name.includes('basic')) return '⭐';
    return '✨';
  };
  const handlePlanClick = (planId: string) => {
    setSelectedPlanId(planId);
    setShowSubscriptionDialog(true);
    if (isSlideIn && onToggle) onToggle();
  };
  const handleLoginClick = () => {
    navigate('/auth');
    if (isSlideIn && onToggle) onToggle();
  };
  const getUserInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };
  return <>
      <aside className={cn('h-full w-56 bg-background/15 border-r border-border/20', isSlideIn && 'h-full bg-background/15')}>
        <ScrollArea className="h-full">
          <div className="pt-4 pb-2">

            {/* Main Navigation */}
            <nav className={cn("space-y-0.5", collapsed ? "px-0.5" : "px-1.5")}>
              {mainNavItems.map(item => <NavLink key={item.path} to={item.path} onClick={isSlideIn ? onToggle : undefined} className={({
              isActive
            }) => cn('flex rounded-lg text-sm font-medium transition-colors text-gray-800 dark:text-white', 'hover:bg-gray-100 dark:hover:bg-accent', isActive && 'bg-primary text-white', collapsed ? 'flex-col items-center justify-center gap-0.5 px-1 py-2' : 'flex-row items-center gap-2 px-1.5 py-2')}>
                  <item.icon className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-6 w-6")} />
                  {collapsed ? <span className="text-[10px] text-center leading-tight">{item.title}</span> : <span className="flex-1">{item.title}</span>}
                </NavLink>)}
            </nav>

            {/* Divider */}
            {!collapsed && <div className="my-4 border-t border-border" />}

            {/* Subscriptions Section */}
            {!collapsed && <div className="px-1.5">
                <button onClick={() => setSubscriptionsExpanded(!subscriptionsExpanded)} className="flex items-center justify-between w-full px-1.5 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                  <span>{t('subscriptions')}</span>
                  {subscriptionsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>

                {subscriptionsExpanded && <div className="space-y-1">
                    {/* Current Subscription Status */}
                    {user && hasActiveSubscription && userSubscription && <div className="mx-1.5 p-1.5 rounded-lg bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Crown className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">
                            {userSubscription.plan_name || 'Premium'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{remainingDays} days remaining</span>
                        </div>
                      </div>}

                    {/* Available Plans */}
                    <nav className="space-y-0.5">
                      {membershipPlans && membershipPlans.length > 0 ? membershipPlans.map(plan => <button key={plan.id} onClick={() => handlePlanClick(plan.id)} className="flex items-center gap-1.5 w-full px-1.5 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-accent text-gray-800 dark:text-white">
                            <span className="text-lg flex-shrink-0">{getPlanIcon(plan.name)}</span>
                            <div className="flex-1 text-left">
                              <span className="block truncate">{plan.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {plan.currency} {plan.price.toFixed(2)}/{plan.duration} {plan.duration_unit}
                              </span>
                            </div>
                            {hasActiveSubscription && userSubscription?.plan_name === plan.name && <Sparkles className="h-4 w-4 text-primary" />}
                          </button>) : <div className="px-3 py-2 text-sm text-muted-foreground">
                          No plans available
                        </div>}
                    </nav>

                    {/* User Profile with Wallet Balance (when logged in) */}
                    {user && <div className="mx-1.5 p-1.5 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate('/dashboard')}>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-8 w-8 border-2 border-primary">
                            <AvatarImage src={profile?.profile_image || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {profile?.username || user.email?.split('@')[0] || 'User'}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Wallet className="h-3 w-3" />
                              <span className="font-medium text-primary">${balance.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>}

                    {/* Login button for guests */}
                    {!user && <Button onClick={handleLoginClick} className="w-full mx-1.5 mt-1 bg-primary hover:bg-primary/90" size="sm" style={{
                width: 'calc(100% - 0.75rem)'
              }}>
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Button>}
                  </div>}
              </div>}
          </div>
        </ScrollArea>
      </aside>

      {/* Subscription Dialog */}
      <SubscriptionDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog} />
    </>;
};
export default Sidebar;