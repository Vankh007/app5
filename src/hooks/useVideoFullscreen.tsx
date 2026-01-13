import { useState, useCallback, useEffect, RefObject, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { hideStatusBar, showStatusBar } from './useNativeStatusBar';
import { lockToLandscape, lockToPortrait } from './useScreenOrientation';

interface UseVideoFullscreenOptions {
  containerRef: RefObject<HTMLDivElement>;
  videoRef: RefObject<HTMLVideoElement>;
}

/**
 * Hook to manage video fullscreen with native orientation and status bar control
 * - Enters landscape mode when going fullscreen
 * - Hides status bar and navigation bar in fullscreen
 * - Returns to portrait and shows bars when exiting fullscreen
 * - Preserves video playback state during orientation changes
 * - Works correctly on ALL Android versions (including older devices like OPP A57)
 * 
 * CRITICAL SEQUENCING:
 * - Enter: Lock orientation FIRST -> wait -> hide bars
 * - Exit: Show bars FIRST -> wait -> change orientation
 */
export function useVideoFullscreen({ containerRef, videoRef }: UseVideoFullscreenOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const transitionInProgressRef = useRef(false);
  const playbackStateRef = useRef({ time: 0, wasPlaying: false });

  // Save playback state before any fullscreen/orientation change
  const savePlaybackState = useCallback(() => {
    if (videoRef.current) {
      playbackStateRef.current = {
        time: videoRef.current.currentTime,
        wasPlaying: !videoRef.current.paused
      };
    }
  }, [videoRef]);

  // Restore playback state after fullscreen/orientation change
  const restorePlaybackState = useCallback(async () => {
    const { time, wasPlaying } = playbackStateRef.current;
    if (videoRef.current && time > 0) {
      // Wait for video to be ready
      const waitForReady = () => new Promise<void>((resolve) => {
        if (videoRef.current!.readyState >= 2) {
          resolve();
        } else {
          videoRef.current!.addEventListener('canplay', () => resolve(), { once: true });
        }
      });

      try {
        await waitForReady();
        if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
          videoRef.current.currentTime = time;
        }
        if (wasPlaying && videoRef.current.paused) {
          await videoRef.current.play();
        }
      } catch (e) {
        console.warn('Could not restore playback state:', e);
      }
    }
  }, [videoRef]);

  // Handle fullscreen change events from browser/system
  useEffect(() => {
    const handleFullscreenChange = async () => {
      if (transitionInProgressRef.current) return;
      
      const isFS = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullscreen(isFS);

      // Handle native platform fullscreen state changes with proper sequencing
      if (Capacitor.isNativePlatform()) {
        transitionInProgressRef.current = true;
        
        // Save state before any changes
        savePlaybackState();
        
        try {
          if (isFS) {
            // ENTERING FULLSCREEN: orientation first, then hide bars
            await lockToLandscape();
            await new Promise(resolve => setTimeout(resolve, 150)); // Wait for orientation
            await hideStatusBar();
          } else {
            // EXITING FULLSCREEN: show bars first, then change orientation
            await showStatusBar();
            await new Promise(resolve => setTimeout(resolve, 100));
            await lockToPortrait();
          }
          
          // Restore playback after orientation settles
          await new Promise(resolve => setTimeout(resolve, 100));
          await restorePlaybackState();
        } catch (error) {
          console.error('Failed to handle fullscreen change:', error);
        } finally {
          transitionInProgressRef.current = false;
        }
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [savePlaybackState, restorePlaybackState]);

  // Handle native orientation change events (from useScreenOrientation)
  useEffect(() => {
    const handleNativeOrientationChange = () => {
      // Save playback state when native orientation changes
      savePlaybackState();
      // Restore after a short delay for the orientation to settle
      setTimeout(() => restorePlaybackState(), 150);
    };

    window.addEventListener('native-orientation-change', handleNativeOrientationChange as EventListener);
    return () => {
      window.removeEventListener('native-orientation-change', handleNativeOrientationChange as EventListener);
    };
  }, [savePlaybackState, restorePlaybackState]);

  // Cleanup on unmount - ensure we're back to portrait mode
  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform() && isFullscreen) {
        showStatusBar().catch(console.error);
        lockToPortrait().catch(console.error);
      }
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;
    
    // Prevent rapid toggling
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    
    // Save playback state before any changes
    savePlaybackState();
    
    try {
      if (!isFullscreen) {
        // Enter fullscreen with proper sequencing
        if (Capacitor.isNativePlatform()) {
          // Step 1: Lock to landscape FIRST
          await lockToLandscape();
          // Step 2: Wait for orientation to settle (critical for older Android)
          await new Promise(resolve => setTimeout(resolve, 150));
          // Step 3: Hide status bar after orientation is stable
          await hideStatusBar();
        }
        
        // Request fullscreen on container
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        } else if (video && (video as any).webkitEnterFullscreen) {
          // iOS Safari fallback
          await (video as any).webkitEnterFullscreen();
        }
        
        // Set fullscreen state immediately for native
        if (Capacitor.isNativePlatform()) {
          setIsFullscreen(true);
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else if (video && (video as any).webkitExitFullscreen) {
          await (video as any).webkitExitFullscreen();
        }
        
        // On native, exit with proper sequencing
        if (Capacitor.isNativePlatform()) {
          // Step 1: Show status bar FIRST
          await showStatusBar();
          // Step 2: Wait before changing orientation
          await new Promise(resolve => setTimeout(resolve, 100));
          // Step 3: Return to portrait
          await lockToPortrait();
          setIsFullscreen(false);
        }
      }
      
      // Restore playback after transition settles
      await new Promise(resolve => setTimeout(resolve, 150));
      await restorePlaybackState();
    } catch (error) {
      console.error('Fullscreen toggle error:', error);
      // Try to recover to portrait mode on error
      if (Capacitor.isNativePlatform()) {
        await showStatusBar().catch(console.error);
        await lockToPortrait().catch(console.error);
      }
    } finally {
      transitionInProgressRef.current = false;
    }
  }, [isFullscreen, containerRef, videoRef, savePlaybackState, restorePlaybackState]);

  return {
    isFullscreen,
    toggleFullscreen
  };
}
