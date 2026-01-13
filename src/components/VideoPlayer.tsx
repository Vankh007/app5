import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Monitor, Film, Video, Loader2, SkipBack, SkipForward, Crown,
  PictureInPicture, Server as ServerIcon,
  CreditCard, ListVideo, ChevronLeft, ChevronRight, X, ArrowLeft
} from "lucide-react";
import { VideoSettingsMenu } from "./VideoSettingsMenu";
// @ts-ignore - Shaka Player types
import shaka from "shaka-player";
import { Button } from "@/components/ui/button";
import { getNativeVideoAttributes, getRecommendedMaxQuality } from "@/hooks/useNativeShakaPlayer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { VideoSource } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { AuthDialog } from "@/components/AuthDialog";
import { InlineRentSubscribe } from "@/components/video/InlineRentSubscribe";
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { hideStatusBar, showStatusBar } from '@/hooks/useNativeStatusBar';
import { enterVideoFullscreen, exitVideoFullscreen } from '@/hooks/useImmersiveMode';
import { lockToLandscape, lockToPortrait } from '@/hooks/useScreenOrientation';
import { useVideoResume } from '@/hooks/useVideoResume';
import { useIPadVideoFullscreen } from '@/hooks/useIPadVideoFullscreen';
import { usePinchToZoom } from '@/hooks/usePinchToZoom';
import { SupportUsOverlay } from './video/SupportUsOverlay';
import { useSupportUsSettings } from '@/hooks/useSupportUsSettings';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useVideoAds } from '@/hooks/useVideoAds';
import { VideoAdPlayer } from '@/components/ads/VideoAdPlayer';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import AppLockOverlay from '@/components/AppLockOverlay';
import { useAdMobRewarded } from '@/hooks/useAdMobRewarded';

interface VideoPlayerProps {
  videoSources: VideoSource[];
  onEpisodeSelect?: (episodeId: string) => void;
  onSeasonSelect?: (seasonId: string) => void;
  episodes?: any[];
  seasons?: any[];
  currentEpisodeId?: string;
  contentBackdrop?: string;
  contentId?: string;
  accessType?: 'free' | 'rent' | 'vip';
  excludeFromPlan?: boolean;
  rentalPrice?: number;
  rentalPeriodDays?: number;
  mediaId?: string;
  mediaType?: 'movie' | 'series' | 'anime';
  title?: string;
  movieId?: string;
  onEnded?: () => void;
}

// Helpers
const normalizeType = (rawType?: string, url?: string): "mp4" | "hls" | "dash" | "embed" | "iframe" => {
  const t = (rawType || "").toString().toLowerCase().trim();
  if (t === "iframe" || t === "embed") return "iframe";
  if (t === "mp4") return "mp4";
  if (t === "hls" || t === "m3u8") return "hls";
  if (t === "dash") return "dash";
  const u = (url || "").toLowerCase();
  if (u.endsWith(".m3u8")) return "hls";
  if (u.endsWith(".mpd")) return "dash";
  if (u.endsWith(".mp4")) return "mp4";
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("player.") || u.includes("embed")) return "iframe";
  // VK Video URLs should be treated as iframe embeds
  if (u.includes("vk.com/video") || u.includes("vk.ru/video")) return "iframe";
  return "hls";
};

// Convert VK Video URL to embed format
// IMPORTANT: VK requires a hash parameter for embedding "Anyone with the link" videos
// To get the proper embed URL:
// 1. Go to the video on VK → Click "Share" → "Embed" → Copy the iframe src
// 2. Or use format: https://vk.com/video_ext.php?oid=-234949707&id=456239098&hash=XXXX
// 
// Supports formats:
// - https://vk.com/video_ext.php?oid=-123&id=456&hash=abc (embed URL - RECOMMENDED)
// - https://vk.com/video-123_456?hash=abc (URL with hash parameter)
// - https://vkvideo.ru/video-123_456 (will work only for public videos without hash requirement)
const convertVkVideoUrl = (url: string): string => {
  if (!url) return url;
  
  const lowerUrl = url.toLowerCase();
  
  // Already in embed format - just ensure HTTPS and add quality
  if (lowerUrl.includes('video_ext.php')) {
    let embedUrl = url.replace(/^http:/, 'https:');
    if (!embedUrl.includes('hd=')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'hd=2';
    }
    if (!embedUrl.includes('autoplay=')) {
      embedUrl += '&autoplay=0';
    }
    return embedUrl;
  }
  
  // Parse standard VK video URL: vk.com/video-123_456 or vkvideo.ru/video-123_456
  const vkVideoMatch = url.match(/(?:vk\.com|vk\.ru|vkvideo\.ru)\/video(-?\d+)_(\d+)/i);
  if (vkVideoMatch) {
    const oid = vkVideoMatch[1];
    const id = vkVideoMatch[2];
    
    // Extract hash from URL if present (required for "Anyone with the link" videos)
    const hashMatch = url.match(/[?&]hash=([a-f0-9]+)/i);
    const hash = hashMatch ? `&hash=${hashMatch[1]}` : '';
    
    // Log warning if no hash found - video might not load
    if (!hash) {
      console.warn('VK Video: No hash parameter found. For "Anyone with the link" videos, use the embed URL from VK\'s share menu instead.');
    }
    
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hash}&hd=2&autoplay=0`;
  }
  
  // Check for vk.com/video?z=video-123_456 format
  const vkVideoZMatch = url.match(/(?:vk\.com|vk\.ru)\/video\?z=video(-?\d+)_(\d+)/i);
  if (vkVideoZMatch) {
    const oid = vkVideoZMatch[1];
    const id = vkVideoZMatch[2];
    const hashMatch = url.match(/[?&]hash=([a-f0-9]+)/i);
    const hash = hashMatch ? `&hash=${hashMatch[1]}` : '';
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hash}&hd=2&autoplay=0`;
  }
  
  return url;
};

const getMp4Url = (mp4Urls: Record<string, string>, quality: string) => {
  if (mp4Urls[quality]) return mp4Urls[quality];
  const stripped = quality.replace(/p$/i, "");
  if (mp4Urls[stripped]) return mp4Urls[stripped];
  return Object.values(mp4Urls)[0];
};

// Select optimal quality based on bandwidth
const selectOptimalQuality = (tracks: any[], bandwidth: number) => {
  if (!tracks || tracks.length === 0) return null;
  const bandwidthMbps = bandwidth / 1000000;
  let targetHeight: number;
  
  if (bandwidthMbps >= 5) targetHeight = 1080;
  else if (bandwidthMbps >= 2.5) targetHeight = 720;
  else if (bandwidthMbps >= 1) targetHeight = 480;
  else targetHeight = 360;
  
  const sortedTracks = tracks
    .filter((t: any) => t.height <= targetHeight * 1.2)
    .sort((a: any, b: any) => b.height - a.height);
  
  return sortedTracks[0] || tracks[tracks.length - 1];
};

// Detect network bandwidth
const detectBandwidth = async (): Promise<number> => {
  try {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection && connection.downlink) {
      return connection.downlink * 1000000;
    }
    return 5000000; // Default 5 Mbps
  } catch (error) {
    return 5000000;
  }
};

