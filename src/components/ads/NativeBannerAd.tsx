import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { initializeAdMob } from '@/services/admobService';

interface NativeBannerAdProps {
  placement: string;
  className?: string;
}

interface BannerAdConfig {
  ad_unit_id: string;
  is_test_mode: boolean;
  platform: string;
}

// AdMob Banner plugin interface
interface AdMobBannerPlugin {
  showBanner: (options: { 
    adId: string; 
    isTesting?: boolean;
    position?: 'top' | 'bottom';
    margin?: number;
  }) => Promise<void>;
  hideBanner: () => Promise<void>;
  resumeBanner: () => Promise<void>;
  removeBanner: () => Promise<void>;
  addListener: (eventName: string, callback: (info: any) => void) => Promise<{ remove: () => void }>;
}

function getAdMobPlugin(): AdMobBannerPlugin | null {
  try {
    const plugins = (window as any).Capacitor?.Plugins;
    if (plugins?.AdMob) {
      return plugins.AdMob as AdMobBannerPlugin;
    }
    return null;
  } catch (error) {
    console.error('[NativeBannerAd] Error getting plugin:', error);
    return null;
  }
}

export function NativeBannerAd({ placement, className = '' }: NativeBannerAdProps) {
  const [adConfig, setAdConfig] = useState<BannerAdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowing, setIsShowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch banner ad configuration from database
  useEffect(() => {
    const fetchAdConfig = async () => {
      if (!Capacitor.isNativePlatform()) {
        setIsLoading(false);
        return;
      }

      try {
        // Determine platform
        const platform = Capacitor.getPlatform(); // 'android' or 'ios'
        
        // Fetch active banner ad for this placement
        const { data, error } = await supabase
          .from('app_ads')
          .select('*')
          .eq('placement', placement)
          .eq('ad_type', 'banner')
          .eq('is_active', true)
          .or(`platform.eq.${platform},platform.eq.both`)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[NativeBannerAd] Error fetching ad config:', error);
          setError('Failed to load ad configuration');
          setIsLoading(false);
          return;
        }

        if (data) {
          setAdConfig({
            ad_unit_id: data.ad_unit_id,
            is_test_mode: data.is_test_mode,
            platform: data.platform,
          });
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('[NativeBannerAd] Error:', err);
        setError('Failed to load ad');
        setIsLoading(false);
      }
    };

    fetchAdConfig();
  }, [placement]);

  // Show banner ad when config is available
  const showBanner = useCallback(async () => {
    if (!adConfig || !Capacitor.isNativePlatform() || isShowing) return;

    try {
      // Initialize AdMob first
      const initialized = await initializeAdMob();
      if (!initialized) {
        console.error('[NativeBannerAd] AdMob not initialized');
        return;
      }

      const plugin = getAdMobPlugin();
      if (!plugin) {
        console.error('[NativeBannerAd] AdMob plugin not available');
        return;
      }

      console.log('[NativeBannerAd] Showing banner ad:', adConfig.ad_unit_id);
      
      await plugin.showBanner({
        adId: adConfig.ad_unit_id,
        isTesting: adConfig.is_test_mode,
        position: 'top',
        margin: 0,
      });

      setIsShowing(true);
      console.log('[NativeBannerAd] Banner shown successfully');
    } catch (err) {
      console.error('[NativeBannerAd] Error showing banner:', err);
      setError('Failed to show ad');
    }
  }, [adConfig, isShowing]);

  // Hide banner on unmount
  useEffect(() => {
    return () => {
      if (isShowing && Capacitor.isNativePlatform()) {
        const plugin = getAdMobPlugin();
        if (plugin) {
          plugin.hideBanner().catch(console.error);
        }
      }
    };
  }, [isShowing]);

  // Show banner when config is ready
  useEffect(() => {
    if (adConfig && !isShowing) {
      showBanner();
    }
  }, [adConfig, showBanner, isShowing]);

  // Don't render anything on non-native platforms
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  // Don't render if no ad config or error
  if (isLoading) {
    return (
      <div className={`w-full h-[50px] bg-muted/30 animate-pulse ${className}`} />
    );
  }

  if (error || !adConfig) {
    return null;
  }

  // Placeholder for banner ad space (native banner renders above/below app)
  return (
    <div 
      className={`w-full h-[50px] bg-background/50 flex items-center justify-center ${className}`}
      style={{ minHeight: '50px' }}
    >
      {!isShowing && (
        <span className="text-xs text-muted-foreground">Ad Loading...</span>
      )}
    </div>
  );
}

// Inline banner ad component (renders within the layout)
export function InlineNativeBannerAd({ placement, className = '' }: NativeBannerAdProps) {
  const [adConfig, setAdConfig] = useState<BannerAdConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);

  // Fetch banner ad configuration from database
  useEffect(() => {
    const fetchAdConfig = async () => {
      if (!Capacitor.isNativePlatform()) {
        setIsLoading(false);
        return;
      }

      try {
        const platform = Capacitor.getPlatform();
        
        const { data, error } = await supabase
          .from('app_ads')
          .select('*')
          .eq('placement', placement)
          .eq('ad_type', 'banner')
          .eq('is_active', true)
          .or(`platform.eq.${platform},platform.eq.both`)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[InlineNativeBannerAd] Error fetching ad config:', error);
          setIsLoading(false);
          return;
        }

        if (data) {
          setAdConfig({
            ad_unit_id: data.ad_unit_id,
            is_test_mode: data.is_test_mode,
            platform: data.platform,
          });
          setAdLoaded(true);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('[InlineNativeBannerAd] Error:', err);
        setIsLoading(false);
      }
    };

    fetchAdConfig();
  }, [placement]);

  // Don't render anything on non-native platforms
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`w-full h-[60px] bg-muted/20 animate-pulse rounded ${className}`} />
    );
  }

  if (!adConfig) {
    return null;
  }

  // Render a placeholder that indicates an ad should be here
  // The actual native banner will be rendered by the AdMob SDK
  return (
    <div 
      className={`w-full bg-muted/10 border border-border/30 rounded flex items-center justify-center ${className}`}
      style={{ minHeight: '60px', maxHeight: '100px' }}
      data-ad-unit={adConfig.ad_unit_id}
      data-ad-placement={placement}
    >
      <div className="text-center py-2">
        <span className="text-xs text-muted-foreground">
          {adLoaded ? 'Advertisement' : 'Loading Ad...'}
        </span>
      </div>
    </div>
  );
}
