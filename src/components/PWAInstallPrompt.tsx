import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share, Plus } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';

import defaultLogo from '@/assets/logo-red-lion.png';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-prompt-dismissed';
const DISMISS_HOURS = 24;
const PROMPT_DELAY_MS = 3000;

const PWAInstallPrompt = () => {
  const { effectiveTheme } = useTheme();
  const siteSettings = useSiteSettingsOptional();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const brandTitle = siteSettings?.settings?.site_title || 'KHMERZOON';

  const promptLogo = useMemo(() => {
    const fallback = defaultLogo;
    const favicon = siteSettings?.logos?.favicon;
    if (favicon) return favicon;

    const themedLogo =
      effectiveTheme === 'light' ? siteSettings?.logos?.light_logo : siteSettings?.logos?.dark_logo;
    return themedLogo || fallback;
  }, [effectiveTheme, siteSettings?.logos?.dark_logo, siteSettings?.logos?.favicon, siteSettings?.logos?.light_logo]);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS/iPad devices (including iPadOS which reports as Mac with touch)
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    if (standalone) return;

    // Check if dismissed recently (within 24 hours)
    const dismissedTime = localStorage.getItem(DISMISS_KEY);
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < DISMISS_HOURS) {
        return;
      }
    }

    // Only show fallback timer for iOS (since they can't get beforeinstallprompt)
    // For other browsers, only show when we actually have the install prompt
    const fallbackTimer = isIOSDevice
      ? window.setTimeout(() => setShowPrompt(true), PROMPT_DELAY_MS)
      : undefined;

    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const installedHandler = () => {
      setIsStandalone(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Hide the prompt for a while regardless of outcome
    localStorage.setItem(DISMISS_KEY, Date.now().toString());

    console.log(`User response: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  // Don't show if already installed or prompt not ready
  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-6 md:w-[360px] lg:w-[400px] bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-background border-2 border-primary flex items-center justify-center flex-shrink-0 p-2 shadow-lg">
          <img
            src={promptLogo}
            alt={`${brandTitle} app icon`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>

        <div className="flex-1 pr-4">
          <h3 className="font-bold text-lg text-foreground mb-1">Install {brandTitle}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Install our app for quick access and a better experience
          </p>

          {isIOS ? (
            // iOS/iPad instructions
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <Share className="h-4 w-4 text-primary flex-shrink-0" />
                <span>
                  Tap the <strong className="text-foreground">Share</strong> button
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <Plus className="h-4 w-4 text-primary flex-shrink-0" />
                <span>
                  Then tap <strong className="text-foreground">"Add to Home Screen"</strong>
                </span>
              </div>
              <Button onClick={handleDismiss} size="sm" variant="outline" className="w-full mt-2">
                Got it
              </Button>
            </div>
          ) : (
            // Android/Desktop (or fallback instructions if the install event isn't available)
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                Install
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="outline" className="px-4">
                Not now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