const VideoPlayer = ({ 
  videoSources, 
  onEpisodeSelect,
  episodes = [],
  currentEpisodeId, 
  contentBackdrop,
  contentId,
  accessType = 'free',
  excludeFromPlan = false,
  rentalPrice,
  rentalPeriodDays = 7,
  mediaId,
  mediaType,
  title,
  movieId,
  onEnded
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shakaPlayerRef = useRef<shaka.Player | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Use iPad-optimized fullscreen hook for PWA support with rotation handling
  const { 
    isFullscreen, 
    toggleFullscreen: iPadToggleFullscreen, 
    isTransitioning: isFullscreenTransitioning,
    maintainPlaybackDuringRotation 
  } = useIPadVideoFullscreen({
    containerRef,
    videoRef
  });

  // Pinch-to-zoom for mobile/iPad fullscreen - Telegram-style
  const { 
    scale: zoomScale, 
    isZoomed, 
    resetZoom,
    showIndicator: showZoomIndicator,
    zoomPercentage 
  } = usePinchToZoom({
    containerRef,
    videoRef,
    isFullscreen
  });
  
  // Fetch Support Us settings from admin
  const { settings: supportUsSettings } = useSupportUsSettings();
  const { settings: siteSettings } = useSiteSettings();
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  
  // Video Ads system
  const { 
    getAdForPlacement, 
    trackImpression, 
    trackClick, 
    shouldShowAds, 
    canSkipImmediately,
    midRollInterval,
    settings: videoAdsSettings
  } = useVideoAds();
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [currentVideoAd, setCurrentVideoAd] = useState<any>(null);
  const [hasShownPreRoll, setHasShownPreRoll] = useState(false);
  const lastMidRollTimeRef = useRef(0);
  const resumeAfterAdRef = useRef(false);
  
  const [currentQuality, setCurrentQuality] = useState("720p");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentServer, setCurrentServer] = useState<VideoSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showCenterIcon, setShowCenterIcon] = useState(false);
  const [buffered, setBuffered] = useState(0);
  
  // Advanced features
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sleepTimer, setSleepTimer] = useState(0);
  const [autoQualityEnabled, setAutoQualityEnabled] = useState(true);
  const [estimatedBandwidth, setEstimatedBandwidth] = useState<number | null>(null);
  const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<string | null>(null);
  const [availableTextTracks, setAvailableTextTracks] = useState<any[]>([]);
  const [currentTextTrack, setCurrentTextTrack] = useState<string>("off");
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [showRentPayment, setShowRentPayment] = useState(false);
  const [showSubscribePayment, setShowSubscribePayment] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'rent' | 'subscribe' | null>(null);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);
  const [showSupportOverlay, setShowSupportOverlay] = useState(false);
  // Track which support checkpoints have been shown: start (0%), 50%, 85%
  const [shownSupportCheckpoints, setShownSupportCheckpoints] = useState<Set<'start' | '50' | '85'>>(new Set());
  const [hasAlreadySupported, setHasAlreadySupported] = useState(false);
  // Track AdMob rewarded checkpoints for 40% and 85%
  const [shownAdMobCheckpoints, setShownAdMobCheckpoints] = useState<Set<'start' | '40' | '85'>>(new Set());
  
  // AdMob Rewarded Ads for native app (free users only)
  const {
    shouldShowAtCheckpoint: shouldShowRewardedAtCheckpoint,
    showRewardedAd,
    isShowingAd: isShowingRewardedAd,
    isNative: isNativeForAds,
  } = useAdMobRewarded({
    contentId: contentId || mediaId,
    hasContentPurchase: accessType !== 'free' && hasAccess === true,
  });
  
  const episodesScrollRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bandwidthCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  // Resume playback hook - saves and restores video position across sessions
  const { saveProgress, restoreProgress, getSavedProgress } = useVideoResume({
    contentId: contentId || mediaId,
    episodeId: currentEpisodeId,
    videoRef,
  });
  
  // Track if this is a remount (for orientation changes) - preserve playback state
  const playbackStateKey = `video-playback-${contentId || mediaId}-${currentEpisodeId || 'movie'}`;
  const mountTimeRef = useRef(Date.now());
  const wasPlayingBeforeRemountRef = useRef(false);
  const savedTimeBeforeRemountRef = useRef(0);

  // Save playback state before unmount for quick resume after orientation change
  useEffect(() => {
    // On mount, check if we have saved state from recent orientation change (within 2 seconds)
    try {
      const savedState = sessionStorage.getItem(playbackStateKey);
      if (savedState) {
        const { time, wasPlaying, timestamp } = JSON.parse(savedState);
        const timeSinceUnmount = Date.now() - timestamp;
        // Only restore if unmounted within last 2 seconds (likely orientation change)
        if (timeSinceUnmount < 2000) {
          savedTimeBeforeRemountRef.current = time;
          wasPlayingBeforeRemountRef.current = wasPlaying;
        }
        sessionStorage.removeItem(playbackStateKey);
      }
    } catch (e) {
      // Ignore errors
    }

    return () => {
      // Save state before unmount
      if (videoRef.current) {
        try {
          sessionStorage.setItem(playbackStateKey, JSON.stringify({
            time: videoRef.current.currentTime,
            wasPlaying: !videoRef.current.paused,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }, [playbackStateKey]);

  // Check if user has already supported this episode (for series) or content (for movies)
  useEffect(() => {
    const checkAlreadySupported = async () => {
      if (!user) {
        setHasAlreadySupported(false);
        return;
      }
      
      try {
        let query = supabase
          .from('content_support')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', contentId || mediaId);
        
        // For series, check specific episode
        if (currentEpisodeId) {
          query = query.eq('episode_id', currentEpisodeId);
        } else {
          query = query.is('episode_id', null);
        }
        
        const { data, error } = await query.maybeSingle();
        
        if (!error && data) {
          setHasAlreadySupported(true);
        } else {
          setHasAlreadySupported(false);
        }
      } catch (error) {
        console.error('Error checking support status:', error);
        setHasAlreadySupported(false);
      }
    };
    
    checkAlreadySupported();
  }, [user, contentId, mediaId, currentEpisodeId]);

  // Orientation/rotation handling is managed inside useIPadVideoFullscreen
  // (keeping a single listener prevents duplicate resume attempts on iPad).

  // Check user access
  useEffect(() => {
    console.log('VideoPlayer access check triggered:', { accessType, currentEpisodeId, contentId });
    
    const checkAccess = async () => {
      // Reset loading state when checking new content
      setAccessLoading(true);
      
      // Free content - always accessible
      if (accessType === 'free') {
        console.log('Access check: FREE content, granting access');
        setHasAccess(true);
        setAccessLoading(false);
        return;
      }
      
      console.log('Access check: PAID content, checking user access...');

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Not logged in - no access to paid content
        if (!user) {
          setHasAccess(false);
          setAccessLoading(false);
          return;
        }

        // Check for active membership
        const { data: membership } = await supabase
          .from('user_memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        // If user has active membership and content is not excluded from plan
        if (membership && !excludeFromPlan) {
          setHasAccess(true);
          setAccessLoading(false);
          return;
        }

        // Check for content purchase (if accessType is rent/purchase)
        if (accessType === 'rent' || contentId) {
          const { data: purchase } = await supabase
            .from('user_content_purchases')
            .select('*')
            .eq('user_id', user.id)
            .eq('content_id', contentId || mediaId)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

          if (purchase) {
            setHasAccess(true);
            setAccessLoading(false);
            return;
          }
        }

        // No access
        setHasAccess(false);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setAccessLoading(false);
      }
    };

    checkAccess();
  }, [accessType, contentId, mediaId, excludeFromPlan, currentEpisodeId]);

  // Check if content is locked
  const isLocked = useMemo(() => {
    if (accessType === 'free') return false;
    if (accessLoading) return false; // Don't show lock while loading
    return hasAccess === false;
  }, [accessType, accessLoading, hasAccess]);

  // Get poster image - prefer episode thumbnail (still_path), fallback to content backdrop
  const videoPoster = useMemo(() => {
    if (currentEpisodeId && episodes.length > 0) {
      const currentEpisode = episodes.find((ep: any) => ep.id === currentEpisodeId);
      if (currentEpisode?.still_path) {
        return currentEpisode.still_path;
      }
    }
    return contentBackdrop || '';
  }, [currentEpisodeId, episodes, contentBackdrop]);

  // Handle rent button click - check auth first
  const handleRentClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPendingAction('rent');
      setShowAuthDialog(true);
      return;
    }
    setShowRentPayment(true);
  };

  // Handle subscribe button click - check auth first
  const handleSubscribeClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPendingAction('subscribe');
      setShowAuthDialog(true);
      return;
    }
    setShowSubscribePayment(true);
  };

  // Handle auth success - open the pending payment dialog
  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    if (pendingAction === 'rent') {
      setShowRentPayment(true);
    } else if (pendingAction === 'subscribe') {
      setShowSubscribePayment(true);
    }
    setPendingAction(null);
  };

  // Handle payment success - reload to check access
  const handlePaymentSuccess = () => {
    window.location.reload();
  };

  const paymentDialogs = (
    <>
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={handleAuthSuccess}
      />
    </>
  );

  // Check if running on native platform
  const isNativePlatform = useMemo(() => Capacitor.isNativePlatform(), []);
  
  // SECURITY: Only expose video sources when user has verified access
  // This prevents download managers and DevTools from seeing video URLs until access is confirmed
  const protectedVideoSources = useMemo(() => {
    // Don't expose any sources if access is loading or denied for paid content
    if (accessType !== 'free' && (accessLoading || hasAccess === false)) {
      return [];
    }
    return videoSources;
  }, [videoSources, accessType, accessLoading, hasAccess]);

  // Normalize sources - use JSON.stringify for stable comparison
  const videoSourcesKey = JSON.stringify(protectedVideoSources.map(s => s.id));
  
  // All available sources for the server dropdown (show all servers regardless of permission)
  const allAvailableSources = useMemo(() => {
    if (protectedVideoSources.length === 0) {
      return [];
    }
    let base = currentEpisodeId ? protectedVideoSources.filter(s => s.episode_id === currentEpisodeId) : protectedVideoSources;
    if (base.length === 0) base = protectedVideoSources;
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSourcesKey, currentEpisodeId, protectedVideoSources]);
  
  // Playable sources filtered by platform permission
  const displayedSources = useMemo(() => {
    // SECURITY: Return empty array if no access to paid content
    if (protectedVideoSources.length === 0) {
      return [];
    }
    let base = currentEpisodeId ? protectedVideoSources.filter(s => s.episode_id === currentEpisodeId) : protectedVideoSources;
    if (base.length === 0) base = protectedVideoSources;
    
    // Filter sources based on platform permission
    // - web_and_mobile: available on both platforms
    // - web_only: only available on web browser
    // - mobile_only: only available on native app (Android/iOS)
    return base.filter(source => {
      const permission = source.permission || 'web_and_mobile';
      if (permission === 'web_and_mobile') return true;
      if (permission === 'web_only' && !isNativePlatform) return true;
      if (permission === 'mobile_only' && isNativePlatform) return true;
      return false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSourcesKey, currentEpisodeId, protectedVideoSources, isNativePlatform]);
  
  // Check if current selected server is restricted on the current platform
  const isCurrentServerRestricted = useMemo(() => {
    if (!currentServer) return false;
    const permission = currentServer.permission || 'web_and_mobile';
    if (permission === 'mobile_only' && !isNativePlatform) return true;
    if (permission === 'web_only' && isNativePlatform) return true;
    return false;
  }, [currentServer, isNativePlatform]);
  
  // Check if all sources are mobile-only (to show lock message on web)
  const allSourcesMobileOnly = useMemo(() => {
    if (isNativePlatform) return false;
    let base = currentEpisodeId ? protectedVideoSources.filter(s => s.episode_id === currentEpisodeId) : protectedVideoSources;
    if (base.length === 0) base = protectedVideoSources;
    if (base.length === 0) return false;
    return base.every(source => source.permission === 'mobile_only');
  }, [protectedVideoSources, currentEpisodeId, isNativePlatform]);
  
  // Check if all sources are web-only (to show lock message on native apps)
  const allSourcesWebOnly = useMemo(() => {
    if (!isNativePlatform) return false;
    let base = currentEpisodeId ? protectedVideoSources.filter(s => s.episode_id === currentEpisodeId) : protectedVideoSources;
    if (base.length === 0) base = protectedVideoSources;
    if (base.length === 0) return false;
    return base.every(source => source.permission === 'web_only');
  }, [protectedVideoSources, currentEpisodeId, isNativePlatform]);

  // Detect server type
  const detectServerType = (source?: VideoSource) => {
    if (!source) return "unknown";
    return normalizeType(source.source_type, source.url);
  };

  const getServerIcon = (type: string) => {
    switch (type) {
      case "embed":
      case "iframe": return Monitor;
      case "hls":
      case "dash": return Film;
      case "mp4": return Video;
      default: return Video;
    }
  };

  // Detect bandwidth on mount
  useEffect(() => {
    const checkBandwidth = async () => {
      const bandwidth = await detectBandwidth();
      setEstimatedBandwidth(bandwidth);
    };
    checkBandwidth();
    bandwidthCheckRef.current = setInterval(checkBandwidth, 30000);
    return () => {
      if (bandwidthCheckRef.current) clearInterval(bandwidthCheckRef.current);
    };
  }, []);

  // Initialize servers - reset when episode changes for smooth switching
  // SECURITY: Only initialize server when access is verified
  useEffect(() => {
    // Don't initialize servers until access is confirmed for paid content
    if (accessType !== 'free' && (accessLoading || hasAccess === false)) {
      setCurrentServer(null);
      setAvailableQualities([]);
      return;
    }

    if (displayedSources && displayedSources.length > 0) {
      const defaultServer = displayedSources.find(s => s.is_default) || displayedSources[0];
      
      // Always update server when sources change (episode switch)
      const shouldUpdate = !currentServer || 
        currentServer.id !== defaultServer.id || 
        currentServer.episode_id !== defaultServer.episode_id;
      
      if (shouldUpdate) {
        // Reset loading state for smooth transition
        setIsLoading(true);
        setCurrentTime(0);
        setDuration(0);
        setBuffered(0);
        setIsPlaying(false);
        // Reset Support Us checkpoints for new episode/movie
        setShownSupportCheckpoints(new Set());
        // Reset pre-roll ad state so ads show for each episode
        setHasShownPreRoll(false);
        
        // Cleanup existing player before switching
        cleanupShakaPlayer();
        
        setCurrentServer(defaultServer);
        
        if (defaultServer.source_type === "mp4" && defaultServer.quality_urls) {
          const qualities = Object.keys(defaultServer.quality_urls).sort((a, b) => {
            const aNum = parseInt(a.replace(/\D/g, ''));
            const bNum = parseInt(b.replace(/\D/g, ''));
            return bNum - aNum;
          });
          setAvailableQualities(qualities);
          // Use the server's default quality if set and available, otherwise fall back to 720p or first available
          const serverDefaultQuality = defaultServer.quality;
          if (serverDefaultQuality && qualities.includes(serverDefaultQuality)) {
            setCurrentQuality(serverDefaultQuality);
          } else if (serverDefaultQuality && qualities.includes(serverDefaultQuality.replace(/p$/i, '') + 'p')) {
            setCurrentQuality(serverDefaultQuality.replace(/p$/i, '') + 'p');
          } else {
            setCurrentQuality(qualities.includes("720p") ? "720p" : qualities[0] || "720p");
          }
        } else {
          setAvailableQualities([]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedSources, currentEpisodeId, accessType, accessLoading, hasAccess]);

  // Cleanup Shaka player only (not the video element)
  const cleanupShakaPlayer = async () => {
    if (shakaPlayerRef.current) {
      try {
        await shakaPlayerRef.current.unload();
        await shakaPlayerRef.current.detach();
        await shakaPlayerRef.current.destroy();
      } catch (e) {
        console.error("Error destroying Shaka Player:", e);
      } finally {
        shakaPlayerRef.current = null;
      }
    }
  };

  // Full cleanup including video element
  const cleanupPlayer = async (includeVideo = true) => {
    await cleanupShakaPlayer();

    if (includeVideo && videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {
        console.error("Error resetting video:", e);
      }
    }
  };

  // Initialize video player - ONLY load sources when user has verified access
  useEffect(() => {
    const sourceType = detectServerType(currentServer);
    
    // CRITICAL: Don't load any video sources if access hasn't been verified or is denied
    // This prevents download managers like IDM from detecting video URLs
    if (accessLoading || isLocked) {
      setIsLoading(false);
      // SECURITY: Clear any existing video source when locked
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      return;
    }
    
    // SECURITY: Don't proceed if no server (happens when access denied)
    if (!currentServer) {
      setIsLoading(false);
      return;
    }
    
    if (!videoRef.current || sourceType === "embed" || sourceType === "iframe") {
      setIsLoading(false);
      return;
    }

    const initPlayer = async () => {
      setIsLoading(true);
      
      try {
        if (sourceType === "mp4") {
          // For MP4, only cleanup Shaka if it exists (switching from HLS/DASH to MP4)
          if (shakaPlayerRef.current) {
            await cleanupShakaPlayer();
          }
          
          let qualityUrl = currentServer.url;
          
          if (currentServer.quality_urls && Object.keys(currentServer.quality_urls).length > 0) {
            const qualities = Object.keys(currentServer.quality_urls).sort((a, b) => {
              const aNum = parseInt(a.replace(/\D/g, ''));
              const bNum = parseInt(b.replace(/\D/g, ''));
              return bNum - aNum;
            });
            setAvailableQualities(qualities);
            qualityUrl = getMp4Url(currentServer.quality_urls, currentQuality) || qualityUrl;
          }
          
          if (qualityUrl && videoRef.current) {
            // Always pause and reset before setting new source to prevent auto-play on episode switch
            videoRef.current.pause();
            // Update poster for the new episode
            videoRef.current.poster = videoPoster;
            videoRef.current.src = qualityUrl;
            
            const onCanPlay = async () => {
              setIsLoading(false);
              // Restore playback state after orientation change only
              if (savedTimeBeforeRemountRef.current > 0 && videoRef.current) {
                videoRef.current.currentTime = savedTimeBeforeRemountRef.current;
                if (wasPlayingBeforeRemountRef.current) {
                  try {
                    await videoRef.current.play();
                  } catch (e) {
                    console.warn("Auto-resume failed:", e);
                  }
                }
                savedTimeBeforeRemountRef.current = 0;
                wasPlayingBeforeRemountRef.current = false;
              }
              // Do NOT autoplay when switching episodes - user must click play
              videoRef.current?.removeEventListener('canplay', onCanPlay);
            };
            
            const onError = () => {
              setIsLoading(false);
              videoRef.current?.removeEventListener('error', onError);
            };
            
            videoRef.current.addEventListener('canplay', onCanPlay, { once: true });
            videoRef.current.addEventListener('error', onError, { once: true });
          }
        } else if (sourceType === "hls" || sourceType === "dash") {
          // Full cleanup for HLS/DASH
          await cleanupPlayer();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            shaka.polyfill.installAll();
          } catch (e) {
            console.warn("Shaka polyfill install error", e);
          }

          if (!shaka.Player.isBrowserSupported()) {
            if (sourceType === "hls" && videoRef.current) {
              videoRef.current.pause();
              videoRef.current.poster = videoPoster;
              videoRef.current.src = currentServer.url;
              setAvailableQualities([]);
            }
            setIsLoading(false);
            return;
          }

          const player = new shaka.Player();
          await player.attach(videoRef.current);
          shakaPlayerRef.current = player;

          // Get native-optimized configuration based on platform
          const isAndroid = Capacitor.getPlatform() === 'android';
          const isIOS = Capacitor.getPlatform() === 'ios';
          const maxQuality = getRecommendedMaxQuality();
          
          // Native-optimized Shaka configuration for smooth playback
          player.configure({
            streaming: {
              // Optimized buffering for native apps
              bufferingGoal: isNativePlatform ? (isIOS ? 12 : 20) : 30,
              rebufferingGoal: isNativePlatform ? 1 : 2,
              bufferBehind: isNativePlatform ? (isIOS ? 12 : 20) : 30,
              // Faster segment fetch for responsive seeking
              retryParameters: {
                maxAttempts: 5,
                baseDelay: 500,
                backoffFactor: 1.5,
                timeout: isNativePlatform ? 15000 : 30000,
                fuzzFactor: 0.5,
              },
              // Prefer native HLS on iOS for better performance
              preferNativeHls: isIOS,
              useNativeHlsOnSafari: isIOS,
              // Segment prefetch for smoother playback
              segmentPrefetchLimit: isNativePlatform ? 2 : 3,
              // Reduce start latency
              smallGapLimit: 0.5,
              jumpLargeGaps: true,
              // Stall detection and recovery
              stallEnabled: true,
              stallThreshold: 1,
              stallSkip: isAndroid ? 0.2 : 0.1,
              // Gap detection
              gapDetectionThreshold: 0.5,
            },
            abr: { 
              enabled: autoQualityEnabled,
              defaultBandwidthEstimate: estimatedBandwidth || 5000000,
              // More conservative switching on mobile to reduce buffering
              switchInterval: isNativePlatform ? 8 : 4,
              // Higher upgrade threshold for stability
              bandwidthUpgradeTarget: isNativePlatform ? 0.75 : 0.85,
              // Lower downgrade threshold to prevent stuttering
              bandwidthDowngradeTarget: isNativePlatform ? 0.90 : 0.95,
              // Limit resolution on mobile for battery/data
              restrictions: isNativePlatform ? {
                maxHeight: maxQuality,
                maxWidth: maxQuality === 1080 ? 1920 : (maxQuality === 720 ? 1280 : 854),
                maxBandwidth: isIOS ? 8000000 : 12000000,
              } : {},
              // Ignore device pixel ratio for consistent behavior
              ignoreDevicePixelRatio: true,
              // Use smooth switching
              clearBufferSwitch: false,
              // Safer switching threshold
              safeMarginSwitch: isNativePlatform ? 2 : 1,
            },
            manifest: {
              // Faster manifest parsing
              retryParameters: {
                maxAttempts: 4,
                baseDelay: 500,
                backoffFactor: 2,
                timeout: isNativePlatform ? 10000 : 20000,
                fuzzFactor: 0.5,
              },
              // Parse HLS faster
              hls: {
                ignoreManifestProgramDateTime: true,
                useFullSegmentsForStartTime: isNativePlatform,
              },
              // DASH optimizations
              dash: {
                ignoreMinBufferTime: isNativePlatform,
                xlinkFailGracefully: true,
                ignoreMaxSegmentDuration: true,
                ignoreEmptyAdaptationSet: true,
              },
            },
          });

          // Monitor bandwidth changes
          player.addEventListener('adaptation', () => {
            if (shakaPlayerRef.current) {
              const stats = shakaPlayerRef.current.getStats();
              if (stats.estimatedBandwidth) {
                setEstimatedBandwidth(stats.estimatedBandwidth);
              }
            }
          });

          // Native-specific: Stall detection and recovery
          if (isNativePlatform) {
            player.addEventListener('stalldetected', () => {
              console.warn('Stall detected, attempting recovery');
              if (videoRef.current) {
                const currentTime = videoRef.current.currentTime;
                videoRef.current.currentTime = currentTime + 0.1;
              }
            });

            player.addEventListener('buffering', (event: any) => {
              console.log('Buffering state:', event.buffering);
            });

            // Error recovery for native
            player.addEventListener('error', (event: any) => {
              const error = event.detail;
              console.error('Shaka error on native:', error.code, error.message);
              // Attempt recovery for non-fatal errors
              if (error.severity === shaka.util.Error.Severity.RECOVERABLE) {
                console.log('Attempting recovery from recoverable error');
                player.retryStreaming();
              }
            });
          }

          try {
            await player.load(currentServer.url);
            // Ensure video is paused after load and poster is set - user must click play to trigger ads and playback
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.poster = videoPoster;
            }

            const tracks = player.getVariantTracks();
            const qualities = [...new Set(tracks.map((t: any) => `${t.height}p`))];
            const sortedQualities = qualities.sort((a: string, b: string) =>
              parseInt(b) - parseInt(a)
            ) as string[];
            setAvailableQualities(sortedQualities);

            // Get audio tracks
            const audioTracks = player.getAudioLanguagesAndRoles();
            setAvailableAudioTracks(audioTracks);

            // Get text tracks (subtitles)
            const textTracks = player.getTextLanguagesAndRoles();
            setAvailableTextTracks(textTracks);
            player.setTextTrackVisibility(false);

            // Auto-select quality based on bandwidth
            if (autoQualityEnabled && estimatedBandwidth) {
              const optimalQuality = selectOptimalQuality(tracks, estimatedBandwidth);
              if (optimalQuality) {
                setCurrentQuality(`${optimalQuality.height}p`);
              }
            }

            const onCanPlay = async () => {
              setIsLoading(false);
              // Restore playback state after orientation change
              if (savedTimeBeforeRemountRef.current > 0 && videoRef.current) {
                videoRef.current.currentTime = savedTimeBeforeRemountRef.current;
                if (wasPlayingBeforeRemountRef.current) {
                  try {
                    await videoRef.current.play();
                  } catch (e) {
                    console.warn("Auto-resume failed:", e);
                  }
                }
                savedTimeBeforeRemountRef.current = 0;
                wasPlayingBeforeRemountRef.current = false;
              }
              videoRef.current?.removeEventListener('canplay', onCanPlay);
            };
            videoRef.current?.addEventListener('canplay', onCanPlay, { once: true });
          } catch (error) {
            console.error("Shaka load error:", error);
            setIsLoading(false);
            if (sourceType === "hls" && videoRef.current) {
              videoRef.current.src = currentServer.url;
            }
          }
        }
      } catch (error) {
        console.error("Error initializing player:", error);
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      // Only cleanup Shaka on unmount, keep video element intact for MP4
      cleanupShakaPlayer();
    };
  }, [currentServer, accessLoading, isLocked, hasAccess, currentEpisodeId, videoPoster]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    const sourceType = detectServerType(currentServer);
    if (!video || sourceType === "embed" || sourceType === "iframe") return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = setTimeout(() => setShowControls(false), 5000);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleEnded = () => onEnded?.();

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
      if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    };
  }, [currentServer, onEnded]);

  // Fullscreen change listener for iOS native platform - handle status bar and immersive mode
  // Note: Android is handled by useIPadVideoFullscreen with CSS-based fullscreen to avoid conflicts
  // The useIPadVideoFullscreen hook handles the actual fullscreen state and CSS-based fullscreen for PWA
  useEffect(() => {
    // Skip this listener on Android native - it's handled by useIPadVideoFullscreen
    const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (isAndroid) return;
    
    const handleNativeFullscreenChange = async () => {
      const isFS = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      // Handle native platform fullscreen state changes with proper sequencing
      // Critical: On older Android (like OPP A57), sequence matters for both rotation AND nav bar hiding
      if (Capacitor.isNativePlatform()) {
        if (isFS) {
          // ENTERING FULLSCREEN - sequence: orientation -> wait -> hide bars
          try {
            // Step 1: Lock to landscape first
            await lockToLandscape();
            // Step 2: Wait for orientation to fully settle (important for older Android)
            await new Promise(resolve => setTimeout(resolve, 150));
            // Step 3: Hide status bar after orientation is stable
            await hideStatusBar();
          } catch (error) {
            console.error('Failed to set fullscreen orientation:', error);
          }
        } else {
          // EXITING FULLSCREEN - sequence: show bars -> wait -> orientation
          try {
            // Step 1: Show status bar first
            await showStatusBar();
            // Step 2: Wait before changing orientation
            await new Promise(resolve => setTimeout(resolve, 100));
            // Step 3: Return to portrait
            await lockToPortrait();
          } catch (error) {
            console.error('Failed to reset orientation:', error);
          }
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleNativeFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleNativeFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleNativeFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleNativeFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleNativeFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleNativeFullscreenChange);
    };
  }, []);

  // Sleep timer cleanup
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, []);

  // Cleanup: ensure video stops, exit fullscreen, return to portrait on unmount
  useEffect(() => {
    return () => {
      // CRITICAL: Stop video playback when navigating away
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          videoRef.current.src = '';
          videoRef.current.load();
        } catch (e) {
          console.log('[VideoPlayer] Cleanup pause failed:', e);
        }
      }
      
      // Cleanup Shaka player
      if (shakaPlayerRef.current) {
        try {
          shakaPlayerRef.current.destroy().catch(() => {});
        } catch (e) {
          console.log('[VideoPlayer] Shaka cleanup failed:', e);
        }
        shakaPlayerRef.current = null;
      }
      
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch (e) {
          console.log('[VideoPlayer] Exit fullscreen failed:', e);
        }
      }
      
      // Restore native platform state
      if (Capacitor.isNativePlatform()) {
        showStatusBar().catch(console.error);
        lockToPortrait().catch(console.error);
      }
    };
  }, []);

  // Pause video when app goes to background or becomes hidden (native Android)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        console.log('[VideoPlayer] App hidden - pausing video');
        videoRef.current.pause();
      }
    };

    const handleAppStateChange = async () => {
      // For Capacitor native apps - pause when app goes to background
      if (Capacitor.isNativePlatform()) {
        try {
          const { App } = await import('@capacitor/app');
          const removeListener = App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive && videoRef.current && !videoRef.current.paused) {
              console.log('[VideoPlayer] App inactive - pausing video');
              videoRef.current.pause();
            }
          });
          return () => {
            removeListener.then(handle => handle.remove());
          };
        } catch (e) {
          console.log('[VideoPlayer] App state listener not available:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const cleanupPromise = handleAppStateChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupPromise?.then(cleanup => cleanup?.());
    };
  }, []);

  const handleServerChange = (source: VideoSource) => {
    const wasPlaying = videoRef.current && !videoRef.current.paused;
    const savedTime = videoRef.current?.currentTime || 0;
    
    const sourceType = normalizeType(source.source_type, source.url);
    if (sourceType === "mp4" && source.quality_urls) {
      const qualities = Object.keys(source.quality_urls).sort((a, b) => {
        const aNum = parseInt(a.replace(/\D/g, ''));
        const bNum = parseInt(b.replace(/\D/g, ''));
        return bNum - aNum;
      });
      setAvailableQualities(qualities);
      // Use the server's default quality if set and available, otherwise fall back to 720p or first available
      const serverDefaultQuality = source.quality;
      if (serverDefaultQuality && qualities.includes(serverDefaultQuality)) {
        setCurrentQuality(serverDefaultQuality);
      } else if (serverDefaultQuality && qualities.includes(serverDefaultQuality.replace(/p$/i, '') + 'p')) {
        setCurrentQuality(serverDefaultQuality.replace(/p$/i, '') + 'p');
      } else {
        setCurrentQuality(qualities.includes("720p") ? "720p" : qualities[0] || "720p");
      }
    } else {
      setAvailableQualities([]);
    }

    setCurrentServer(source);
  };

  const handleQualityChange = (quality: string) => {
    if (!currentServer || !videoRef.current) return;
    const savedTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;

    const sourceType = normalizeType(currentServer.source_type, currentServer.url);
    if (sourceType === "mp4" && currentServer.quality_urls) {
      const qualityUrl = getMp4Url(currentServer.quality_urls, quality);
      if (qualityUrl) {
        setCurrentQuality(quality);
        setAutoQualityEnabled(false);
        
        const onCanPlay = async () => {
          if (!videoRef.current) return;
          videoRef.current.currentTime = savedTime;
          if (wasPlaying) await videoRef.current.play();
          videoRef.current.removeEventListener('canplay', onCanPlay);
        };
        
        videoRef.current.addEventListener('canplay', onCanPlay, { once: true });
        videoRef.current.src = qualityUrl;
        videoRef.current.load();
      }
    } else if ((sourceType === "hls" || sourceType === "dash") && shakaPlayerRef.current) {
      const player = shakaPlayerRef.current;
      const tracks = player.getVariantTracks();
      const targetHeight = parseInt(quality);
      const matchingTracks = tracks.filter((track: any) => track.height === targetHeight);
      
      if (matchingTracks.length > 0) {
        setAutoQualityEnabled(false);
        player.configure({ abr: { enabled: false } });
        player.selectVariantTrack(matchingTracks[0], true);
        setCurrentQuality(quality);
      }
    }
  };

  const handleTextTrackChange = (language: string) => {
    if (!shakaPlayerRef.current) return;
    const player = shakaPlayerRef.current;
    
    if (language === 'off') {
      player.setTextTrackVisibility(false);
      setCurrentTextTrack('off');
    } else {
      player.selectTextLanguage(language);
      player.setTextTrackVisibility(true);
      setCurrentTextTrack(language);
    }
  };

  const handleAudioTrackChange = (language: string) => {
    if (!shakaPlayerRef.current) return;
    const player = shakaPlayerRef.current;
    player.selectAudioLanguage(language);
    setCurrentAudioTrack(language);
  };

  // Check if user should see Support Us / Video Ads (disabled for subscribers and purchasers)
  const shouldShowSupportAndAds = useMemo(() => {
    // Skip for premium subscribers
    if (hasActiveSubscription) return false;
    // Skip for users who have purchased/rented this content (hasAccess is true for paid content)
    if (accessType !== 'free' && hasAccess === true) return false;
    return true;
  }, [hasActiveSubscription, accessType, hasAccess]);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    // Show Support Us overlay on first play (start checkpoint) if enabled, not already supported, and not premium/purchaser
    if (!isPlaying && supportUsSettings.enabled && supportUsSettings.checkpointStart && 
        !shownSupportCheckpoints.has('start') && !isLocked && !accessLoading && !hasAlreadySupported && shouldShowSupportAndAds) {
      setShowSupportOverlay(true);
      setShownSupportCheckpoints(prev => new Set([...prev, 'start']));
      // Pause video while overlay is shown - video ads will show after Support Us closes
      return;
    }
    
    // If Support Us is not enabled/triggered, show pre-roll ad directly on first play
    // Skip ads for premium subscribers and purchasers
    if (!isPlaying && shouldShowAds() && shouldShowSupportAndAds && !hasShownPreRoll && !isLocked && !accessLoading) {
      const preRollAd = getAdForPlacement('pre_roll');
      if (preRollAd) {
        // User initiated play; resume main video after ad finishes/skips
        resumeAfterAdRef.current = true;
        setCurrentVideoAd(preRollAd);
        setShowVideoAd(true);
        setHasShownPreRoll(true);
        return; // Don't start video yet, wait for ad to complete
      }
    }
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setShowCenterIcon(true);
    setTimeout(() => setShowCenterIcon(false), 500);
  }, [isPlaying, shownSupportCheckpoints, isLocked, accessLoading, supportUsSettings, hasAlreadySupported, shouldShowSupportAndAds, shouldShowAds, hasShownPreRoll, getAdForPlacement]);

  // Check for 50% and 85% Support overlay checkpoints during playback
  const checkSupportCheckpoints = useCallback(() => {
    // Skip if already supported this episode/content, or if premium subscriber/purchaser
    if (!videoRef.current || duration <= 0 || isLocked || accessLoading || !supportUsSettings.enabled || hasAlreadySupported || !shouldShowSupportAndAds) return;
    
    const progress = (currentTime / duration) * 100;
    
    // Check 50% checkpoint
    if (supportUsSettings.checkpoint50 && progress >= 50 && progress < 85 && !shownSupportCheckpoints.has('50')) {
      setShowSupportOverlay(true);
      setShownSupportCheckpoints(prev => new Set([...prev, '50']));
      if (videoRef.current) videoRef.current.pause();
    }
    // Check 85% checkpoint
    else if (supportUsSettings.checkpoint85 && progress >= 85 && !shownSupportCheckpoints.has('85')) {
      setShowSupportOverlay(true);
      setShownSupportCheckpoints(prev => new Set([...prev, '85']));
      if (videoRef.current) videoRef.current.pause();
    }
  }, [currentTime, duration, shownSupportCheckpoints, isLocked, accessLoading, supportUsSettings, hasAlreadySupported, shouldShowSupportAndAds]);

  // Run checkpoint check when time updates
  useEffect(() => {
    if (isPlaying && !showSupportOverlay) {
      checkSupportCheckpoints();
    }
  }, [isPlaying, currentTime, showSupportOverlay, checkSupportCheckpoints]);

  // Handle Support Us overlay skip/close - check for AdMob rewarded ads (native) then video ads before resuming
  const handleSupportOverlaySkip = useCallback(async () => {
    setShowSupportOverlay(false);
    
    // On native app, show AdMob rewarded ad after Support Us for free users (at start checkpoint)
    if (isNativeForAds && shouldShowRewardedAtCheckpoint('start') && !shownAdMobCheckpoints.has('start')) {
      setShownAdMobCheckpoints(prev => new Set([...prev, 'start']));
      await showRewardedAd('start');
      // After rewarded ad, let user manually play
      return;
    }
    
    // Check if we should show a pre-roll video ad after Support Us (skip for subscribers/purchasers)
    if (shouldShowAds() && shouldShowSupportAndAds && !hasShownPreRoll) {
      const preRollAd = getAdForPlacement('pre_roll');
      if (preRollAd) {
        // User initiated play; resume main video after ad finishes/skips
        resumeAfterAdRef.current = true;
        setCurrentVideoAd(preRollAd);
        setShowVideoAd(true);
        setHasShownPreRoll(true);
        return; // Don't resume playback yet, wait for ad to complete
      }
    }
    
    // Don't autoplay - let user click play manually
  }, [shouldShowAds, shouldShowSupportAndAds, hasShownPreRoll, getAdForPlacement, isNativeForAds, shouldShowRewardedAtCheckpoint, showRewardedAd, shownAdMobCheckpoints]);

  const handleSupportOverlayClose = useCallback(async () => {
    setShowSupportOverlay(false);
    setHasAlreadySupported(true); // Mark as supported so overlay won't show again
    
    // On native app, show AdMob rewarded ad after Support Us for free users (at start checkpoint)
    if (isNativeForAds && shouldShowRewardedAtCheckpoint('start') && !shownAdMobCheckpoints.has('start')) {
      setShownAdMobCheckpoints(prev => new Set([...prev, 'start']));
      await showRewardedAd('start');
      // After rewarded ad, let user manually play
      return;
    }
    
    // Check if we should show a pre-roll video ad after Support Us (skip for subscribers/purchasers)
    if (shouldShowAds() && shouldShowSupportAndAds && !hasShownPreRoll) {
      const preRollAd = getAdForPlacement('pre_roll');
      if (preRollAd) {
        // User initiated play; resume main video after ad finishes/skips
        resumeAfterAdRef.current = true;
        setCurrentVideoAd(preRollAd);
        setShowVideoAd(true);
        setHasShownPreRoll(true);
        return; // Don't resume playback yet, wait for ad to complete
      }
    }
    
    // Don't autoplay - let user click play manually
  }, [shouldShowAds, shouldShowSupportAndAds, hasShownPreRoll, getAdForPlacement, isNativeForAds, shouldShowRewardedAtCheckpoint, showRewardedAd, shownAdMobCheckpoints]);

  // Check for AdMob rewarded ad checkpoints at 40% and 85% during playback (native only)
  const checkAdMobRewardedCheckpoints = useCallback(async () => {
    if (!isNativeForAds || duration <= 0 || isLocked || accessLoading || isShowingRewardedAd) return;
    
    const progress = (currentTime / duration) * 100;
    
    // Check 40% checkpoint
    if (progress >= 40 && progress < 85 && !shownAdMobCheckpoints.has('40') && shouldShowRewardedAtCheckpoint('40')) {
      setShownAdMobCheckpoints(prev => new Set([...prev, '40']));
      if (videoRef.current) videoRef.current.pause();
      await showRewardedAd('40');
      // Resume playback after ad
      if (videoRef.current) videoRef.current.play().catch(() => {});
    }
    // Check 85% checkpoint
    else if (progress >= 85 && !shownAdMobCheckpoints.has('85') && shouldShowRewardedAtCheckpoint('85')) {
      setShownAdMobCheckpoints(prev => new Set([...prev, '85']));
      if (videoRef.current) videoRef.current.pause();
      await showRewardedAd('85');
      // Resume playback after ad
      if (videoRef.current) videoRef.current.play().catch(() => {});
    }
  }, [isNativeForAds, currentTime, duration, isLocked, accessLoading, isShowingRewardedAd, shownAdMobCheckpoints, shouldShowRewardedAtCheckpoint, showRewardedAd]);

  // Run AdMob rewarded checkpoint check during playback
  useEffect(() => {
    if (isPlaying && !showSupportOverlay && !showVideoAd && isNativeForAds) {
      checkAdMobRewardedCheckpoints();
    }
  }, [isPlaying, currentTime, showSupportOverlay, showVideoAd, isNativeForAds, checkAdMobRewardedCheckpoints]);

  // Video Ad handlers
  const resumeMainVideoAfterAd = useCallback(() => {
    if (!resumeAfterAdRef.current) return;
    resumeAfterAdRef.current = false;

    const v = videoRef.current;
    if (!v) return;

    // Wait a frame so the ad overlay unmounts before resuming playback
    requestAnimationFrame(() => {
      v.play().catch(() => {
        // If autoplay is blocked, user can hit play manually
      });
    });
  }, []);

  const handleVideoAdComplete = useCallback(() => {
    setShowVideoAd(false);
    setCurrentVideoAd(null);
    resumeMainVideoAfterAd();
  }, [resumeMainVideoAfterAd]);

  const handleVideoAdSkip = useCallback(() => {
    setShowVideoAd(false);
    setCurrentVideoAd(null);
    resumeMainVideoAfterAd();
  }, [resumeMainVideoAfterAd]);

  // Check for mid-roll ads during playback (skip for subscribers/purchasers)
  useEffect(() => {
    if (!isPlaying || showVideoAd || showSupportOverlay || !shouldShowAds() || !shouldShowSupportAndAds) return;
    if (!videoAdsSettings.midRoll || duration <= 0) return;
    
    const timeSinceLastMidRoll = currentTime - lastMidRollTimeRef.current;
    
    // Show mid-roll ad at intervals
    if (timeSinceLastMidRoll >= midRollInterval && currentTime > midRollInterval) {
      const midRollAd = getAdForPlacement('mid_roll');
      if (midRollAd) {
        lastMidRollTimeRef.current = currentTime;
        // Resume main video after mid-roll ends/skips
        resumeAfterAdRef.current = true;
        setCurrentVideoAd(midRollAd);
        setShowVideoAd(true);
        if (videoRef.current) videoRef.current.pause();
      }
    }
  }, [currentTime, isPlaying, showVideoAd, showSupportOverlay, shouldShowAds, shouldShowSupportAndAds, videoAdsSettings.midRoll, midRollInterval, getAdForPlacement, duration]);

  const handleVolumeSliderChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  // Fullscreen toggle - uses the iPad-optimized hook
  // The hook handles: CSS-based fullscreen for PWA, touch events, and playback preservation
  const toggleFullscreen = useCallback(async () => {
    // Use the hook's toggle which handles PWA, iPad, and native cases
    await iPadToggleFullscreen();
  }, [iPadToggleFullscreen]);

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const skipBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const skipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  };

  const handlePlaybackSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSleepTimerChange = (minutes: number) => {
    setSleepTimer(minutes);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (videoRef.current) videoRef.current.pause();
        setSleepTimer(0);
      }, minutes * 60 * 1000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    // Don't auto-hide controls if settings menu is open
    if (!settingsMenuOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !settingsMenuOpen) setShowControls(false);
      }, 3000);
    }
  };

  const handleSettingsMenuOpenChange = (isOpen: boolean) => {
    setSettingsMenuOpen(isOpen);
    if (isOpen) {
      // Keep controls visible when settings menu is open
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  };

  const sourceType = currentServer ? detectServerType(currentServer) : "unknown";
  const ServerIconComponent = getServerIcon(sourceType);

  // Show locked content overlay when no access (even without currentServer)
  // This ensures the lock overlay shows instead of generic loading for paid content
  if (!currentServer) {
    // Show mobile-only lock if all sources are mobile_only on web
    if (allSourcesMobileOnly) {
      return (
        <>
          <div 
            ref={containerRef}
            className="relative bg-black w-full aspect-video"
          >
            <AppLockOverlay type="mobile_only" contentBackdrop={contentBackdrop} />
          </div>
          {paymentDialogs}
        </>
      );
    }
    
    // Show web-only lock if all sources are web_only on native app
    if (allSourcesWebOnly) {
      return (
        <>
          <div 
            ref={containerRef}
            className="relative bg-black w-full aspect-video"
          >
            <AppLockOverlay type="web_only" contentBackdrop={contentBackdrop} />
          </div>
          {paymentDialogs}
        </>
      );
    }
    
    // If content is locked or access is being checked for paid content, show lock/loading overlay
    if (isLocked || (accessLoading && accessType !== 'free')) {
      return (
        <>
          <div 
            ref={containerRef}
            className="relative bg-black w-full aspect-video flex items-center justify-center"
            style={{
              backgroundImage: contentBackdrop ? `url(${contentBackdrop})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70" />
            
            {/* Access Loading State */}
            {accessLoading && (
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-white/70 text-sm">Checking access...</p>
              </div>
            )}
            
            {/* Locked Content Overlay */}
            {!accessLoading && isLocked && (
              <div className="relative z-10 flex flex-col items-center gap-4 p-4 sm:p-6 text-center max-w-md mx-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                  {accessType === 'rent' ? (
                    <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500" />
                  ) : (
                    <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-white text-xl sm:text-2xl font-bold">
                    {accessType === 'rent' ? 'Content For Rent' : 'Premium Content'}
                  </h3>
                  <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                    {accessType === 'rent' 
                      ? excludeFromPlan 
                        ? `Purchase to watch for ${rentalPeriodDays} days` 
                        : 'Subscribe or rent to unlock this content'
                      : 'Subscribe to unlock this premium content'}
                  </p>
                </div>
                
                <InlineRentSubscribe
                  accessType={accessType}
                  excludeFromPlan={excludeFromPlan}
                  rentalPrice={rentalPrice}
                  rentalPeriodDays={rentalPeriodDays}
                  contentId={contentId || mediaId}
                  mediaType={mediaType}
                  title={title}
                  onAuthRequired={() => setShowAuthDialog(true)}
                  onSuccess={() => window.location.reload()}
                />
                
                {accessType === 'rent' && !excludeFromPlan && (
                  <p className="text-white/50 text-xs mt-1">
                    Premium members get unlimited access
                  </p>
                )}
              </div>
            )}
          </div>

          {paymentDialogs}
        </>
      );
    }
    
    // Only show generic loading placeholder for free content still loading
    return (
      <>
        <div 
          ref={containerRef}
          className="relative bg-black w-full aspect-video flex items-center justify-center"
          style={{
            backgroundImage: contentBackdrop ? `url(${contentBackdrop})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Loading player...</p>
          </div>
        </div>

        {paymentDialogs}
      </>
    );
  }

  // Check if Android native app
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  return (
    <>
    {/* Android native wrapper for top padding - hidden in fullscreen and landscape */}
    <div className={isAndroidNative && !isFullscreen ? 'native-android-player-wrapper' : ''}>
    <div 
      ref={containerRef}
      className="relative bg-black group w-full aspect-video video-player-container video-player-safe-area"
      style={{
        maxHeight: isFullscreen ? '100vh' : undefined,
        maxWidth: isFullscreen ? '100vw' : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Loading Overlay */}
      {isLoading && !isLocked && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Access Loading Overlay */}
      {accessLoading && accessType !== 'free' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[55]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-sm">Checking access...</p>
          </div>
        </div>
      )}

      {/* Locked Content Overlay */}
      {isLocked && (
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/80 flex items-center justify-center z-[55]"
          style={{
            backgroundImage: contentBackdrop ? `url(${contentBackdrop})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70" />
          <div className="relative z-10 flex flex-col items-center gap-4 p-4 sm:p-6 text-center max-w-md mx-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
              {accessType === 'rent' ? (
                <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500" />
              ) : (
                <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-white text-xl sm:text-2xl font-bold">
                {accessType === 'rent' ? 'Content For Rent' : 'Premium Content'}
              </h3>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                {accessType === 'rent' 
                  ? excludeFromPlan 
                    ? `Purchase to watch for ${rentalPeriodDays} days` 
                    : 'Subscribe or rent to unlock this content'
                  : 'Subscribe to unlock this premium content'}
              </p>
            </div>
            
            <InlineRentSubscribe
              accessType={accessType}
              excludeFromPlan={excludeFromPlan}
              rentalPrice={rentalPrice}
              rentalPeriodDays={rentalPeriodDays}
              contentId={contentId || mediaId}
              mediaType={mediaType}
              title={title}
              onAuthRequired={() => setShowAuthDialog(true)}
              onSuccess={() => window.location.reload()}
            />
            
            {accessType === 'rent' && !excludeFromPlan && (
              <p className="text-white/50 text-xs mt-1">
                Premium members get unlimited access
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile Only Content Lock Overlay - Shows when all sources are mobile_only on web */}
      {allSourcesMobileOnly && !isLocked && !accessLoading && (
        <AppLockOverlay type="mobile_only" contentBackdrop={contentBackdrop} />
      )}
      
      {/* Web Only Content Lock Overlay - Shows when all sources are web_only on native app */}
      {allSourcesWebOnly && !isLocked && !accessLoading && (
        <AppLockOverlay type="web_only" contentBackdrop={contentBackdrop} />
      )}
      
      {/* Video Element - Only render when user has access to prevent source detection */}
      {/* webkit-playsinline and playsinline prevent iOS from hijacking video to native player */}
      {/* Native-optimized attributes for better performance on Capacitor apps */}
      {sourceType !== "embed" && sourceType !== "iframe" && !isLocked && !accessLoading && !allSourcesMobileOnly && !allSourcesWebOnly && (
        <video
          ref={videoRef}
          className="w-full h-full"
          poster={videoPoster}
          style={{ 
            objectFit: 'contain',
            // Hardware acceleration for Android native
            ...(isNativePlatform && Capacitor.getPlatform() === 'android' ? {
              transform: 'translateZ(0)',
              willChange: 'transform',
            } : {}),
          }}
          playsInline
          // @ts-ignore - webkit-playsinline for older iOS compatibility
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          // @ts-ignore - iOS background audio support
          x-webkit-wirelessvideoplaybackdisabled="false"
          // Optimized preload for native - metadata is faster
          preload={isNativePlatform ? "metadata" : "auto"}
          crossOrigin="anonymous"
          // Prevent iOS from showing native controls which could trigger native fullscreen
          controls={false}
        />
      )}

      {/* Poster overlay - shows episode thumbnail until video plays */}
      {/* Shows for all source types including embed/iframe when not playing */}
      {!isLocked && !accessLoading && !allSourcesMobileOnly && !allSourcesWebOnly && !isPlaying && videoPoster && (
        <div 
          className={`absolute inset-0 z-[5] overflow-hidden bg-black ${
            (sourceType === "embed" || sourceType === "iframe") ? 'cursor-pointer' : 'pointer-events-none'
          }`}
          onClick={(sourceType === "embed" || sourceType === "iframe") ? () => setIsPlaying(true) : undefined}
        >
          <img
            src={videoPoster}
            alt="Video thumbnail"
            className="w-full h-full object-cover transition-opacity duration-500 ease-out"
            style={{ opacity: 1 }}
            onLoad={(e) => {
              const img = e.currentTarget;
              img.style.opacity = '1';
            }}
            onError={(e) => {
              // Hide broken image
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Play button overlay for iframe sources */}
          {(sourceType === "embed" || sourceType === "iframe") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Background poster when locked - no video element to prevent source exposure */}
      {(isLocked || accessLoading) && sourceType !== "embed" && sourceType !== "iframe" && (
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: videoPoster ? `url(${videoPoster})` : 'none' }}
        />
      )}

      {/* Iframe Element - Only load when user has access and server is not restricted */}
      {/* Supports VK Video URLs with automatic conversion to embed format */}
      {(sourceType === "embed" || sourceType === "iframe") && !isLocked && !accessLoading && !allSourcesMobileOnly && !allSourcesWebOnly && !isCurrentServerRestricted && (
        <>
          <iframe
            ref={iframeRef}
            src={convertVkVideoUrl(currentServer.url)}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            style={{ border: 'none' }}
          />
        </>
      )}
      
      {/* Lock overlay for restricted server selection */}
      {(sourceType === "embed" || sourceType === "iframe") && !isLocked && !accessLoading && !allSourcesMobileOnly && !allSourcesWebOnly && isCurrentServerRestricted && (
        <AppLockOverlay 
          type={currentServer?.permission === 'mobile_only' ? 'mobile_only' : 'web_only'} 
          contentBackdrop={contentBackdrop} 
        />
      )}

      {/* Zoom Indicator - Telegram-style */}
      {isFullscreen && showZoomIndicator && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <span className="text-white text-sm font-medium">{zoomPercentage}%</span>
          </div>
        </div>
      )}

      {/* Reset Zoom Button - Show when zoomed */}
      {isFullscreen && isZoomed && !showZoomIndicator && (
        <button
          onClick={() => resetZoom()}
          className="absolute top-4 left-4 z-[70] bg-black/60 hover:bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 border border-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <span className="text-white text-xs font-medium">{zoomPercentage}%</span>
        </button>
      )}
      
      {/* Server dropdown for iframe/embed sources - always show when multiple servers exist */}
      {(sourceType === "embed" || sourceType === "iframe") && !accessLoading && allAvailableSources.length > 1 && (
        <div className="absolute top-2 right-2 z-[9999] flex gap-2 pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white bg-black/40 hover:bg-black/60">
                <ServerIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background text-foreground border border-border shadow-xl z-[10000]">
              <DropdownMenuLabel className="text-muted-foreground">Select Server</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {allAvailableSources.map((source) => {
                const Icon = getServerIcon(normalizeType(source.source_type, source.url));
                const isActive = currentServer?.id === source.id;
                const isRestricted = (!isNativePlatform && source.permission === 'mobile_only') || 
                                     (isNativePlatform && source.permission === 'web_only');
                return (
                  <DropdownMenuItem
                    key={source.id}
                    onClick={() => handleServerChange(source)}
                    className={`${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{source.server_name || source.name || 'Server'}</span>
                    {isRestricted && (
                      <span className="ml-2 text-xs text-orange-500">
                        ({source.permission === 'mobile_only' ? 'App' : 'Web'})
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Lock overlay for restricted server selection on non-iframe sources */}
      {sourceType !== "embed" && sourceType !== "iframe" && !isLocked && !accessLoading && !allSourcesMobileOnly && !allSourcesWebOnly && isCurrentServerRestricted && (
        <AppLockOverlay 
          type={currentServer?.permission === 'mobile_only' ? 'mobile_only' : 'web_only'} 
          contentBackdrop={contentBackdrop} 
        />
      )}

      {/* Server List Button - Show when multiple servers exist */}
      {sourceType !== "embed" && sourceType !== "iframe" && allAvailableSources.length > 1 && !accessLoading && (
        <div className={`absolute top-4 right-4 z-[60] transition-opacity duration-300 ${showControls || isCurrentServerRestricted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm">
                <ServerIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background text-foreground border border-border shadow-xl z-[9999]">
              <DropdownMenuLabel className="text-muted-foreground">Select Server</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {allAvailableSources.map((source) => {
                const Icon = getServerIcon(normalizeType(source.source_type, source.url));
                const isActive = currentServer?.id === source.id;
                const isRestricted = (!isNativePlatform && source.permission === 'mobile_only') || 
                                     (isNativePlatform && source.permission === 'web_only');
                return (
                  <DropdownMenuItem
                    key={source.id}
                    onClick={() => handleServerChange(source)}
                    className={`${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{source.server_name || source.name || 'Server'}</span>
                    {isRestricted && (
                      <span className="ml-2 text-xs text-orange-500">
                        ({source.permission === 'mobile_only' ? 'App' : 'Web'})
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Click overlay for play/pause */}
      {sourceType !== "embed" && sourceType !== "iframe" && !allSourcesMobileOnly && !allSourcesWebOnly && !isCurrentServerRestricted && (
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) togglePlayPause();
          }}
        />
      )}

      {/* Center Controls - hide when settings menu is open */}
      {sourceType !== "embed" && sourceType !== "iframe" && !allSourcesMobileOnly && !allSourcesWebOnly && !isCurrentServerRestricted && (
        <>
          {/* Exit Fullscreen Button - Top Left Corner (only in fullscreen) */}
          {isFullscreen && showControls && !isLocked && !settingsMenuOpen && (
            <div className="video-controls absolute top-0 left-0 z-[60] p-3 sm:p-4 pointer-events-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTimeout(() => toggleFullscreen(), 0);
                }}
                className="h-10 w-10 sm:h-11 sm:w-11 text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full border border-white/20 transition-all active:scale-95"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          )}

          <div className={`video-controls absolute inset-0 z-20 flex items-center justify-center gap-12 pointer-events-none transition-opacity duration-300 ${showControls && !isLocked && !settingsMenuOpen ? 'opacity-100' : 'opacity-0'}`}>
            <Button variant="ghost" size="icon" onClick={skipBackward} className="h-12 w-12 text-white/90 hover:text-white pointer-events-auto">
              <SkipBack className="h-6 w-6" fill="currentColor" />
            </Button>
            <div className="w-16" />
            <Button variant="ghost" size="icon" onClick={skipForward} className="h-12 w-12 text-white/90 hover:text-white pointer-events-auto">
              <SkipForward className="h-6 w-6" fill="currentColor" />
            </Button>
          </div>

          {(!isPlaying || showControls || showCenterIcon) && !isLocked && !settingsMenuOpen && (
            <div className="video-controls absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className={`h-16 w-16 rounded-full text-white transition-all hover:scale-105 pointer-events-auto ${showCenterIcon ? 'animate-in zoom-in-95 duration-200' : ''}`}
              >
                {isPlaying ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="h-7 w-7 ml-0.5" fill="currentColor" />}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Bottom Controls */}
      {sourceType !== "embed" && sourceType !== "iframe" && !allSourcesMobileOnly && !allSourcesWebOnly && !isCurrentServerRestricted && (
        <div className={`video-controls absolute inset-0 z-40 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
            {/* Progress Bar */}
            <div className="px-2 sm:px-4 pb-1.5 sm:pb-2">
              <div className="relative h-1 sm:h-1.5 bg-white/20 rounded-full cursor-pointer group/progress">
                <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${(buffered / duration) * 100}%` }} />
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="absolute inset-0"
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 sm:px-4 pb-2 sm:pb-4 pt-1 sm:pt-2">
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {/* Left Controls */}
                <div className="flex items-center gap-0.5 sm:gap-2">
                  <Button variant="ghost" size="icon" onClick={togglePlayPause} className="h-7 w-7 sm:h-9 sm:w-9 text-white hover:bg-white/10">
                    {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" fill="currentColor" />}
                  </Button>
                  
                  {/* Volume - hide on mobile */}
                  <div className="hidden sm:flex items-center gap-2 group/volume">
                    <Button variant="ghost" size="icon" onClick={toggleMute} className="h-9 w-9 text-white hover:bg-white/10">
                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <div className="w-20 opacity-0 group-hover/volume:opacity-100 transition-opacity">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeSliderChange}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Time - compact on mobile */}
                  <span className="text-white text-[10px] sm:text-sm ml-0.5 sm:ml-2 whitespace-nowrap">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-0.5 sm:gap-2">
                  {/* Episodes List Button - only show for series with episodes */}
                  {episodes && episodes.length > 0 && onEpisodeSelect && (
                    <Button 
                      variant="ghost" 
                      className="h-7 sm:h-9 px-2 sm:px-3 text-white hover:bg-white/10 flex items-center gap-1 sm:gap-1.5"
                      onClick={() => setShowEpisodesPanel(!showEpisodesPanel)}
                    >
                      <span className="text-[10px] sm:text-xs font-medium">Episodes</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none">
                        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10">
                          <path d="M21.5 5.5h-17v18h17zm-1-2h-15m16-2h-17l-3 2l3 2m-3-2v18l3 2"/>
                          <path d="M11.5 12.75L9.5 14l-2-1.25v-2l2-1.25l2 1.25zm4.5-.25l-3 5l-2.5-1l-2 3h10z"/>
                        </g>
                      </svg>
                    </Button>
                  )}

                  {/* Settings Menu */}
                  <VideoSettingsMenu
                    stableVolume={false}
                    onStableVolumeChange={() => {}}
                    availableTextTracks={availableTextTracks}
                    currentTextTrack={currentTextTrack}
                    onTextTrackChange={handleTextTrackChange}
                    sleepTimer={sleepTimer}
                    onSleepTimerChange={handleSleepTimerChange}
                    playbackSpeed={playbackSpeed}
                    onPlaybackSpeedChange={handlePlaybackSpeedChange}
                    availableQualities={availableQualities}
                    currentQuality={currentQuality}
                    autoQualityEnabled={autoQualityEnabled}
                    onQualityChange={handleQualityChange}
                    onAutoQualityToggle={() => setAutoQualityEnabled(!autoQualityEnabled)}
                    sourceType={sourceType}
                    onOpenChange={handleSettingsMenuOpenChange}
                  />

                  {/* Picture in Picture - hide on mobile */}
                  <Button variant="ghost" size="icon" onClick={togglePictureInPicture} className="hidden sm:flex h-9 w-9 text-white hover:bg-white/10">
                    <PictureInPicture className="h-5 w-5" />
                  </Button>

                  {/* Fullscreen Toggle Button - Enhanced for iPad PWA */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={isFullscreenTransitioning}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Avoid double-triggering from both click and touchend
                      if (!(e.nativeEvent as any).fromTouch) {
                        toggleFullscreen();
                      }
                    }}
                    onTouchStart={(e) => {
                      // Mark this as a touch event to prevent click from also firing
                      (e.nativeEvent as any).fromTouch = true;
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Use setTimeout to ensure touch is processed properly on iPad
                      setTimeout(() => toggleFullscreen(), 0);
                    }}
                    className={`h-8 w-8 sm:h-9 sm:w-9 text-white hover:bg-white/10 active:bg-white/20 touch-manipulation select-none ${
                      isFullscreenTransitioning ? 'opacity-50 cursor-wait' : ''
                    }`}
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5 sm:h-5 sm:w-5" /> : <Maximize className="h-5 w-5 sm:h-5 sm:w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episodes Panel Overlay */}
      {showEpisodesPanel && episodes && episodes.length > 0 && onEpisodeSelect && (
        <div className="absolute inset-0 z-[100] flex flex-col justify-end pointer-events-none">
          {/* Backdrop to close */}
          <div 
            className="absolute inset-0 bg-black/15 pointer-events-auto"
            onClick={() => setShowEpisodesPanel(false)}
          />
          
          {/* Episodes Panel */}
          <div className="relative bg-black/15 backdrop-blur-sm p-4 pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm">Episodes</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setShowEpisodesPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Horizontal Scroll Episodes with Navigation Arrows */}
            <div className="relative group/episodes">
              {/* Left Navigation Arrow - Desktop only */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white border border-white/20"
                onClick={() => {
                  if (episodesScrollRef.current) {
                    episodesScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Right Navigation Arrow - Desktop only */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white border border-white/20"
                onClick={() => {
                  if (episodesScrollRef.current) {
                    episodesScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                  }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Episodes Scroll Container */}
              <div 
                ref={episodesScrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-2 sm:px-8"
              >
                {episodes.map((episode) => {
                  const isActive = currentEpisodeId === episode.id;
                  const thumbnail = episode.still_path || contentBackdrop || '/placeholder.svg';
                  return (
                    <div
                      key={episode.id}
                      className={`flex-shrink-0 w-48 sm:w-56 cursor-pointer ${isActive ? 'ring-2 ring-primary rounded-lg' : ''}`}
                      onClick={() => {
                        // Close any playing ad when switching episodes
                        if (showVideoAd) {
                          setShowVideoAd(false);
                          setCurrentVideoAd(null);
                        }
                        onEpisodeSelect(episode.id);
                        setShowEpisodesPanel(false);
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-2">
                        <img
                          src={thumbnail}
                          alt={`Episode ${episode.episode_number}`}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                        {/* Episode number badge */}
                        <div className="absolute bottom-2 left-2">
                          <span className="text-3xl sm:text-4xl font-black text-white leading-none" style={{
                            textShadow: '2px 2px 0px rgba(0,0,0,0.9), 4px 4px 8px rgba(0,0,0,0.5)',
                            WebkitTextStroke: '0.5px rgba(255,255,255,0.2)'
                          }}>
                            {episode.episode_number}
                          </span>
                        </div>
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        )}
                      </div>
                      {/* Title */}
                      <p className="text-white text-xs sm:text-sm font-medium truncate px-1">
                        EP {episode.episode_number}: {episode.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Us Overlay - Hidden for premium subscribers */}
      <SupportUsOverlay
        isVisible={showSupportOverlay && !hasActiveSubscription}
        onClose={handleSupportOverlayClose}
        onSkip={handleSupportOverlaySkip}
        contentId={contentId || mediaId}
        contentTitle={title}
        countdownSeconds={supportUsSettings.countdownSeconds}
        supportAmounts={supportUsSettings.amounts}
        episodeId={currentEpisodeId}
        colors={supportUsSettings.colors}
      />

      {/* Video Ad Overlay */}
      {showVideoAd && currentVideoAd && (
        <VideoAdPlayer
          ad={currentVideoAd}
          onAdComplete={handleVideoAdComplete}
          onSkip={handleVideoAdSkip}
          onImpression={trackImpression}
          onClick={trackClick}
          canSkipImmediately={canSkipImmediately()}
        />
      )}

      {/* Episodes Button during Ad - Allow episode switching */}
      {showVideoAd && currentVideoAd && episodes && episodes.length > 0 && onEpisodeSelect && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-[60] h-10 w-10 bg-black/50 hover:bg-black/70 text-white border border-white/20 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            setShowEpisodesPanel(true);
          }}
        >
          <ListVideo className="h-5 w-5" />
        </Button>
      )}
    </div>
    {/* Close Android native wrapper */}
    </div>

    {paymentDialogs}
    </>
  );
};

export default VideoPlayer;
