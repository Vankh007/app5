import { useRef, useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
// @ts-ignore
import shaka from 'shaka-player';

interface NativeShakaConfig {
  videoRef: React.RefObject<HTMLVideoElement>;
  autoQualityEnabled?: boolean;
  estimatedBandwidth?: number;
  onQualitiesLoaded?: (qualities: string[]) => void;
  onAudioTracksLoaded?: (tracks: any[]) => void;
  onTextTracksLoaded?: (tracks: any[]) => void;
  onBandwidthUpdate?: (bandwidth: number) => void;
  onError?: (error: Error) => void;
  onLoaded?: () => void;
}

/**
 * Optimized Shaka Player hook for native Capacitor apps
 * Provides better buffering, reduced battery drain, and smoother playback
 */
export function useNativeShakaPlayer({
  videoRef,
  autoQualityEnabled = true,
  estimatedBandwidth = 5000000,
  onQualitiesLoaded,
  onAudioTracksLoaded,
  onTextTracksLoaded,
  onBandwidthUpdate,
  onError,
  onLoaded,
}: NativeShakaConfig) {
  const shakaPlayerRef = useRef<shaka.Player | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  // Native-optimized Shaka configuration
  const getNativeConfig = useCallback(() => {
    // Base configuration optimized for mobile
    const baseConfig = {
      streaming: {
        // Lower buffer for faster start, but enough for smooth playback
        bufferingGoal: isNative ? 15 : 30,
        // Quick recovery from rebuffering
        rebufferingGoal: isNative ? 1 : 2,
        // Reduce memory usage on mobile
        bufferBehind: isNative ? 15 : 30,
        // Faster segment fetch for responsive seeking
        retryParameters: {
          maxAttempts: 5,
          baseDelay: 500,
          backoffFactor: 1.5,
          timeout: isNative ? 15000 : 30000,
          fuzzFactor: 0.5,
        },
        // Enable low latency for live streams
        lowLatencyMode: false,
        // Prefer native HLS on iOS for better performance
        preferNativeHls: platform === 'ios',
        // Use MediaSource more efficiently
        useNativeHlsOnSafari: platform === 'ios',
        // Segment prefetch for smoother playback
        segmentPrefetchLimit: isNative ? 2 : 3,
        // Reduce start latency
        smallGapLimit: 0.5,
        jumpLargeGaps: true,
        // Stall detection
        stallEnabled: true,
        stallThreshold: 1,
        stallSkip: 0.1,
        // Safe seek adjustment
        safeSeekOffset: 0,
        // Gap detection
        gapDetectionThreshold: 0.5,
      },
      abr: {
        enabled: autoQualityEnabled,
        // Start with estimated bandwidth
        defaultBandwidthEstimate: estimatedBandwidth,
        // More conservative switching on mobile to reduce buffering
        switchInterval: isNative ? 8 : 4,
        // Higher upgrade threshold for stability
        bandwidthUpgradeTarget: isNative ? 0.75 : 0.85,
        // Lower downgrade threshold to prevent stuttering
        bandwidthDowngradeTarget: isNative ? 0.90 : 0.95,
        // Limit resolution on mobile for battery/data
        restrictions: isNative ? {
          maxHeight: 1080,
          maxWidth: 1920,
          maxBandwidth: platform === 'ios' ? 8000000 : 10000000,
        } : {},
        // Ignore device pixel ratio for consistent behavior
        ignoreDevicePixelRatio: true,
        // Use smooth switching
        clearBufferSwitch: false,
        // Safer switching threshold
        safeMarginSwitch: isNative ? 2 : 1,
      },
      manifest: {
        // Faster manifest parsing
        retryParameters: {
          maxAttempts: 4,
          baseDelay: 500,
          backoffFactor: 2,
          timeout: isNative ? 10000 : 20000,
          fuzzFactor: 0.5,
        },
        // Parse HLS faster
        hls: {
          ignoreManifestProgramDateTime: true,
          ignoreManifestProgramDateTimeForTypes: [],
          // Sequence mode for better compatibility
          useFullSegmentsForStartTime: isNative,
        },
        // DASH optimizations
        dash: {
          ignoreMinBufferTime: isNative,
          xlinkFailGracefully: true,
          ignoreMaxSegmentDuration: true,
          ignoreEmptyAdaptationSet: true,
        },
        // Default presentation delay
        defaultPresentationDelay: 0,
      },
      drm: {
        // DRM timeout adjustments for mobile
        retryParameters: {
          maxAttempts: 4,
          baseDelay: 500,
          backoffFactor: 2,
          timeout: 15000,
          fuzzFactor: 0.5,
        },
      },
      // Prefer native tracks on mobile
      preferredAudioLanguage: 'km',
      preferredTextLanguage: 'km',
      preferredVariantRole: '',
      preferredTextRole: '',
    };

    // iOS-specific optimizations
    if (platform === 'ios') {
      return {
        ...baseConfig,
        streaming: {
          ...baseConfig.streaming,
          // iOS handles HLS natively better
          preferNativeHls: true,
          useNativeHlsOnSafari: true,
          // Smaller buffer for iOS memory constraints
          bufferingGoal: 12,
          bufferBehind: 12,
        },
      };
    }

    // Android-specific optimizations
    if (platform === 'android') {
      return {
        ...baseConfig,
        streaming: {
          ...baseConfig.streaming,
          // Android can handle larger buffers
          bufferingGoal: 20,
          bufferBehind: 20,
          // Force gap jumping on Android for better recovery
          jumpLargeGaps: true,
          stallSkip: 0.2,
        },
        abr: {
          ...baseConfig.abr,
          // Android can handle higher bitrates
          restrictions: {
            maxHeight: 1080,
            maxWidth: 1920,
            maxBandwidth: 12000000,
          },
        },
      };
    }

    return baseConfig;
  }, [isNative, platform, autoQualityEnabled, estimatedBandwidth]);

  // Initialize Shaka Player with native optimizations
  const initPlayer = useCallback(async () => {
    if (!videoRef.current) return null;

    try {
      // Install polyfills
      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        console.warn('Shaka Player not supported on this browser');
        return null;
      }

      // Cleanup existing player
      if (shakaPlayerRef.current) {
        try {
          await shakaPlayerRef.current.unload();
          await shakaPlayerRef.current.detach();
          await shakaPlayerRef.current.destroy();
        } catch (e) {
          console.warn('Error cleaning up previous player:', e);
        }
        shakaPlayerRef.current = null;
      }

      // Create new player
      const player = new shaka.Player();
      await player.attach(videoRef.current);
      
      // Apply native-optimized configuration
      const config = getNativeConfig();
      player.configure(config);

      // Set up event listeners
      player.addEventListener('error', (event: any) => {
        const error = event.detail;
        console.error('Shaka error:', error.code, error.message);
        onError?.(new Error(`Shaka error ${error.code}: ${error.message}`));
      });

      player.addEventListener('adaptation', () => {
        const stats = player.getStats();
        if (stats.estimatedBandwidth) {
          onBandwidthUpdate?.(stats.estimatedBandwidth);
        }
      });

      player.addEventListener('buffering', (event: any) => {
        // Handle buffering state changes
        if (isNative) {
          console.log('Buffering:', event.buffering);
        }
      });

      player.addEventListener('stalldetected', () => {
        console.warn('Stall detected, attempting recovery');
        // On native, try to recover from stalls
        if (isNative && videoRef.current) {
          const currentTime = videoRef.current.currentTime;
          videoRef.current.currentTime = currentTime + 0.1;
        }
      });

      shakaPlayerRef.current = player;
      setIsInitialized(true);
      
      return player;
    } catch (error) {
      console.error('Failed to initialize Shaka Player:', error);
      onError?.(error as Error);
      return null;
    }
  }, [videoRef, getNativeConfig, onBandwidthUpdate, onError, isNative]);

  // Load a video source
  const loadSource = useCallback(async (url: string, mimeType?: string) => {
    setIsLoading(true);
    
    let player = shakaPlayerRef.current;
    
    if (!player) {
      player = await initPlayer();
      if (!player) {
        setIsLoading(false);
        return false;
      }
    }

    try {
      // Unload previous content
      await player.unload();
      
      // Wait a bit for cleanup on native
      if (isNative) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Load new source
      await player.load(url, undefined, mimeType);

      // Get available tracks
      const variantTracks = player.getVariantTracks();
      const qualities = [...new Set(variantTracks.map((t: any) => `${t.height}p`))]
        .sort((a, b) => parseInt(b) - parseInt(a)) as string[];
      onQualitiesLoaded?.(qualities);

      // Audio tracks
      const audioTracks = player.getAudioLanguagesAndRoles();
      onAudioTracksLoaded?.(audioTracks);

      // Text tracks
      const textTracks = player.getTextLanguagesAndRoles();
      onTextTracksLoaded?.(textTracks);
      player.setTextTrackVisibility(false);

      setIsLoading(false);
      onLoaded?.();
      
      return true;
    } catch (error) {
      console.error('Failed to load video source:', error);
      setIsLoading(false);
      onError?.(error as Error);
      return false;
    }
  }, [initPlayer, isNative, onQualitiesLoaded, onAudioTracksLoaded, onTextTracksLoaded, onLoaded, onError]);

  // Set video quality
  const setQuality = useCallback((quality: string) => {
    if (!shakaPlayerRef.current) return;

    const player = shakaPlayerRef.current;
    const tracks = player.getVariantTracks();
    const targetHeight = parseInt(quality.replace('p', ''));

    // Find tracks with matching height
    const matchingTracks = tracks.filter((t: any) => t.height === targetHeight);
    
    if (matchingTracks.length > 0) {
      // Select the best matching track (highest bandwidth)
      const bestTrack = matchingTracks.reduce((a: any, b: any) => 
        (a.bandwidth || 0) > (b.bandwidth || 0) ? a : b
      );
      
      // Clear ABR and select specific track
      player.configure('abr.enabled', false);
      player.selectVariantTrack(bestTrack, true);
    }
  }, []);

  // Enable/disable auto quality
  const setAutoQuality = useCallback((enabled: boolean) => {
    if (!shakaPlayerRef.current) return;
    shakaPlayerRef.current.configure('abr.enabled', enabled);
  }, []);

  // Set audio track
  const setAudioTrack = useCallback((language: string, role?: string) => {
    if (!shakaPlayerRef.current) return;
    shakaPlayerRef.current.selectAudioLanguage(language, role);
  }, []);

  // Set text track (subtitles)
  const setTextTrack = useCallback((language: string | null, role?: string) => {
    if (!shakaPlayerRef.current) return;
    
    if (language === null || language === 'off') {
      shakaPlayerRef.current.setTextTrackVisibility(false);
    } else {
      shakaPlayerRef.current.selectTextLanguage(language, role);
      shakaPlayerRef.current.setTextTrackVisibility(true);
    }
  }, []);

  // Get current stats
  const getStats = useCallback(() => {
    if (!shakaPlayerRef.current) return null;
    return shakaPlayerRef.current.getStats();
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(async () => {
    if (shakaPlayerRef.current) {
      try {
        await shakaPlayerRef.current.unload();
        await shakaPlayerRef.current.detach();
        await shakaPlayerRef.current.destroy();
      } catch (e) {
        console.warn('Error during cleanup:', e);
      } finally {
        shakaPlayerRef.current = null;
        setIsInitialized(false);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    player: shakaPlayerRef.current,
    isInitialized,
    isLoading,
    isNative,
    platform,
    initPlayer,
    loadSource,
    setQuality,
    setAutoQuality,
    setAudioTrack,
    setTextTrack,
    getStats,
    cleanup,
    getNativeConfig,
  };
}

/**
 * Get optimized video element attributes for native apps
 */
export function getNativeVideoAttributes() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  return {
    // Inline playback for iOS (prevents fullscreen on play)
    playsInline: true,
    // Webkit-specific inline playback
    'webkit-playsinline': 'true',
    // Allow AirPlay on iOS
    'x-webkit-airplay': 'allow',
    // Preload metadata for faster start
    preload: isNative ? 'metadata' : 'auto',
    // Cross-origin for CORS
    crossOrigin: 'anonymous' as const,
    // Disable picture-in-picture if needed
    // disablePictureInPicture: false,
    // iOS-specific: allow background audio
    ...(platform === 'ios' ? {
      'x-webkit-wirelessvideoplaybackdisabled': 'false',
    } : {}),
    // Android-specific optimizations
    ...(platform === 'android' ? {
      // Hardware acceleration hints
      style: {
        transform: 'translateZ(0)',
        willChange: 'transform',
      },
    } : {}),
  };
}

/**
 * Check if device can handle high quality video
 */
export function getRecommendedMaxQuality(): number {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) return 1080;
  
  // Check device memory if available
  const memory = (navigator as any).deviceMemory;
  if (memory) {
    if (memory >= 8) return 1080;
    if (memory >= 4) return 720;
    return 480;
  }
  
  // Check connection type
  const connection = (navigator as any).connection;
  if (connection?.effectiveType) {
    switch (connection.effectiveType) {
      case '4g': return 1080;
      case '3g': return 480;
      case '2g': return 360;
      default: return 720;
    }
  }
  
  return 720; // Safe default
}
