import { useTheme } from '@/contexts/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { Wallet, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Capacitor } from '@capacitor/core';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

const MobileHeader = ({
  onMenuClick
}: MobileHeaderProps) => {
  const {
    effectiveTheme
  } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    balance,
    refetch: refetchBalance
  } = useWallet();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    profile_image: string | null;
    username: string | null;
    full_name: string | null;
  } | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfileData(null);
        return;
      }
      const {
        data
      } = await supabase.from('profiles').select('profile_image, username, full_name').eq('id', user.id).maybeSingle();
      setProfileData(data);
    };
    fetchProfile();
  }, [user]);
  const isShortPage = location.pathname === '/short';
  const hideHeaderStyles = isShortPage;
  const isNative = Capacitor.isNativePlatform();
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${isNative ? 'native-app-header' : 'pt-[env(safe-area-inset-top)]'} ${hideHeaderStyles ? 'bg-transparent border-0' : isScrolled ? 'backdrop-blur-md bg-background/85' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between h-14 px-4 mt-2 py-[30px]">
        {/* Menu Button */}
        <button onClick={onMenuClick} className="p-2 hover:bg-accent rounded-lg transition-colors text-gray-800 dark:text-white touch-feedback" aria-label="Open menu">
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
            <path d="M96 160C96 142.3 110.3 128 128 128L512 128C529.7 128 544 142.3 544 160C544 177.7 529.7 192 512 192L128 192C110.3 192 96 177.7 96 160zM96 320C96 302.3 110.3 288 128 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L128 352C110.3 352 96 337.7 96 320zM544 480C544 497.7 529.7 512 512 512L128 512C110.3 512 96 497.7 96 480C96 462.3 110.3 448 128 448L512 448C529.7 448 544 462.3 544 480z" />
          </svg>
        </button>

        {/* Spacer for centering balance */}
        <div className="flex-1"></div>

        {/* User Profile / Sign In, Notifications & Theme Toggle */}
        <div className="flex items-center gap-2">
          {!isShortPage && (user ?
        // Logged in: Show profile picture, name, and wallet balance in one line
        <button onClick={() => setIsPaymentDialogOpen(true)} className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-accent/50 rounded-full transition-colors">
                <Avatar className="w-6 h-6 border-2 border-primary">
                  <AvatarImage src={profileData?.profile_image || ''} alt={profileData?.username || profileData?.full_name || 'User'} />
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                    {(profileData?.username || profileData?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground truncate max-w-[60px]">
                  {profileData?.username || profileData?.full_name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-xs font-semibold text-primary">
                  ${balance.toFixed(2)}
                </span>
              </button> :
        // Not logged in: Show Sign In button (no background)
        <button onClick={() => navigate('/auth')} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-accent/50 rounded-lg transition-colors">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  Sign In
                </span>
              </button>)}
          {!isShortPage && <NotificationsDropdown />}
          {!isShortPage && <ThemeToggle />}
        </div>
      </div>

      <KHQRPaymentDialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} onSuccess={() => refetchBalance()} />
    </header>;
};
export default MobileHeader;