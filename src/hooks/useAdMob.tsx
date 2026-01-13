import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

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
  frequency_cap: number | null;
  show_after_seconds: number | null;
  reward_amount: number | null;
  reward_type: string | null;
}

interface AdMobSettings {
  enabled: boolean;
  test_mode: boolean;
  personalized_ads: boolean;
  child_directed: boolean;
  max_ad_content_rating: string;
  android_app_id?: string;
  ios_app_id?: string;
}

interface InterstitialSettings {
  show_on_app_start: boolean;
  show_between_episodes: boolean;
  cooldown_seconds: number;
  max_per_session: number;
}

interface RewardedSettings {
  reward_multiplier: number;
  video_complete_required: boolean;
  max_per_day: number;
}

interface BannerSettings {
  adaptive_banner: boolean;
  refresh_rate_seconds: number;
  anchor_position: 'top' | 'bottom';
}

// AdMob Plugin interface (from @capacitor-community/admob)
interface AdMobPlugin {
  initialize: (options: {
    testingDevices?: string[];
    initializeForTesting?: boolean;
    tagForChildDirectedTreatment?: boolean;
    tagForUnderAgeOfConsent?: boolean;
    maxAdContentRating?: 'General' | 'ParentalGuidance' | 'Teen' | 'MatureAudience';
  }) => Promise<void>;
  showBanner: (options: {
    adId: string;
    adSize?: string;
    position?: 'TOP_CENTER' | 'BOTTOM_CENTER';
    margin?: number;
    isTesting?: boolean;
  }) => Promise<void>;
  hideBanner: () => Promise<void>;
  prepareInterstitial: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showInterstitial: () => Promise<void>;
  prepareRewardVideoAd: (options: { adId: string; isTesting?: boolean }) => Promise<void>;
  showRewardVideoAd: () => Promise<{ type: string; amount: number }>;
}

// Session tracking for frequency caps
let sessionInterstitialCount = 0;
let lastInterstitialTime = 0;
let dailyRewardedCount = 0;
let lastRewardedDate = '';
let isAdMobInitialized = false;

