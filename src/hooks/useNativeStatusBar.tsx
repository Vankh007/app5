/**
 * Native Status Bar and Navigation Bar utilities
 * Uses Capacitor StatusBar plugin for Android/iOS
 * Uses @boengli/capacitor-fullscreen for true Android immersive mode
 * 
 * OPPO A57 and similar devices: Enables edge-to-edge immersive display
 * with transparent status bar and hidden navigation bar
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Dynamic import for the fullscreen plugin (Android only)
let FullscreenPlugin: any = null;

const loadFullscreenPlugin = async () => {
  if (Capacitor.getPlatform() === 'android' && !FullscreenPlugin) {
    try {
      const module = await import('@boengli/capacitor-fullscreen');
      FullscreenPlugin = module.Fullscreen;
      console.log('[StatusBar] Fullscreen plugin loaded');
    } catch (error) {
      console.log('[StatusBar] Fullscreen plugin not available:', error);
    }
  }
  return FullscreenPlugin;
};

/**
 * Check if running on a native platform
 */
const isNative = () => Capacitor.isNativePlatform();

/**
 * Initialize edge-to-edge display mode
 * Makes content draw behind the status bar with transparent background
 */
export async function initEdgeToEdge(): Promise<void> {
  if (!isNative()) return;

  try {
    // Set status bar to overlay mode (content draws behind it)
    await StatusBar.setOverlaysWebView({ overlay: true });
    
    // Make status bar background transparent
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    }
    
    // Set light style for dark backgrounds (white icons)
    await StatusBar.setStyle({ style: Style.Dark });
    
    console.log('[StatusBar] Edge-to-edge mode initialized');
  } catch (error) {
    console.log('[StatusBar] Failed to init edge-to-edge:', error);
  }
}

/**
 * Enter app-wide immersive mode - hides navigation bar, keeps status bar visible
 * Content fills entire screen including area behind status bar
 * Navigation bar is completely hidden for immersive experience
 */
