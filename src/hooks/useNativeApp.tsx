import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * PWA-compatible app functionality hook
 * Handles: navigation, theme integration
 * No native dependencies - works in all browsers
 */
export function useNativeApp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Handle browser back button for PWA
  useEffect(() => {
    // For PWA standalone mode, we could add custom back handling here
    // Currently letting browser handle this naturally
  }, [navigate, location.pathname]);

  return {
    isNative: false,
    platform: 'web' as const,
    isAndroid: false,
    isIOS: false,
  };
}

/**
 * Check if running as installed PWA
 */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Static helper - always returns false for PWA
 */
export function isNativePlatform(): boolean {
  return false;
}

/**
 * Static helper - always returns 'web' for PWA
 */
export function getNativePlatform(): 'android' | 'ios' | 'web' {
  return 'web';
}
