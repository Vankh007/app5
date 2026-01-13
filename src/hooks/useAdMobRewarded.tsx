import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import { initializeAdMob, loadRewardedAd, showRewardedAd as showAdMobRewardedAd, isAdMobAvailable } from '@/services/admobService';

export interface AdMobRewardedSettings {
  enabled: boolean;
  appId: string;
  adUnitId: string;
  checkpointStart: boolean;
  checkpoint40: boolean;
  checkpoint85: boolean;
}

interface UseAdMobRewardedOptions {
  contentId?: string;
  hasContentPurchase?: boolean;
}

// Track which checkpoints have been shown in this session
const sessionShownCheckpoints = new Map<string, Set<'start' | '40' | '85'>>();

export function useAdMobRewarded(options: UseAdMobRewardedOptions = {}) {
  const { contentId, hasContentPurchase = false } = options;
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();
  
  const [settings, setSettings] = useState<AdMobRewardedSettings>({
    enabled: false,
    appId: '',
    adUnitId: '',
    checkpointStart: true,
    checkpoint40: false,
    checkpoint85: false,
  });
  const [loading, setLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [shownCheckpoints, setShownCheckpoints] = useState<Set<'start' | '40' | '85'>>(new Set());
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const adLoadedRef = useRef(false);
  const initRef = useRef(false);
  
  // Session key for tracking shown checkpoints per content
  const sessionKey = contentId || 'default';

  // Initialize AdMob on native platforms
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    if (Capacitor.isNativePlatform()) {
      initializeAdMob().then((success) => {
        if (success) {
          console.log('[useAdMobRewarded] AdMob initialized');
          setIsNative(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    // Restore shown checkpoints from session
    const existingCheckpoints = sessionShownCheckpoints.get(sessionKey);
    if (existingCheckpoints) {
      setShownCheckpoints(existingCheckpoints);
    }
  }, [sessionKey]);

  // Fetch settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'admob_rewarded_enabled',
            'admob_rewarded_app_id',
            'admob_rewarded_ad_unit_id',
            'admob_rewarded_checkpoint_start',
            'admob_rewarded_checkpoint_40',
            'admob_rewarded_checkpoint_85',
          ]);

        if (error) throw error;

        if (data) {
          const newSettings: Partial<AdMobRewardedSettings> = {};
          data.forEach((row) => {
            const value = typeof row.setting_value === 'string'
              ? row.setting_value
              : JSON.stringify(row.setting_value);

            switch (row.setting_key) {
              case 'admob_rewarded_enabled':
                newSettings.enabled = value === 'true';
                break;
              case 'admob_rewarded_app_id':
                newSettings.appId = value;
                break;
              case 'admob_rewarded_ad_unit_id':
                newSettings.adUnitId = value;
                break;
              case 'admob_rewarded_checkpoint_start':
                newSettings.checkpointStart = value === 'true';
                break;
              case 'admob_rewarded_checkpoint_40':
                newSettings.checkpoint40 = value === 'true';
                break;
              case 'admob_rewarded_checkpoint_85':
                newSettings.checkpoint85 = value === 'true';
                break;
            }
          });
          setSettings(prev => ({ ...prev, ...newSettings }));
        }
      } catch (error) {
        console.error('Error fetching AdMob rewarded settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Check if user should see rewarded ads (free users on native only)
  const shouldShowRewardedAds = useCallback((): boolean => {
    // Only show on native platforms
    if (!Capacitor.isNativePlatform()) return false;
    
    // Settings must be enabled
    if (!settings.enabled) return false;
    
    // Must have ad unit configured
    if (!settings.adUnitId) return false;
    
    // Don't show to subscribers
    if (hasActiveSubscription) return false;
    
    // Don't show to users who purchased this content
    if (hasContentPurchase) return false;
    
    return true;
  }, [settings.enabled, settings.adUnitId, hasActiveSubscription, hasContentPurchase]);

  // Check if a specific checkpoint should show ad
  const shouldShowAtCheckpoint = useCallback((checkpoint: 'start' | '40' | '85'): boolean => {
    if (!shouldShowRewardedAds()) return false;
    
    // Check if already shown in this session
    if (shownCheckpoints.has(checkpoint)) return false;
    
    // Check if checkpoint is enabled in settings
    switch (checkpoint) {
      case 'start':
        return settings.checkpointStart;
      case '40':
        return settings.checkpoint40;
      case '85':
        return settings.checkpoint85;
      default:
        return false;
    }
  }, [shouldShowRewardedAds, shownCheckpoints, settings]);

  // Mark checkpoint as shown
  const markCheckpointShown = useCallback((checkpoint: 'start' | '40' | '85') => {
    setShownCheckpoints(prev => {
      const newSet = new Set([...prev, checkpoint]);
      sessionShownCheckpoints.set(sessionKey, newSet);
      return newSet;
    });
  }, [sessionKey]);

  // Pre-load rewarded ad when settings are available
  useEffect(() => {
    const preloadAd = async () => {
      if (settings.enabled && settings.adUnitId && Capacitor.isNativePlatform()) {
        const loaded = await loadRewardedAd(settings.adUnitId);
        setAdLoaded(loaded);
        adLoadedRef.current = loaded;
        console.log('[useAdMobRewarded] Pre-loaded ad:', loaded);
      }
    };
    
    preloadAd();
  }, [settings.enabled, settings.adUnitId]);

  // Show rewarded ad (uses AdMob service)
  const showRewardedAd = useCallback(async (checkpoint: 'start' | '40' | '85'): Promise<boolean> => {
    if (!shouldShowAtCheckpoint(checkpoint)) {
      return false;
    }

    setIsShowingAd(true);
    markCheckpointShown(checkpoint);

    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('[AdMob Rewarded] Not a native platform');
        return false;
      }

      // Get ad unit ID from settings
      const adUnitId = settings.adUnitId;
      if (!adUnitId) {
        console.error('[AdMob Rewarded] No ad unit ID configured');
        return false;
      }

      // Load the ad if not already loaded
      if (!adLoadedRef.current) {
        const loaded = await loadRewardedAd(adUnitId);
        if (!loaded) {
          console.error('[AdMob Rewarded] Failed to load ad');
          return false;
        }
      }

      // Show the rewarded ad
      const result = await showAdMobRewardedAd();
      
      if (result.shown) {
        console.log('[AdMob Rewarded] Ad shown at checkpoint:', checkpoint, 'Rewarded:', result.rewarded);
        
        // Pre-load next ad
        loadRewardedAd(adUnitId).then((loaded) => {
          setAdLoaded(loaded);
          adLoadedRef.current = loaded;
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AdMob Rewarded] Error showing ad:', error);
      return false;
    } finally {
      setIsShowingAd(false);
    }
  }, [shouldShowAtCheckpoint, markCheckpointShown, settings.adUnitId]);

  // Reset checkpoints for new content/episode
  const resetCheckpoints = useCallback(() => {
    setShownCheckpoints(new Set());
    sessionShownCheckpoints.delete(sessionKey);
  }, [sessionKey]);

  // Get checkpoint for video progress percentage
  const getCheckpointForProgress = useCallback((progressPercent: number): 'start' | '40' | '85' | null => {
    if (progressPercent >= 85) return '85';
    if (progressPercent >= 40) return '40';
    if (progressPercent === 0) return 'start';
    return null;
  }, []);

  return {
    settings,
    loading: loading || subscriptionLoading,
    isNative,
    isShowingAd,
    shouldShowRewardedAds,
    shouldShowAtCheckpoint,
    showRewardedAd,
    markCheckpointShown,
    resetCheckpoints,
    shownCheckpoints,
    getCheckpointForProgress,
    // Eligibility info
    isEligibleForAds: !hasActiveSubscription && !hasContentPurchase,
  };
}

export default useAdMobRewarded;