export async function enterAppImmersiveMode(): Promise<void> {
  if (!isNative()) return;

  try {
    if (Capacitor.getPlatform() === 'android') {
      const Fullscreen = await loadFullscreenPlugin();
      if (Fullscreen) {
        try {
          // Enter immersive mode to hide navigation bar
          Fullscreen.activateImmersiveMode();
          console.log('[StatusBar] App immersive mode activated - nav bar hidden');
        } catch (e) {
          console.log('[StatusBar] Immersive mode activation failed:', e);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Keep status bar visible but overlaying content
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#00000000' });
    }
    await StatusBar.show();
    
  } catch (error) {
    console.log('[StatusBar] Failed to enter app immersive mode:', error);
  }
}

/**
 * Enter immersive/fullscreen mode - hides both status bar and navigation bar
 * Uses @boengli/capacitor-fullscreen for true Android immersive mode
 * This is compatible with screen rotation on Android (including OPPO devices)
 */
export async function enterImmersiveFullscreen(): Promise<void> {
  if (!isNative()) return;

  try {
    // On Android, use the fullscreen plugin for true immersive mode
    if (Capacitor.getPlatform() === 'android') {
      const Fullscreen = await loadFullscreenPlugin();
      if (Fullscreen) {
        // The plugin doesn't return proper promises - wrap in try/catch and don't await
        try {
          // First deactivate to ensure clean state
          Fullscreen.deactivateImmersiveMode();
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Then activate immersive mode - this should hide ALL system bars
          Fullscreen.activateImmersiveMode();
          console.log('[StatusBar] Entered immersive mode via fullscreen plugin');
        } catch (e) {
          console.log('[StatusBar] Fullscreen plugin call failed:', e);
        }
        // Longer delay to let native side fully process
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Double-tap the immersive mode to ensure it sticks on stubborn devices
        try {
          Fullscreen.activateImmersiveMode();
        } catch (e) {
          // Ignore
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Also hide status bar for true fullscreen
    await StatusBar.hide();
    
    // On Android, set overlay mode to ensure content fills behind status bar area
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
    
    console.log('[StatusBar] Entered immersive mode - status bar hidden');
  } catch (error) {
    console.log('[StatusBar] Failed to enter immersive mode:', error);
  }
}

/**
 * Exit immersive mode - shows status bar and navigation bar
 * Restores edge-to-edge transparent status bar mode
 */
export async function exitImmersiveFullscreen(): Promise<void> {
  if (!isNative()) return;

  try {
    // On Android, use the fullscreen plugin to exit immersive mode
    if (Capacitor.getPlatform() === 'android') {
      const Fullscreen = await loadFullscreenPlugin();
      if (Fullscreen) {
        // The plugin doesn't return proper promises - don't await
        try {
          Fullscreen.deactivateImmersiveMode();
          console.log('[StatusBar] Exited immersive mode via fullscreen plugin');
        } catch (e) {
          console.log('[StatusBar] Fullscreen plugin exit call failed:', e);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-enter app immersive mode (nav bar hidden, status bar visible)
        await enterAppImmersiveMode();
        return;
      }
    }

    // Fallback: show status bar
    await StatusBar.show();
    console.log('[StatusBar] Exited immersive mode - status bar shown');
  } catch (error) {
    console.log('[StatusBar] Failed to exit immersive mode:', error);
  }
}

/**
 * Hide status bar only (navigation bar remains visible)
 */
export async function hideStatusBar(): Promise<void> {
  if (!isNative()) return;

  try {
    // On Android, prefer true immersive mode to also hide navigation bar
    if (Capacitor.getPlatform() === 'android') {
      const Fullscreen = await loadFullscreenPlugin();
      if (Fullscreen) {
        try {
          Fullscreen.activateImmersiveMode();
          console.log('[StatusBar] Activated immersive mode (hides all system bars)');
        } catch (e) {
          console.log('[StatusBar] Immersive mode call failed:', e);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        return;
      }
    }

    await StatusBar.hide();
    console.log('[StatusBar] Status bar hidden');
  } catch (error) {
    console.log('[StatusBar] Failed to hide status bar:', error);
  }
}

/**
 * Show status bar with edge-to-edge transparent mode
 */
export async function showStatusBar(): Promise<void> {
  if (!isNative()) return;

  try {
    // On Android, exit immersive mode to show all system bars
    if (Capacitor.getPlatform() === 'android') {
      const Fullscreen = await loadFullscreenPlugin();
      if (Fullscreen) {
        try {
          Fullscreen.deactivateImmersiveMode();
          console.log('[StatusBar] Deactivated immersive mode (shows all system bars)');
        } catch (e) {
          console.log('[StatusBar] Deactivate immersive call failed:', e);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Restore edge-to-edge transparent status bar
        await initEdgeToEdge();
        return;
      }
    }

    await StatusBar.show();
    console.log('[StatusBar] Status bar shown');
  } catch (error) {
    console.log('[StatusBar] Failed to show status bar:', error);
  }
}

/**
 * Set status bar overlay mode (whether content goes behind status bar)
 */
export async function setStatusBarOverlay(overlay: boolean): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay });
    console.log(`[StatusBar] Overlay mode set to: ${overlay}`);
  } catch (error) {
    console.log('[StatusBar] Failed to set overlay mode:', error);
  }
}

/**
 * Set status bar style (light or dark icons)
 */
export async function setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({
      style: style === 'light' ? Style.Light : Style.Dark
    });
    console.log(`[StatusBar] Style set to: ${style}`);
  } catch (error) {
    console.log('[StatusBar] Failed to set style:', error);
  }
}

/**
 * Set status bar background color (Android only)
 */
export async function setStatusBarBackgroundColor(color: string): Promise<void> {
  if (!isNative() || Capacitor.getPlatform() !== 'android') return;

  try {
    await StatusBar.setBackgroundColor({ color });
    console.log(`[StatusBar] Background color set to: ${color}`);
  } catch (error) {
    console.log('[StatusBar] Failed to set background color:', error);
  }
}

/**
 * Hook for managing status bar appearance
 * Initializes app-wide immersive mode (nav bar hidden) on native platforms
 * Watch page in portrait mode: shows status bar, content below it
 * Fullscreen video: completely hidden status bar and nav bar
 */
export function useNativeStatusBar() {
  const location = useLocation();
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const isWatchPage = /^\/watch(\/|$)/.test(location.pathname);
    
    // Enter app-wide immersive mode on init (nav bar hidden, status bar visible)
    // This makes content fill entire screen including behind status bar
    enterAppImmersiveMode();
    
    console.log('[StatusBar] Initialized for path:', location.pathname, 'isWatchPage:', isWatchPage);
  }, [location.pathname]);
}
