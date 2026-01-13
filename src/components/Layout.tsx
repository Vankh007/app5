import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, LogOut, Upload, Bell, Mic, Menu, Wallet, Crown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileSidebar from './MobileSidebar';
import BottomNav from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import VoiceSearchButton from './VoiceSearchButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';
import { KHQRPaymentDialog } from './payment/KHQRPaymentDialog';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';
import { MembershipDialog } from '@/components/MembershipDialog';
import { PullToRefresh } from './PullToRefresh';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { Capacitor } from '@capacitor/core';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isNative = Capacitor.isNativePlatform();
  const { effectiveTheme } = useTheme();
  const siteSettings = useSiteSettingsOptional();

  const lightLogo = siteSettings?.logos?.light_logo || logoLight;
  const darkLogo = siteSettings?.logos?.dark_logo || logoDark;
  const brandTitle = siteSettings?.settings?.site_title || 'KHMERZOON';
  const logo = effectiveTheme === 'light' ? lightLogo : darkLogo;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [footerMoreOpen, setFooterMoreOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleRefresh = async () => {
    // Reload the current page
    window.location.reload();
  };

  useEffect(() => {
    const isGuestMode = localStorage.getItem('guestMode') === 'true';
    if (!loading && !user && !isGuestMode) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();
        if (data) {
          setWalletBalance(Number(data.wallet_balance || 0));
        }
      } else {
        setWalletBalance(0); // Guest mode
      }
    };
    fetchWalletBalance();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('guestMode');
    navigate('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleVoiceSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isGuestMode = localStorage.getItem('guestMode') === 'true';
  if (!user && !isGuestMode) {
    return null;
  }

  // Mobile, Tablet, and Native App Layout - unified experience
  if (isMobile || isTablet || isNative) {
    const isHome = location.pathname === '/';

    // Native app: allow content to render behind the transparent status bar on Home.
    // Other routes keep safe-area padding to avoid unexpected overlaps.
    const topInsetClass = isNative
      ? (isHome ? '' : 'native-safe-area-top')
      : 'pt-[env(safe-area-inset-top)]';

    return (
      <div className={`min-h-screen bg-background dark:bg-black ${topInsetClass}`.trim()}>
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        
        <PullToRefresh onRefresh={handleRefresh}>
          <main className="min-h-screen pb-16 px-[1px]">
            {children}
          </main>
        </PullToRefresh>

        <BottomNav />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-16 transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/30' : 'bg-transparent'}`}>
        <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
          {/* Left: Collapse Icon + Logo/Brand */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-accent text-primary dark:text-white"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <img src={logo} alt="KHMERZOON" className="w-10 h-10 object-contain" />
            <span className="font-bold text-xl hidden sm:block text-primary dark:text-white">KHMERZOON</span>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-4 pr-4 rounded-full bg-secondary/[0.15] border-border/[0.26] text-foreground placeholder:text-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-12 rounded-r-full hover:bg-accent text-primary dark:text-white"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
              <VoiceSearchButton onSearchResult={handleVoiceSearch} />
            </form>
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-2">
            <LanguageToggle variant="icon" />
            <ThemeToggle />
            <NotificationsDropdown />
            <Button
              variant="ghost"
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                } else {
                  setShowPaymentDialog(true);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all hover:scale-105"
            >
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {user ? `$${walletBalance.toFixed(2)}` : 'Sign In'}
              </span>
            </Button>
            <Button 
              variant="default"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setMembershipDialogOpen(true)}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Join Member</span>
            </Button>
          </div>
        </div>
      </header>

      <KHQRPaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        onSuccess={(newBalance) => setWalletBalance(newBalance)}
      />

      <MembershipDialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen} />

      {/* Overlay Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div 
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] z-40 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar collapsed={false} onToggle={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="pt-16 min-h-screen">
          <div className="p-0 mx-0">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-background/95">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} KHMERZOON. All rights reserved.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <span>•</span>
                <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
                <span>•</span>
                <Link to="/about" className="hover:text-primary transition-colors">About</Link>
                <span>•</span>
                <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
                <span>•</span>
                <Link to="/sitemap" className="hover:text-primary transition-colors">Sitemap</Link>
                <span>•</span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFooterMoreOpen((v) => !v)}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                    aria-haspopup="menu"
                    aria-expanded={footerMoreOpen}
                  >
                    More
                    <ChevronUp
                      className={`h-3 w-3 transition-transform ${footerMoreOpen ? 'rotate-0' : 'rotate-180'}`}
                    />
                  </button>

                  {footerMoreOpen && (
                    <div
                      role="menu"
                      className="absolute bottom-full right-0 mb-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg py-2 min-w-[220px] z-50"
                    >
                      <Link
                        to="/faq"
                        className="block px-4 py-2 hover:bg-muted transition-colors"
                        onClick={() => setFooterMoreOpen(false)}
                        role="menuitem"
                      >
                        FAQ / Help Center
                      </Link>
                      <Link
                        to="/how-it-works"
                        className="block px-4 py-2 hover:bg-muted transition-colors"
                        onClick={() => setFooterMoreOpen(false)}
                        role="menuitem"
                      >
                        How It Works
                      </Link>
                      <Link
                        to="/features"
                        className="block px-4 py-2 hover:bg-muted transition-colors"
                        onClick={() => setFooterMoreOpen(false)}
                        role="menuitem"
                      >
                        Features
                      </Link>
                      <Link
                        to="/blog"
                        className="block px-4 py-2 hover:bg-muted transition-colors"
                        onClick={() => setFooterMoreOpen(false)}
                        role="menuitem"
                      >
                        Blog
                      </Link>
                      <Link
                        to="/dmca"
                        className="block px-4 py-2 hover:bg-muted transition-colors"
                        onClick={() => setFooterMoreOpen(false)}
                        role="menuitem"
                      >
                        DMCA / Copyright Policy
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </PullToRefresh>
    </div>
  );
};

export default Layout;
