import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

interface VideoAd {
  id: string;
  name: string;
  video_url: string;
  thumbnail_url: string | null;
  click_url: string | null;
  duration_seconds: number;
  skip_after_seconds: number;
  placement: 'pre_roll' | 'mid_roll' | 'post_roll';
  priority: number;
}

interface VideoAdSettings {
  enabled: boolean;
  preRoll: boolean;
  midRoll: boolean;
  midRollInterval: number;
  skipForPremium: boolean;
  frequencyCap: number;
}

export const useVideoAds = () => {
  const [settings, setSettings] = useState<VideoAdSettings>({
    enabled: false,
    preRoll: true,
    midRoll: false,
    midRollInterval: 300,
    skipForPremium: true,
    frequencyCap: 3,
  });
  const [ads, setAds] = useState<VideoAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [adsShownCount, setAdsShownCount] = useState(0);
  const { hasActiveSubscription } = useSubscription();

  // Fetch settings and ads on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'video_ads_enabled',
            'video_ads_pre_roll',
            'video_ads_mid_roll',
            'video_ads_mid_roll_interval',
            'video_ads_skip_for_premium',
            'video_ads_frequency_cap',
          ]);

        if (settingsData) {
          const newSettings: Partial<VideoAdSettings> = {};
          settingsData.forEach((row) => {
            const value = typeof row.setting_value === 'string'
              ? row.setting_value
              : JSON.stringify(row.setting_value);

            switch (row.setting_key) {
              case 'video_ads_enabled':
                newSettings.enabled = value === 'true';
                break;
              case 'video_ads_pre_roll':
                newSettings.preRoll = value === 'true';
                break;
              case 'video_ads_mid_roll':
                newSettings.midRoll = value === 'true';
                break;
              case 'video_ads_mid_roll_interval':
                newSettings.midRollInterval = parseInt(value) || 300;
                break;
              case 'video_ads_skip_for_premium':
                newSettings.skipForPremium = value === 'true';
                break;
              case 'video_ads_frequency_cap':
                newSettings.frequencyCap = parseInt(value) || 3;
                break;
            }
          });
          setSettings(prev => ({ ...prev, ...newSettings }));
        }

        // Fetch active ads
        const now = new Date().toISOString();
        const { data: adsData } = await supabase
          .from('video_ads')
          .select('*')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('priority', { ascending: false });

        if (adsData) {
          setAds(adsData as VideoAd[]);
        }
      } catch (error) {
        console.error('Error fetching video ads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get a random ad for a specific placement
  const getAdForPlacement = useCallback((placement: 'pre_roll' | 'mid_roll' | 'post_roll'): VideoAd | null => {
    // Check if ads are enabled
    if (!settings.enabled) return null;

    // Check frequency cap
    if (adsShownCount >= settings.frequencyCap) return null;

    // Check placement settings
    if (placement === 'pre_roll' && !settings.preRoll) return null;
    if (placement === 'mid_roll' && !settings.midRoll) return null;

    // Filter ads by placement
    const eligibleAds = ads.filter(ad => ad.placement === placement);
    if (eligibleAds.length === 0) return null;

    // Return highest priority or random
    return eligibleAds[0];
  }, [ads, settings, adsShownCount]);

  // Track ad impression
  const trackImpression = useCallback(async (adId: string) => {
    setAdsShownCount(prev => prev + 1);
    
    try {
      // Use direct update instead of RPC
      const { data: currentAd } = await supabase
        .from('video_ads')
        .select('impressions')
        .eq('id', adId)
        .single();
      
      if (currentAd) {
        await supabase
          .from('video_ads')
          .update({ impressions: (currentAd.impressions || 0) + 1 })
          .eq('id', adId);
      }
    } catch (error) {
      // Silently fail - this is just analytics
      console.warn('Failed to track ad impression:', error);
    }
  }, []);

  // Track ad click
  const trackClick = useCallback(async (adId: string) => {
    try {
      // Use direct update instead of RPC
      const { data: currentAd } = await supabase
        .from('video_ads')
        .select('clicks')
        .eq('id', adId)
        .single();
      
      if (currentAd) {
        await supabase
          .from('video_ads')
          .update({ clicks: (currentAd.clicks || 0) + 1 })
          .eq('id', adId);
      }
    } catch (error) {
      console.warn('Failed to track ad click:', error);
    }
  }, []);

  // Check if user should see ads (premium users might skip)
  const shouldShowAds = useCallback(() => {
    if (!settings.enabled) return false;
    if (settings.skipForPremium && hasActiveSubscription) return false;
    if (adsShownCount >= settings.frequencyCap) return false;
    return true;
  }, [settings, hasActiveSubscription, adsShownCount]);

  // Check if user can skip immediately (premium users)
  const canSkipImmediately = useCallback(() => {
    return settings.skipForPremium && hasActiveSubscription;
  }, [settings.skipForPremium, hasActiveSubscription]);

  return {
    settings,
    ads,
    loading,
    getAdForPlacement,
    trackImpression,
    trackClick,
    shouldShowAds,
    canSkipImmediately,
    midRollInterval: settings.midRollInterval,
  };
};
