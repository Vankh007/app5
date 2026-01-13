import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  const { effectiveTheme } = useTheme();
  const { loading: authLoading } = useAuth();
  const siteSettings = useSiteSettingsOptional();

  // Only use settings values if they're actually loaded from DB
  const settingsLoaded = siteSettings && !siteSettings.isLoading;
  
  // Get logo and title from database, use local assets as fallback only if DB has no value
  const lightLogo = settingsLoaded ? (siteSettings.logos?.light_logo || logoLight) : null;
  const darkLogo = settingsLoaded ? (siteSettings.logos?.dark_logo || logoDark) : null;
  const brandTitle = settingsLoaded ? (siteSettings.settings?.site_title || 'KHMERZOON') : null;
  const logo = effectiveTheme === 'light' ? lightLogo : darkLogo;
  const isNative = Capacitor.isNativePlatform();

  const appReady = !authLoading && settingsLoaded;

  // Start min timer only once when content is ready to show
  useEffect(() => {
    if (settingsLoaded && logo && brandTitle && !contentReady) {
      setContentReady(true);
    }
  }, [settingsLoaded, logo, brandTitle, contentReady]);

  // Separate effect for the timer - only runs once when contentReady becomes true
  useEffect(() => {
    if (!contentReady) return;
    
    // Slightly longer splash on native for better UX
    const duration = isNative ? 2000 : 1500;
    const timer = window.setTimeout(() => {
      setMinTimePassed(true);
    }, duration);
    
    return () => window.clearTimeout(timer);
  }, [contentReady, isNative]);

  // Handle animation out
  useEffect(() => {
    if (!minTimePassed || !appReady) return;

    setIsAnimatingOut(true);
    const t = window.setTimeout(() => setIsVisible(false), 600);

    return () => window.clearTimeout(t);
  }, [minTimePassed, appReady]);

  if (!isVisible) return null;

  // Show loading state until settings are loaded from database
  if (!contentReady) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        isAnimatingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        {/* Logo with bounce animation */}
        <div
          className={`transform transition-all duration-700 ease-out ${
            isAnimatingOut ? 'scale-90 opacity-0' : 'scale-100 opacity-100 animate-bounce'
          }`}
          style={{ animationDuration: '2s' }}
        >
          <img
            src={logo}
            alt={`${brandTitle} logo`}
            className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-lg"
            loading="eager"
          />
        </div>

        {/* Site title with slide-up animation */}
        <div
          className={`transform transition-all duration-500 delay-200 ${
            isAnimatingOut ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-widest text-primary">
            {brandTitle.toUpperCase()}
          </h1>
        </div>

        {/* Animated underline */}
        <div
          className={`h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full transition-all duration-700 delay-300 ${
            isAnimatingOut ? 'w-0 opacity-0' : 'w-40 md:w-56 opacity-100'
          }`}
        />

        {/* Loading dots */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse"
              style={{ animationDelay: `${i * 200}ms`, animationDuration: '1s' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
