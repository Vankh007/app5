import { useState } from 'react';
import { Search, Crown, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { MembershipDialog } from '@/components/MembershipDialog';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import logoDefault from '@/assets/logo-red-lion.png';
import logoLightDefault from '@/assets/logo-light-new.png';
import logoKhmerzoon from '@/assets/khmerzoon.png';

interface HeaderProps {
  onMenuClick: () => void;
  hideJoinMember?: boolean;
}

const Header = ({ onMenuClick, hideJoinMember = false }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const siteSettings = useSiteSettingsOptional();
  const { user } = useAuth();
  const { balance, refetch: refetchBalance } = useWallet();

  // Get logo from settings or use defaults
  const lightLogo = siteSettings?.logos?.light_logo || logoLightDefault;
  const darkLogo = siteSettings?.logos?.dark_logo || logoDefault;
  const currentLogo = effectiveTheme === 'dark' ? darkLogo : lightLogo;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full bg-transparent">
      <div className="flex h-12 items-center px-4 gap-4">
        {/* Left: Logo and Menu */}
        <div className="flex items-center gap-3">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="hover:bg-accent text-gray-800 dark:text-white h-10 w-10"
          >
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
              <path d="M96 160C96 142.3 110.3 128 128 128L512 128C529.7 128 544 142.3 544 160C544 177.7 529.7 192 512 192L128 192C110.3 192 96 177.7 96 160zM96 320C96 302.3 110.3 288 128 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L128 352C110.3 352 96 337.7 96 320zM544 480C544 497.7 529.7 512 512 512L128 512C110.3 512 96 497.7 96 480C96 462.3 110.3 448 128 448L512 448C529.7 448 544 462.3 544 480z"/>
            </svg>
          </Button>

          {/* Logo with App Name */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src={currentLogo} 
              alt="Site Logo" 
              className="h-8 w-auto object-contain transition-all duration-300 ease-in-out"
            />
            <span className="font-bold text-lg text-primary dark:text-white transition-colors duration-300">
              {siteSettings?.settings?.site_title || 'KHMERZOON'}
            </span>
          </button>
        </div>

        {/* Center: Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 text-foreground placeholder:text-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ backgroundColor: 'hsl(210deg 40% 96% / 12%)', borderColor: 'hsl(214deg 32% 91% / 26%)' }}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full hover:bg-transparent text-gray-800 dark:text-white"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!user) {
                navigate('/auth');
              } else {
                setIsPaymentDialogOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {user ? `$${balance.toFixed(2)}` : 'Sign In'}
            </span>
          </button>
          <LanguageToggle variant="icon" />
          <ThemeToggle />
          <NotificationsDropdown />
          {!hideJoinMember && (
            <Button 
              variant="default" 
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setMembershipDialogOpen(true)}
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Join Member</span>
            </Button>
          )}
        </div>
      </div>

      <MembershipDialog 
        open={membershipDialogOpen} 
        onOpenChange={setMembershipDialogOpen}
      />

      <KHQRPaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        onSuccess={() => refetchBalance()}
      />
    </header>
  );
};

export default Header;
