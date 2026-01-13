/**
 * Immersive mode utilities for fullscreen video playback
 * Works with both Web Fullscreen API and Capacitor native
 * 
 * IMPORTANT: On Android, immersive mode and orientation lock can conflict.
 * This module sequences the operations correctly:
 * 1. First lock orientation
 * 2. Wait for orientation to settle
 * 3. Then enter immersive mode
 * 
 * APP-WIDE IMMERSIVE MODE:
 * The app runs in immersive mode by default (nav bar hidden, status bar visible)
 * Video fullscreen goes to FULL immersive (both bars hidden)
 */
import { Capacitor } from '@capacitor/core';
import { hideStatusBar, showStatusBar, enterImmersiveFullscreen, exitImmersiveFullscreen, enterAppImmersiveMode } from './useNativeStatusBar';

/**
 * Enter immersive fullscreen mode using Web Fullscreen API
 * This hides browser UI including address bar
 */
export async function enterImmersiveMode(element?: HTMLElement): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  // For native apps, use StatusBar plugin for true immersive mode
  if (isNative) {
    try {
      await enterImmersiveFullscreen();
    } catch (error) {
      console.log('[Immersive] Native immersive failed, using fallback:', error);
    }
  }
  
  // Also use Web Fullscreen API as it helps hide Android navigation bar
  try {
    const target = element || document.documentElement;
    
    if (target.requestFullscreen) {
      await target.requestFullscreen();
    } else if ((target as any).webkitRequestFullscreen) {
      await (target as any).webkitRequestFullscreen();
    } else if ((target as any).mozRequestFullScreen) {
      await (target as any).mozRequestFullScreen();
    } else if ((target as any).msRequestFullscreen) {
      await (target as any).msRequestFullscreen();
    }
    console.log('[Immersive] Entered immersive mode via Fullscreen API');
  } catch (error) {
    console.log('[Immersive] Fullscreen not supported or blocked:', error);
  }
}

/**
 * Exit immersive mode - returns to app-wide immersive mode (nav hidden, status visible)
 */
export async function exitImmersiveMode(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  // Exit web fullscreen first
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
    console.log('[Immersive] Exited web fullscreen');
  } catch (error) {
    console.log('[Immersive] Exit fullscreen failed:', error);
  }
  
  // Return to app-wide immersive mode (nav bar hidden, status bar visible)
  if (isNative) {
    try {
      await enterAppImmersiveMode();
    } catch (error) {
      console.log('[Immersive] Return to app immersive failed:', error);
    }
  }
}

/**
 * Check if currently in fullscreen/immersive mode
 */
export function isInImmersiveMode(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

/**
 * Combined function for video fullscreen:
 * Enters fullscreen with proper sequencing for all Android versions
 * Goes to FULL immersive mode (both status bar and nav bar hidden)
 * 
 * @param container - The container element to make fullscreen
 * @param onOrientationLocked - Callback to lock orientation BEFORE entering immersive mode
 */
export async function enterVideoFullscreen(
  container: HTMLElement,
  onOrientationLocked?: () => Promise<void>
): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // STEP 1: Lock orientation first (caller provides this)
    if (onOrientationLocked) {
      await onOrientationLocked();
      // Wait for orientation to fully settle
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // STEP 2: Enter FULL immersive mode (hide BOTH status bar AND nav bar)
    await enterImmersiveFullscreen();
    
    // STEP 3: Longer delay before fullscreen request to ensure immersive mode is active
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // STEP 3.5: Re-apply immersive mode (some devices need this after orientation change)
    await enterImmersiveFullscreen();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // STEP 4: Request fullscreen on container
  try {
    if (container.requestFullscreen) {
      // On some Android WebViews (older OEM builds like OPPO), passing navigationUI:'hide'
      // increases the chance the system navigation bar fully hides.
      const anyContainer = container as any;
      try {
        await anyContainer.requestFullscreen({ navigationUI: 'hide' });
      } catch {
        await container.requestFullscreen();
      }
    } else if ((container as any).webkitRequestFullscreen) {
      await (container as any).webkitRequestFullscreen();
    } else if ((container as any).mozRequestFullScreen) {
      await (container as any).mozRequestFullScreen();
    } else if ((container as any).msRequestFullScreen) {
      await (container as any).mozRequestFullScreen();
    } else if ((container as any).msRequestFullscreen) {
      await (container as any).msRequestFullscreen();
    }
    
    // STEP 5: Re-apply immersive mode after fullscreen request (critical for hiding status bar icons)
    if (isNative) {
      await new Promise(resolve => setTimeout(resolve, 100));
      await enterImmersiveFullscreen();
    }
    
    console.log('[Immersive] Video fullscreen entered successfully');
  } catch (error) {
    console.error('[Immersive] Failed to enter video fullscreen:', error);
    // Even if fullscreen fails, keep orientation locked for video viewing
  }
}

/**
 * Combined function for exiting video fullscreen:
 * Exits with proper sequencing for all Android versions
 * Returns to app-wide immersive mode (nav bar hidden, status bar visible)
 * 
 * @param onOrientationUnlocked - Callback to unlock/reset orientation AFTER exiting immersive mode
 */
export async function exitVideoFullscreen(
  onOrientationUnlocked?: () => Promise<void>
): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  // STEP 1: Exit fullscreen first
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
    }
  } catch (error) {
    console.log('[Immersive] Exit fullscreen error:', error);
  }
  
  if (isNative) {
    // STEP 2: Wait for fullscreen exit to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // STEP 3: Return to app-wide immersive mode (nav hidden, status visible)
    await enterAppImmersiveMode();
    
    // STEP 4: Reset orientation (caller provides this)
    if (onOrientationUnlocked) {
      await new Promise(resolve => setTimeout(resolve, 50));
      await onOrientationUnlocked();
    }
  }
  
  console.log('[Immersive] Video fullscreen exited successfully');
}
