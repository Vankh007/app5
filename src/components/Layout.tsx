import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MobileHeader from './MobileHeader';
import MobileSidebar from './MobileSidebar';
import BottomNav from './BottomNav';
import { PullToRefresh } from './PullToRefresh';
import { Capacitor } from '@capacitor/core';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Mobile-only layout
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
};

export default Layout;
