import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useNativeStatusBar } from '@/hooks/useNativeStatusBar';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { useFullscreenState } from '@/hooks/useFullscreenState';

export const ThemeStatusBar = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const isFullscreen = useFullscreenState();

  // Apply native status bar theming on mobile
  useNativeStatusBar();

  // Allow landscape on video routes and during fullscreen; otherwise lock to portrait.
  const allowLandscape =
    isFullscreen ||
    /^\/watch(\/|$)/.test(location.pathname) ||
    /^\/embed(\/|$)/.test(location.pathname) ||
    /^\/short(\/|$)/.test(location.pathname);

  useScreenOrientation(allowLandscape);

  useEffect(() => {
    // Update theme-color meta tag dynamically based on current theme
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (metaThemeColor) {
      const newColor = theme === 'dark' ? '#0f1419' : '#ffffff';
      metaThemeColor.setAttribute('content', newColor);
    }
  }, [theme]);

  return null;
};
