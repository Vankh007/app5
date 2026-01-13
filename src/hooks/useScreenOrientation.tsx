import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation, OrientationLockType } from '@capacitor/screen-orientation';

/**
 * Get Android API level (returns 0 for non-Android or unknown)
 */
const getAndroidApiLevel = (): number => {
  const userAgent = navigator.userAgent;
  const match = userAgent.match(/Android\s+(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
};

/**
 * Check if running on Android 14+ (API 34+)
 */
const isAndroid14Plus = (): boolean => {
  return getAndroidApiLevel() >= 14;
};

/**
 * Force unlock and small delay before locking.
 *
 * NOTE: Some OEM Android builds (e.g. ColorOS/OPPO) can ignore a lock() call if the
 * orientation was previously locked. Unlocking first makes landscape fullscreen
 * much more reliable.
 */
const unlockBeforeLock = async (delayMs: number = 100): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    await ScreenOrientation.unlock();
    // Delay to let the system process the unlock
    await new Promise(resolve => setTimeout(resolve, delayMs));
  } catch (e) {
    console.log('[Orientation] Unlock before lock failed:', e);
  }
};

/**
 * Lock screen to portrait orientation (native only)
 * Enhanced for Android 14+ (API 34+) compatibility + OEM Android reliability.
 */
export const lockToPortrait = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Try Web API as fallback
    try {
      const orientation = screen.orientation as any;
      if (orientation && orientation.lock) {
        await orientation.lock('portrait');
        console.log('[Orientation] Web API locked to portrait');
        return true;
      }
    } catch (e) {
      console.log('[Orientation] Web portrait lock not supported');
    }
    return false;
  }

  const isAndroidNative = Capacitor.getPlatform() === 'android';
  const isModernAndroid = isAndroid14Plus();
  console.log('[Orientation] Locking to portrait, Android:', isAndroidNative, 'Android 14+:', isModernAndroid);

  // On Android (including some older OEM builds), unlock first before locking.
  if (isAndroidNative) {
    await unlockBeforeLock(100);
  }

  const orientationsToTry: OrientationLockType[] = isAndroidNative
    ? ['portrait-primary', 'portrait', 'portrait-secondary']
    : ['portrait', 'portrait-primary'];

  for (const orientation of orientationsToTry) {
    try {
      await ScreenOrientation.lock({ orientation });
      console.log(`[Orientation] Locked to ${orientation}`);

      // Verify on Android (some devices report success but don't rotate)
      if (isAndroidNative) {
        await new Promise(resolve => setTimeout(resolve, 120));
        const current = await ScreenOrientation.orientation();
        if (current.type.includes('portrait')) {
          console.log('[Orientation] Verified portrait orientation:', current.type);
          return true;
        }
        console.log('[Orientation] Portrait not applied, trying next...');
        continue;
      }

      return true;
    } catch (error) {
      console.log(`[Orientation] ${orientation} lock failed:`, error);
    }
  }

  console.log('[Orientation] All portrait locks failed');
  return false;
};

/**
 * Lock screen to landscape orientation (native only)
 * Enhanced for Android 14+ (API 34+) compatibility + OEM Android reliability.
 */