export function useAdMob() {
  const [ads, setAds] = useState<AppAd[]>([]);
  const [globalSettings, setGlobalSettings] = useState<AdMobSettings | null>(null);
  const [interstitialSettings, setInterstitialSettings] = useState<InterstitialSettings | null>(null);
  const [rewardedSettings, setRewardedSettings] = useState<RewardedSettings | null>(null);
  const [bannerSettings, setBannerSettings] = useState<BannerSettings | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [adMobReady, setAdMobReady] = useState(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);
    
    if (native) {
      fetchAdsAndSettings();
    }
  }, []);

  // Initialize AdMob when settings are loaded
  useEffect(() => {
    if (isNative && globalSettings && !isAdMobInitialized && !initializingRef.current) {
      initializeAdMob();
    }
  }, [isNative, globalSettings]);

  const getAdMobPlugin = (): AdMobPlugin | null => {
    try {
      // Try to get the plugin from window (Capacitor plugins expose themselves here)
      const AdMob = (window as any).Capacitor?.Plugins?.AdMob || (window as any).AdMob;
      return AdMob || null;
    } catch {
      return null;
    }
  };

  const initializeAdMob = async () => {
    if (isAdMobInitialized || initializingRef.current || !globalSettings) return;
    
    initializingRef.current = true;
    const AdMob = getAdMobPlugin();
    
    if (!AdMob) {
      console.warn('[AdMob] Plugin not available. Install @capacitor-community/admob');
      initializingRef.current = false;
      return;
    }

    try {
      // Map content rating from dashboard to AdMob format
      const ratingMap: Record<string, 'General' | 'ParentalGuidance' | 'Teen' | 'MatureAudience'> = {
        'G - General Audiences': 'General',
        'PG - Parental Guidance': 'ParentalGuidance',
        'T - Teen': 'Teen',
        'MA - Mature Audience': 'MatureAudience',
      };

      await AdMob.initialize({
        testingDevices: globalSettings.test_mode ? [] : undefined,
        initializeForTesting: globalSettings.test_mode,
        tagForChildDirectedTreatment: globalSettings.child_directed,
        tagForUnderAgeOfConsent: globalSettings.child_directed,
        maxAdContentRating: ratingMap[globalSettings.max_ad_content_rating] || 'General',
      });

      isAdMobInitialized = true;
      setAdMobReady(true);
      console.log('[AdMob] Initialized successfully with settings:', {
        testMode: globalSettings.test_mode,
        childDirected: globalSettings.child_directed,
        maxRating: globalSettings.max_ad_content_rating,
      });
    } catch (error) {
      console.error('[AdMob] Initialization failed:', error);
    } finally {
      initializingRef.current = false;
    }
  };

  const fetchAdsAndSettings = async () => {
    try {
      const platform = Capacitor.getPlatform();
      
      // Fetch active ads for current platform
      const { data: adsData } = await supabase
        .from('app_ads')
        .select('*')
        .eq('is_active', true)
        .or(`platform.eq.${platform},platform.eq.both`)
        .order('priority', { ascending: false });

      setAds(adsData || []);

      // Fetch settings from app_ad_settings table
      const { data: settingsData } = await supabase
        .from('app_ad_settings')
        .select('*');

      settingsData?.forEach((s) => {
        const value = s.setting_value as Record<string, unknown>;
        switch (s.setting_key) {
          case 'global_settings':
            setGlobalSettings(value as unknown as AdMobSettings);
            break;
          case 'interstitial_settings':
            setInterstitialSettings(value as unknown as InterstitialSettings);
            break;
          case 'rewarded_settings':
            setRewardedSettings(value as unknown as RewardedSettings);
            break;
          case 'banner_settings':
            setBannerSettings(value as unknown as BannerSettings);
            break;
        }
      });
    } catch (error) {
      console.error('[AdMob] Error fetching config:', error);
    }
  };

  const getAdForPlacement = useCallback((placement: string, adType?: string): AppAd | null => {
    if (!globalSettings?.enabled) return null;

    let candidates = ads.filter(ad => ad.placement === placement);
    
    if (adType) {
      candidates = candidates.filter(ad => ad.ad_type === adType);
    }

    return candidates[0] || null;
  }, [ads, globalSettings]);

  const canShowInterstitial = useCallback((): boolean => {
    if (!globalSettings?.enabled || !interstitialSettings) return false;

    const now = Date.now();
    const cooldownMs = (interstitialSettings.cooldown_seconds || 60) * 1000;
    
    // Check cooldown
    if (now - lastInterstitialTime < cooldownMs) {
      return false;
    }

    // Check session limit
    if (sessionInterstitialCount >= (interstitialSettings.max_per_session || 5)) {
      return false;
    }

    return true;
  }, [globalSettings, interstitialSettings]);

  const showInterstitialAd = useCallback(async (placement: string): Promise<boolean> => {
    if (!canShowInterstitial()) return false;

    const ad = getAdForPlacement(placement, 'interstitial');
    if (!ad) return false;

    const AdMob = getAdMobPlugin();
    if (!AdMob) {
      console.log('[AdMob] Would show interstitial for:', placement);
      return false;
    }

    try {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      
      await AdMob.prepareInterstitial({
        adId: ad.ad_unit_id,
        isTesting: useTestMode,
      });
      
      await AdMob.showInterstitial();
      
      sessionInterstitialCount++;
      lastInterstitialTime = Date.now();
      
      console.log('[AdMob] Interstitial shown for:', placement);
      return true;
    } catch (error) {
      console.error('[AdMob] Failed to show interstitial:', error);
      return false;
    }
  }, [canShowInterstitial, getAdForPlacement, globalSettings]);

  const recordInterstitialShown = useCallback(() => {
    sessionInterstitialCount++;
    lastInterstitialTime = Date.now();
  }, []);

  const canShowRewarded = useCallback((): boolean => {
    if (!globalSettings?.enabled || !rewardedSettings) return false;

    const today = new Date().toDateString();
    
    // Reset daily counter if new day
    if (lastRewardedDate !== today) {
      dailyRewardedCount = 0;
      lastRewardedDate = today;
    }

    // Check daily limit
    if (dailyRewardedCount >= (rewardedSettings.max_per_day || 10)) {
      return false;
    }

    return true;
  }, [globalSettings, rewardedSettings]);

  const showRewardedAd = useCallback(async (placement: string): Promise<{ success: boolean; reward?: { type: string; amount: number } }> => {
    if (!canShowRewarded()) return { success: false };

    const ad = getAdForPlacement(placement, 'rewarded');
    if (!ad) return { success: false };

    const AdMob = getAdMobPlugin();
    if (!AdMob) {
      console.log('[AdMob] Would show rewarded ad for:', placement);
      return { success: false };
    }

    try {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      
      await AdMob.prepareRewardVideoAd({
        adId: ad.ad_unit_id,
        isTesting: useTestMode,
      });
      
      const result = await AdMob.showRewardVideoAd();
      
      dailyRewardedCount++;
      
      const rewardMultiplier = rewardedSettings?.reward_multiplier || 1;
      const reward = {
        type: result.type || ad.reward_type || 'coins',
        amount: (result.amount || ad.reward_amount || 1) * rewardMultiplier,
      };
      
      console.log('[AdMob] Rewarded ad completed:', reward);
      return { success: true, reward };
    } catch (error) {
      console.error('[AdMob] Failed to show rewarded ad:', error);
      return { success: false };
    }
  }, [canShowRewarded, getAdForPlacement, globalSettings, rewardedSettings]);

  const recordRewardedShown = useCallback(() => {
    dailyRewardedCount++;
  }, []);

  const getRewardAmount = useCallback((baseAmount: number): number => {
    const multiplier = rewardedSettings?.reward_multiplier || 1;
    return baseAmount * multiplier;
  }, [rewardedSettings]);

  const showBannerAd = useCallback(async (placement: string): Promise<boolean> => {
    if (!globalSettings?.enabled) return false;

    const ad = getAdForPlacement(placement, 'banner');
    if (!ad) return false;

    const AdMob = getAdMobPlugin();
    if (!AdMob) {
      console.log('[AdMob] Would show banner for:', placement);
      return false;
    }

    try {
      const useTestMode = globalSettings?.test_mode || ad.is_test_mode;
      const position = bannerSettings?.anchor_position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER';
      
      await AdMob.showBanner({
        adId: ad.ad_unit_id,
        adSize: bannerSettings?.adaptive_banner ? 'ADAPTIVE_BANNER' : 'SMART_BANNER',
        position,
        isTesting: useTestMode,
      });
      
      console.log('[AdMob] Banner shown for:', placement);
      return true;
    } catch (error) {
      console.error('[AdMob] Failed to show banner:', error);
      return false;
    }
  }, [globalSettings, getAdForPlacement, bannerSettings]);

  const hideBannerAd = useCallback(async (): Promise<void> => {
    const AdMob = getAdMobPlugin();
    if (AdMob) {
      try {
        await AdMob.hideBanner();
      } catch (error) {
        console.error('[AdMob] Failed to hide banner:', error);
      }
    }
  }, []);

  // Reset session counters (call on app resume or new session)
  const resetSession = useCallback(() => {
    sessionInterstitialCount = 0;
    lastInterstitialTime = 0;
  }, []);

  // Refresh settings from database
  const refreshSettings = useCallback(() => {
    if (isNative) {
      fetchAdsAndSettings();
    }
  }, [isNative]);

  return {
    isNative,
    adMobReady,
    globalSettings,
    interstitialSettings,
    rewardedSettings,
    bannerSettings,
    getAdForPlacement,
    canShowInterstitial,
    showInterstitialAd,
    recordInterstitialShown,
    canShowRewarded,
    showRewardedAd,
    recordRewardedShown,
    getRewardAmount,
    showBannerAd,
    hideBannerAd,
    resetSession,
    refreshSettings,
    // Helper to check if ads are enabled at all
    isEnabled: globalSettings?.enabled && isNative,
    // Helper to check if in test mode
    isTestMode: globalSettings?.test_mode || false,
  };
}

export default useAdMob;
