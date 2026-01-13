import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { hideStatusBar, showStatusBar } from './useNativeStatusBar';
import { setGlobalFullscreenState } from './useFullscreenState';
import { lockToLandscape, lockToPortrait } from './useScreenOrientation';
import { enterVideoFullscreen, exitVideoFullscreen } from './useImmersiveMode';

interface UseIPadVideoFullscreenOptions {
  containerRef: RefObject<HTMLDivElement>;
  videoRef: RefObject<HTMLVideoElement>;
}

/**
 * Detect if we're running in a PWA (standalone mode) on iOS
 */
const isIOSPWA = (): boolean => {
  const isStandalone = (window.navigator as any).standalone === true;
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS && (isStandalone || isDisplayModeStandalone);
};

/**
 * Detect if we're on an iPad
 */
const isIPad = (): boolean => {
  return /iPad/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detect if we're on a mobile phone (not iPad/tablet)
 */
const isMobilePhone = (): boolean => {
  const isMobileUA = /iPhone|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isNotIPad = !isIPad();
  return isMobileUA && isNotIPad;
};

/**
 * PWA-compatible hook for video fullscreen
 * Uses Web Fullscreen API and Screen Orientation API
 * Enhanced for Android 14+ (API 34+) compatibility
 */
export function useIPadVideoFullscreen({ containerRef, videoRef }: UseIPadVideoFullscreenOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const playbackStateRef = useRef({ time: 0, wasPlaying: false, playbackRate: 1 });
  const fullscreenStylesRef = useRef<HTMLStyleElement | null>(null);
  const isFullscreenRef = useRef(false);

  // Keep ref in sync with state and update global fullscreen state
  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
    setGlobalFullscreenState(isFullscreen);
  }, [isFullscreen]);

  // Save current playback state without pausing video
  const savePlaybackState = useCallback(() => {
    if (videoRef.current) {
      playbackStateRef.current = {
        time: videoRef.current.currentTime,
        wasPlaying: !videoRef.current.paused,
        playbackRate: videoRef.current.playbackRate,
      };
    }
  }, [videoRef]);

  // Restore playback state after transition
  const restorePlaybackState = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const { time, wasPlaying, playbackRate } = playbackStateRef.current;
    video.playbackRate = playbackRate;

    if (time > 0 && Math.abs(video.currentTime - time) > 0.5) {
      video.currentTime = time;
    }

    if (wasPlaying && video.paused) {
      try {
        await video.play();
      } catch (e) {
        console.warn('Could not resume playback:', e);
      }
    }
  }, [videoRef]);

  // Ensure video keeps playing during transitions
  const ensurePlayback = useCallback(() => {
    const video = videoRef.current;
    if (video && playbackStateRef.current.wasPlaying && video.paused) {
      video.play().catch(e => console.log('Resume play during transition:', e));
    }
  }, [videoRef]);

  // Maintain playback during device rotation
  const maintainPlaybackDuringRotation = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    savePlaybackState();
    
    const intervalId = setInterval(ensurePlayback, 50);
    
    setTimeout(() => {
      clearInterval(intervalId);
      ensurePlayback();
    }, 500);
  }, [videoRef, savePlaybackState, ensurePlayback]);

  // Apply CSS-based fullscreen for PWA mode
  const applyPWAFullscreenStyles = useCallback((entering: boolean) => {
    const container = containerRef.current;
    if (!container) return;

    if (entering) {
      const style = document.createElement('style');
      style.id = 'video-fullscreen-styles';
      
      style.textContent = `
        /* Fullscreen container - fixed position, fills entire screen */
        .video-fullscreen-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          width: 100dvw !important;
          height: 100vh !important;
          height: 100dvh !important;
          z-index: 99999 !important;
          background: black !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          /* CRITICAL: Allow touch/pointer events for controls */
          touch-action: manipulation !important;
        }

        /* Video element - contain within screen bounds, never overflow */
        .video-fullscreen-container video {
          width: 100% !important;
          height: 100% !important;
          max-width: 100vw !important;
          max-width: 100dvw !important;
          max-height: 100vh !important;
          max-height: 100dvh !important;
          object-fit: contain !important;
          /* Allow pinch-to-zoom touch events */
          touch-action: pinch-zoom pan-x pan-y !important;
        }
        
        /* Native app landscape fullscreen - critical sizing fix */
        @media screen and (orientation: landscape) {
          .video-fullscreen-container {
            width: 100vw !important;
            width: 100dvw !important;
            height: 100vh !important;
            height: 100dvh !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .video-fullscreen-container video {
            width: 100% !important;
            height: 100% !important;
            max-width: 100vw !important;
            max-width: 100dvw !important;
            max-height: 100vh !important;
            max-height: 100dvh !important;
            object-fit: contain !important;
          }
        }
        
        /* iPad/Tablet specific - ensure video fits within screen bounds */
        @media screen and (min-width: 768px) {
          .video-fullscreen-container video {
            object-fit: contain !important;
            max-height: 100vh !important;
            max-height: 100dvh !important;
            max-width: 100vw !important;
            max-width: 100dvw !important;
          }
        }

        /* Body in fullscreen mode - prevent scrolling but ALLOW touch events */
        body.video-fullscreen-active {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          /* CRITICAL: Use 'manipulation' instead of 'none' to allow taps/clicks */
          touch-action: manipulation !important;
        }

        .video-fullscreen-container .video-controls {
          z-index: 100000 !important;
          /* Ensure controls receive pointer events */
          pointer-events: auto !important;
          /* CRITICAL for Android: position context for z-index */
          position: absolute !important;
        }
        
        /* Ensure the inner controls wrapper is also clickable */
        .video-fullscreen-container .video-controls > div {
          pointer-events: auto !important;
          position: relative !important;
          z-index: 100001 !important;
        }
        
        /* Ensure all buttons in fullscreen are tappable - higher specificity */
        .video-fullscreen-container button,
        .video-fullscreen-container [role="button"],
        .video-fullscreen-container .video-controls button {
          pointer-events: auto !important;
          touch-action: manipulation !important;
          z-index: 100002 !important;
          position: relative !important;
          /* Ensure minimum tap target size for Android */
          min-width: 44px !important;
          min-height: 44px !important;
        }
        
        /* Ensure slider/progress bar is interactive */
        .video-fullscreen-container input[type="range"],
        .video-fullscreen-container [role="slider"] {
          pointer-events: auto !important;
          touch-action: manipulation !important;
          z-index: 100002 !important;
        }
        
        body.video-fullscreen-active nav,
        body.video-fullscreen-active [data-bottom-nav],
        body.video-fullscreen-active .bottom-nav,
        body.video-fullscreen-active footer,
        body.video-fullscreen-active header {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      fullscreenStylesRef.current = style;

      document.body.classList.add('video-fullscreen-active');
      container.classList.add('video-fullscreen-container');
    } else {
      if (fullscreenStylesRef.current) {
        fullscreenStylesRef.current.remove();
        fullscreenStylesRef.current = null;
      }

      document.body.classList.remove('video-fullscreen-active');
      container.classList.remove('video-fullscreen-container');
    }
  }, [containerRef]);

  // Toggle fullscreen with proper handling for different platforms
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || isTransitioning) return;

    setIsTransitioning(true);
    savePlaybackState();

    const isPWA = isIOSPWA();
    const isPadDevice = isIPad();
    const isMobile = isMobilePhone();
    const isNative = Capacitor.isNativePlatform();

    const ensurePlaybackDuringTransition = () => {
      if (video && playbackStateRef.current.wasPlaying && video.paused) {
        video.play().catch(e => console.log('Resume play during transition:', e));
      }
    };

    const playbackGuardInterval = setInterval(ensurePlaybackDuringTransition, 50);
    
    const cleanupGuard = () => {
      setTimeout(() => {
        clearInterval(playbackGuardInterval);
        ensurePlaybackDuringTransition();
      }, 500);
    };

    try {
      if (!isFullscreen) {
        // ENTERING FULLSCREEN
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', '#000000');
        }

        // Native app: on Android devices (including OPPO A57) we MUST use the Web Fullscreen API
        // to reliably hide the *system* navigation bar. We also keep the existing CSS fullscreen
        // styles to hide app UI layers (header/bottom nav).
        if (isNative) {
          console.log('[iPadFS] Native fullscreen entry (fullscreen API + CSS)');

          await enterVideoFullscreen(container, async () => {
            await lockToLandscape();
          });

          // Some OEM Android builds apply the orientation *after* the fullscreen transition.
          // Do a second lock attempt to make landscape fullscreen much more reliable.
          await new Promise(resolve => setTimeout(resolve, 150));
          await lockToLandscape();
          
          // Re-apply immersive mode after orientation is stable (critical for hiding notification icons)
          await hideStatusBar();
          await new Promise(resolve => setTimeout(resolve, 50));
          await hideStatusBar();

          // Hide app UI chrome (BottomNav/Header) even if the device still shows system bars.
          applyPWAFullscreenStyles(true);

          setIsFullscreen(true);
          await restorePlaybackState();
          cleanupGuard();
        } else if (isMobile && !isPWA) {
          // Mobile web browser: try native fullscreen + orientation lock
          try {
            if (container.requestFullscreen) {
              await container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
              await (container as any).webkitRequestFullscreen();
            }
            
            // Try to lock to landscape (Web API)
            await lockToLandscape();
            
            setIsFullscreen(true);
            cleanupGuard();
          } catch (e) {
            console.error('Fullscreen error:', e);
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
          }
        } else if (isPWA || isPadDevice) {
          // iPad PWA: CSS-based fullscreen
          applyPWAFullscreenStyles(true);
          setIsFullscreen(true);
          await restorePlaybackState();
          cleanupGuard();
        } else {
          // Desktop browser: native fullscreen
          try {
            if (container.requestFullscreen) {
              await container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
              await (container as any).webkitRequestFullscreen();
            }
            
            setIsFullscreen(true);
            cleanupGuard();
          } catch (e) {
            console.error('Fullscreen error:', e);
            applyPWAFullscreenStyles(true);
            setIsFullscreen(true);
          }
        }
      } else {
        // EXITING FULLSCREEN
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
          const isDarkMode = document.documentElement.classList.contains('dark') || 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
          themeColorMeta.setAttribute('content', isDarkMode ? '#0f1419' : '#ffffff');
        }

        // Native app: exit using proper sequencing + exit fullscreen API
        if (isNative) {
          console.log('[iPadFS] Native fullscreen exit (fullscreen API + CSS)');

          // Remove app UI hiding first, then exit fullscreen and restore portrait.
          applyPWAFullscreenStyles(false);

          await exitVideoFullscreen(async () => {
            await lockToPortrait();
          });

          setIsFullscreen(false);
          await restorePlaybackState();
          cleanupGuard();
        } else if (container.classList.contains('video-fullscreen-container')) {
          applyPWAFullscreenStyles(false);
          setIsFullscreen(false);
          await lockToPortrait();
          await restorePlaybackState();
          cleanupGuard();
        } else {
          try {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            }
            
            await lockToPortrait();
            cleanupGuard();
          } catch (e) {
            console.error('Exit fullscreen error:', e);
          }
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
      applyPWAFullscreenStyles(false);
      setIsFullscreen(false);
      clearInterval(playbackGuardInterval);
    } finally {
      setIsTransitioning(false);
    }
  }, [isFullscreen, isTransitioning, containerRef, videoRef, savePlaybackState, restorePlaybackState, applyPWAFullscreenStyles]);

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      if (!containerRef.current?.classList.contains('video-fullscreen-container')) {
        setIsFullscreen(isNativeFS);
        
        if (isNativeFS) {
          hideStatusBar();
        } else {
          showStatusBar();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [containerRef]);

  // Periodically re-enforce immersive mode on Android when in fullscreen
  // This handles edge cases where system UI briefly appears (e.g., after touch events)
  useEffect(() => {
    const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (!isFullscreen || !isAndroidNative) {
      return;
    }

    // Enforce immersive mode every 1s while in fullscreen
    const enforceInterval = setInterval(() => {
      if (isFullscreenRef.current) {
        hideStatusBar();
      }
    }, 1000);

    // Also enforce on any touch/pointer interaction (first tap often reveals system bars)
    const el = containerRef.current;
    const handleAnyInteraction = () => {
      if (isFullscreenRef.current) {
        hideStatusBar();
      }
    };

    el?.addEventListener('pointerdown', handleAnyInteraction, { capture: true });
    el?.addEventListener('touchstart', handleAnyInteraction, { capture: true, passive: true } as any);

    // Also enforce on visibility change (when app comes back to foreground)
    const handleVisibilityChange = () => {
      if (!document.hidden && isFullscreenRef.current) {
        hideStatusBar();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(enforceInterval);
      el?.removeEventListener('pointerdown', handleAnyInteraction, { capture: true } as any);
      el?.removeEventListener('touchstart', handleAnyInteraction, { capture: true } as any);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFullscreen, containerRef]);

  // Android hardware back button: exit fullscreen instead of leaving the page
  useEffect(() => {
    const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (!isAndroidNative) return;

    const sub = App.addListener('backButton', () => {
      if (isFullscreenRef.current) {
        // Exit fullscreen and return to portrait
        toggleFullscreen();
      }
    });

    return () => {
      sub.remove();
    };
  }, [toggleFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fullscreenStylesRef.current) {
        fullscreenStylesRef.current.remove();
      }
      document.body.classList.remove('video-fullscreen-active');
    };
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    isTransitioning,
    maintainPlaybackDuringRotation,
  };
}
