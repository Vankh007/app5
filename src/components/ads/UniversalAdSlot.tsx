import { useEffect, useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import AdSlot from './AdSlot';

interface AppAd {
  id: string;
  name: string;
  ad_type: string;
  ad_unit_id: string;
  platform: string;
  placement: string;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
}

interface AdMobSettings {
  enabled: boolean;
  test_mode: boolean;
}

interface UniversalAdSlotProps {
  placement: string;
  className?: string;
  pageLocation?: string;
}

// AdMob Plugin interface
interface AdMobPlugin {
  showBanner: (options: {
    adId: string;
    adSize?: string;
    position?: 'TOP_CENTER' | 'BOTTOM_CENTER';
    margin?: number;
    isTesting?: boolean;
  }) => Promise<void>;
  hideBanner: () => Promise<void>;
  prepareInterstitial?: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showInterstitial?: () => Promise<void>;
  prepareRewardVideoAd?: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showRewardVideoAd?: () => Promise<{ type: string; amount: number }>;
}

// Get AdMob plugin
const getAdMobPlugin = (): AdMobPlugin | null => {
  try {
    const AdMob = (window as any).Capacitor?.Plugins?.AdMob || (window as any).AdMob;
    return AdMob || null;
  } catch {
    return null;
  }
};

/**
 * Universal Ad Slot - supports all ad types from admin dashboard
 * Handles native AdMob ads and falls back to web ads
 */
export function UniversalAdSlot({ placement, className = '', pageLocation = 'watch' }: UniversalAdSlotProps) {
  const [isNative, setIsNative] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerShown, setBannerShown] = useState(false);
  const [webAdCode, setWebAdCode] = useState<string | null>(null);
  const [adConfig, setAdConfig] = useState<{ ad: AppAd; settings: AdMobSettings } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isInView, setIsInView] = useState(false);

  // Check if native platform
  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    
    if (native) {
      fetchAdConfig();
    } else {
      fetchWebAd();
    }
  }, [placement]);

  // Intersection observer to track visibility
  useEffect(() => {
    if (!slotRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting ?? false;
        setIsInView(isVisible);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(slotRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Fetch native AdMob config from Supabase - supports all ad types
  const fetchAdConfig = async () => {
    try {
      const platform = Capacitor.getPlatform();
      
      // Fetch ad for this placement - any ad type
      const { data: adsData } = await supabase
        .from('app_ads')
        .select('*')
        .eq('is_active', true)
        .eq('placement', placement)
        .or(`platform.eq.${platform},platform.eq.both`)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch global settings
      const { data: settingsData } = await supabase
        .from('app_ad_settings')
        .select('*')
        .eq('setting_key', 'global_settings')
        .maybeSingle();

      const rawSettings = settingsData?.setting_value as Record<string, unknown> | null;
      const settings: AdMobSettings = {
        enabled: (rawSettings?.enabled as boolean) ?? true,
        test_mode: (rawSettings?.test_mode as boolean) ?? true,
      };
      
      if (adsData && settings.enabled) {
        setAdConfig({ ad: adsData, settings });
        console.log('[UniversalAdSlot] Loaded config for placement:', placement, adsData.name, 'type:', adsData.ad_type);
      } else {
        console.log('[UniversalAdSlot] No active ad found for placement:', placement);
        // Try fetching web ad as fallback
        fetchWebAd();
      }
    } catch (error) {
      console.error('[UniversalAdSlot] Error fetching config:', error);
      fetchWebAd();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch web ad as fallback
  const fetchWebAd = async () => {
    try {
      const { data } = await supabase
        .from('ads')
        .select('ad_code, image_url, link_url')
        .eq('placement', placement)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.ad_code) {
        setWebAdCode(data.ad_code);
      }
    } catch (error) {
      console.log('[UniversalAdSlot] Could not fetch web ad for placement:', placement);
    } finally {
      setIsLoading(false);
    }
  };

  // Show native AdMob banner
  const showBanner = useCallback(async () => {
    if (!adConfig || bannerShown || !isInView) return;

    const AdMob = getAdMobPlugin();
    if (!AdMob) {
      console.log('[UniversalAdSlot] AdMob plugin not available');
      return;
    }

    try {
      const { ad, settings } = adConfig;
      const useTestMode = settings.test_mode || ad.is_test_mode;

      // Handle different ad types
      switch (ad.ad_type) {
        case 'banner':
          await AdMob.showBanner({
            adId: ad.ad_unit_id,
            adSize: 'ADAPTIVE_BANNER',
            position: 'BOTTOM_CENTER',
            isTesting: useTestMode,
          });
          break;
          
        case 'interstitial':
          if (AdMob.prepareInterstitial && AdMob.showInterstitial) {
            await AdMob.prepareInterstitial({
              adId: ad.ad_unit_id,
              isTesting: useTestMode,
            });
            // Interstitial will show when ready
          }
          break;
          
        case 'rewarded':
          if (AdMob.prepareRewardVideoAd) {
            await AdMob.prepareRewardVideoAd({
              adId: ad.ad_unit_id,
              isTesting: useTestMode,
            });
          }
          break;
          
        default:
          console.log('[UniversalAdSlot] Unknown ad type:', ad.ad_type);
          return;
      }

      setBannerShown(true);
      console.log('[UniversalAdSlot] Ad shown for placement:', placement, 'type:', ad.ad_type);
    } catch (error) {
      console.error('[UniversalAdSlot] Failed to show ad:', error);
    }
  }, [adConfig, bannerShown, isInView, placement]);

  // Hide native AdMob banner
  const hideBanner = useCallback(async () => {
    if (!bannerShown) return;

    const AdMob = getAdMobPlugin();
    if (!AdMob) return;

    try {
      await AdMob.hideBanner();
      setBannerShown(false);
      console.log('[UniversalAdSlot] Banner hidden');
    } catch (error) {
      console.error('[UniversalAdSlot] Failed to hide banner:', error);
    }
  }, [bannerShown]);

  // Show/hide banner based on visibility
  useEffect(() => {
    if (!isNative || !adConfig) return;

    // Only auto-show for banner type
    if (adConfig.ad.ad_type === 'banner') {
      if (isInView) {
        showBanner();
      } else if (bannerShown) {
        hideBanner();
      }
    }
  }, [isNative, adConfig, isInView, showBanner, hideBanner, bannerShown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isNative && bannerShown) {
        const AdMob = getAdMobPlugin();
        AdMob?.hideBanner?.().catch(() => {});
      }
    };
  }, [isNative, bannerShown]);

  // Native platform - render placeholder div for positioning
  if (isNative) {
    if (isLoading) {
      return (
        <div ref={slotRef} className={`w-full h-14 bg-muted/30 animate-pulse flex items-center justify-center rounded-lg ${className}`}>
          <span className="text-xs text-muted-foreground">Loading Ad...</span>
        </div>
      );
    }

    if (!adConfig) {
      return null; // No ad configured
    }

    // Different heights for different ad types
    const getHeight = () => {
      switch (adConfig.ad.ad_type) {
        case 'banner': return 'h-[60px]';
        case 'native': return 'h-[100px]';
        default: return 'h-[60px]';
      }
    };

    // Native banner will overlay on top, this is just a spacer
    return (
      <div 
        ref={slotRef} 
        className={`w-full ${getHeight()} ${className}`}
        data-placement={placement}
        data-ad-type={adConfig.ad.ad_type}
        data-banner-active={bannerShown}
      />
    );
  }

  // Web platform - show web ads
  if (webAdCode) {
    return (
      <div 
        ref={slotRef}
        className={`w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: webAdCode }}
      />
    );
  }

  // Fallback to regular AdSlot component
  if (!isLoading) {
    return <AdSlot placement={placement} pageLocation={pageLocation} className={className} />;
  }

  return null;
}

export default UniversalAdSlot;