export const lockToLandscape = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Try Web API as fallback
    try {
      const orientation = screen.orientation as any;
      if (orientation && orientation.lock) {
        await orientation.lock('landscape');
        console.log('[Orientation] Web API locked to landscape');
        return true;
      }
    } catch (e) {
      console.log('[Orientation] Web landscape lock not supported');
    }
    return false;
  }

  const isAndroidNative = Capacitor.getPlatform() === 'android';
  const isModernAndroid = isAndroid14Plus();
  console.log('[Orientation] Locking to landscape, Android:', isAndroidNative, 'Android 14+:', isModernAndroid);

  // On Android (including some older OEM builds), unlock first before locking.
  if (isAndroidNative) {
    await unlockBeforeLock(120);
  }

  const orientationsToTry: OrientationLockType[] = isAndroidNative
    ? ['landscape-primary', 'landscape-secondary', 'landscape']
    : ['landscape', 'landscape-primary', 'landscape-secondary'];

  for (const orientation of orientationsToTry) {
    try {
      await ScreenOrientation.lock({ orientation });
      console.log(`[Orientation] Locked to ${orientation}`);

      // Verify on Android (some devices report success but don't rotate)
      if (isAndroidNative) {
        await new Promise(resolve => setTimeout(resolve, 150));
        const current = await ScreenOrientation.orientation();
        if (current.type.includes('landscape')) {
          console.log('[Orientation] Verified landscape orientation:', current.type);
          return true;
        }
        console.log('[Orientation] Landscape not applied, trying next...');
        continue;
      }

      return true;
    } catch (error) {
      console.log(`[Orientation] ${orientation} lock failed:`, error);
    }
  }

  // Last resort on Android: Try setting to 'any' then immediately to landscape-primary
  if (isAndroidNative) {
    try {
      console.log('[Orientation] Trying any->landscape-primary workaround');
      await ScreenOrientation.lock({ orientation: 'any' });
      await new Promise(resolve => setTimeout(resolve, 120));
      await ScreenOrientation.lock({ orientation: 'landscape-primary' });
      await new Promise(resolve => setTimeout(resolve, 150));
      const current = await ScreenOrientation.orientation();
      if (current.type.includes('landscape')) {
        console.log('[Orientation] Workaround succeeded');
        return true;
      }
    } catch (e) {
      console.log('[Orientation] Workaround failed:', e);
    }
  }

  console.log('[Orientation] All landscape locks failed');
  return false;
};

/**
 * Unlock screen orientation (allow all orientations)
 */
export const unlockOrientation = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Try Web API as fallback
    try {
      const orientation = screen.orientation as any;
      if (orientation && orientation.unlock) {
        orientation.unlock();
        console.log('[Orientation] Web API unlocked');
        return true;
      }
    } catch (e) {
      console.log('[Orientation] Web unlock not supported');
    }
    return false;
  }
  
  try {
    await ScreenOrientation.unlock();
    console.log('[Orientation] Unlocked');
    return true;
  } catch (error) {
    console.log('[Orientation] Unlock failed:', error);
    return false;
  }
};

/**
 * Get current orientation
 */
export const getCurrentOrientation = async (): Promise<string> => {
  if (!Capacitor.isNativePlatform()) {
    return screen.orientation?.type || 'unknown';
  }
  
  try {
    const result = await ScreenOrientation.orientation();
    return result.type;
  } catch (error) {
    return 'unknown';
  }
};

/**
 * Hook for managing screen orientation
 * @param allowLandscape - If true, allows landscape orientation; if false, locks to portrait
 */
export function useScreenOrientation(allowLandscape: boolean = false) {
  const isInitializedRef = useRef(false);
  const orientationListenerRef = useRef<any>(null);
  
  const handleOrientationChange = useCallback(async () => {
    const currentOrientation = await getCurrentOrientation();
    window.dispatchEvent(new CustomEvent('native-orientation-change', { 
      detail: { orientation: currentOrientation }
    }));
  }, []);
  
  useEffect(() => {
    const setup = async () => {
      if (isInitializedRef.current) {
        // Handle orientation change on prop update
        if (allowLandscape) {
          await unlockOrientation();
        } else {
          await lockToPortrait();
        }
        return;
      }
      
      isInitializedRef.current = true;
      
      // Initial orientation setup
      if (!allowLandscape) {
        await lockToPortrait();
      }
      
      // Listen for orientation changes on native
      if (Capacitor.isNativePlatform()) {
        try {
          orientationListenerRef.current = await ScreenOrientation.addListener(
            'screenOrientationChange',
            handleOrientationChange
          );
        } catch (error) {
          console.log('[Orientation] Listener setup failed:', error);
        }
      } else {
        // Web fallback
        screen.orientation?.addEventListener('change', handleOrientationChange);
      }
    };
    
    setup();
    
    return () => {
      isInitializedRef.current = false;
      
      if (Capacitor.isNativePlatform()) {
        orientationListenerRef.current?.remove?.();
      } else {
        screen.orientation?.removeEventListener('change', handleOrientationChange);
      }
    };
  }, [allowLandscape, handleOrientationChange]);
  
  return {
    lockToPortrait,
    lockToLandscape,
    unlock: unlockOrientation,
    getCurrentOrientation,
  };
}
