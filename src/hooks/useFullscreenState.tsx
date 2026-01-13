import { useState, useEffect, useCallback } from 'react';
import { lockToLandscape, unlockOrientation } from './useScreenOrientation';
import { enterImmersiveMode, exitImmersiveMode } from './useImmersiveMode';
import { Capacitor } from '@capacitor/core';

// Global fullscreen state management for PWA
let globalIsFullscreen = false;
const listeners = new Set<(isFullscreen: boolean) => void>();

export function getGlobalFullscreenState(): boolean {
  return globalIsFullscreen;
}

export function setGlobalFullscreenState(value: boolean): void {
  globalIsFullscreen = value;
  listeners.forEach(listener => listener(value));
  
  // Update body class for CSS targeting
  if (Capacitor.isNativePlatform()) {
    if (value) {
      document.body.classList.add('native-video-fullscreen');
    } else {
      document.body.classList.remove('native-video-fullscreen');
    }
  }
}

/**
 * Hook to subscribe to global fullscreen state changes
 */
export function useFullscreenState(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(globalIsFullscreen);

  useEffect(() => {
    const listener = (newValue: boolean) => setIsFullscreen(newValue);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return isFullscreen;
}

/**
 * PWA-compatible hook to handle fullscreen for video/iframe embeds
 * Uses Web Fullscreen API and Screen Orientation API
 */
export function useIframeFullscreenHandler() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleEnterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    setGlobalFullscreenState(true);
    
    // Try to lock to landscape for video viewing
    await lockToLandscape();
    
    console.log('[PWA] Fullscreen entered');
  }, []);

  const handleExitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    setGlobalFullscreenState(false);
    
    // Unlock orientation when exiting fullscreen
    await unlockOrientation();
    
    console.log('[PWA] Fullscreen exited');
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      
      if (isInFullscreen) {
        handleEnterFullscreen();
      } else {
        handleExitFullscreen();
      }
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [handleEnterFullscreen, handleExitFullscreen]);

  return isFullscreen;
}

/**
 * Toggle fullscreen for a given element
 */
export async function toggleFullscreen(element?: HTMLElement): Promise<boolean> {
  const target = element || document.documentElement;
  
  const isCurrentlyFullscreen = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement
  );

  try {
    if (isCurrentlyFullscreen) {
      await exitImmersiveMode();
      return false;
    } else {
      await enterImmersiveMode(target);
      return true;
    }
  } catch (error) {
    console.log('Fullscreen toggle failed:', error);
    return isCurrentlyFullscreen;
  }
}
