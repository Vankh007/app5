import { Tv, Film, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useState } from 'react';
import { HomeFilledIcon, ShortsIcon } from '@/components/icons/CustomIcons';
import { Capacitor } from '@capacitor/core';
import { useFullscreenState } from '@/hooks/useFullscreenState';

const BottomNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isFullscreen = useFullscreenState();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { path: '/', icon: HomeFilledIcon, label: t('home') },
    { path: '/series', icon: Tv, label: t('series') },
    { path: '/movies', icon: Film, label: t('movies') },
    { path: '/short', icon: ShortsIcon, label: t('shorts') },
    { path: '/search', icon: Search, label: t('search') },
  ];

  const isShortPage = location.pathname === '/short';
  const isMobileOrTablet = isMobile || isTablet;
  const isNative = Capacitor.isNativePlatform();

  // Hide BottomNav completely during fullscreen video playback
  if (isFullscreen) {
    return null;
  }

  return (
    <nav 
      data-bottom-nav="true"
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${
        isShortPage 
          ? '' 
          : isMobileOrTablet || isNative
            ? 'bg-background/50 backdrop-blur-md border-t border-border/50' 
            : 'bg-background/80 backdrop-blur-lg border-t border-border'
      } ${isNative ? 'native-app-bottom-nav' : ''}`}
      style={{ 
        marginBottom: '0.1px',
        paddingBottom: isNative ? 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' : 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex justify-around items-center h-12 max-w-screen-xl mx-auto py-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
