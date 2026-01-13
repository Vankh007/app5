import { useCallback, useEffect, useRef } from 'react';

interface WatchProgress {
  time: number;
  duration: number;
  timestamp: number;
}

interface UseVideoResumeOptions {
  contentId?: string;
  episodeId?: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  /**
   * Minimum percentage watched before saving progress (default: 1%)
   */
  minProgressPercent?: number;
  /**
   * Maximum percentage after which progress is cleared (completed) (default: 95%)
   */
  maxProgressPercent?: number;
  /**
   * How often to save progress in ms (default: 5000ms = 5 seconds)
   */
  saveInterval?: number;
}

const STORAGE_KEY_PREFIX = 'video-resume-';

/**
 * Hook to save and restore video playback position for resume functionality.
 * Stores progress in localStorage for cross-session persistence.
 */
export function useVideoResume({
  contentId,
  episodeId,
  videoRef,
  minProgressPercent = 1,
  maxProgressPercent = 95,
  saveInterval = 5000,
}: UseVideoResumeOptions) {
  const lastSaveTime = useRef(0);
  const hasRestoredRef = useRef(false);

  // Generate a unique key for this content/episode
  const storageKey = `${STORAGE_KEY_PREFIX}${contentId || 'unknown'}-${episodeId || 'movie'}`;

  /**
   * Save current playback position
   */
  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || video.duration === 0) return;

    const currentPercent = (video.currentTime / video.duration) * 100;

    // Don't save if video just started or is almost finished
    if (currentPercent < minProgressPercent) return;
    
    // Clear progress if video is essentially complete
    if (currentPercent >= maxProgressPercent) {
      localStorage.removeItem(storageKey);
      return;
    }

    // Throttle saves
    const now = Date.now();
    if (now - lastSaveTime.current < saveInterval) return;
    lastSaveTime.current = now;

    const progress: WatchProgress = {
      time: video.currentTime,
      duration: video.duration,
      timestamp: now,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (e) {
      // localStorage might be full or disabled
      console.warn('Failed to save video progress:', e);
    }
  }, [storageKey, minProgressPercent, maxProgressPercent, saveInterval, videoRef]);

  /**
   * Get saved progress for current content
   */
  const getSavedProgress = useCallback((): WatchProgress | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const progress: WatchProgress = JSON.parse(saved);
      
      // Validate the saved data
      if (typeof progress.time !== 'number' || typeof progress.duration !== 'number') {
        return null;
      }

      // Don't restore very old progress (older than 30 days)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - progress.timestamp > thirtyDaysMs) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return progress;
    } catch (e) {
      return null;
    }
  }, [storageKey]);

  /**
   * Clear saved progress
   */
  const clearProgress = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  /**
   * Restore playback position from saved progress
   */
  const restoreProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasRestoredRef.current) return false;

    const progress = getSavedProgress();
    if (!progress) return false;

    // Only restore if the saved position makes sense for current video
    // (duration should be roughly similar)
    if (video.duration && Math.abs(video.duration - progress.duration) > 30) {
      // Duration mismatch - might be different content
      clearProgress();
      return false;
    }

    // Don't restore if very close to start (less than 10 seconds)
    if (progress.time < 10) return false;

    // Seek to saved position
    video.currentTime = progress.time;
    hasRestoredRef.current = true;
    return true;
  }, [videoRef, getSavedProgress, clearProgress]);

  // Save progress periodically while playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      saveProgress();
    };

    const handlePlay = () => {
      // When play starts, try to restore position if not already done
      if (!hasRestoredRef.current) {
        restoreProgress();
      }
    };

    const handleLoadedMetadata = () => {
      // Restore position when video metadata is loaded
      if (!hasRestoredRef.current) {
        restoreProgress();
      }
    };

    const handleEnded = () => {
      // Clear progress when video ends
      clearProgress();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      // Save progress before cleanup
      saveProgress();
      
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef, saveProgress, restoreProgress, clearProgress]);

  // Reset restored flag when content changes
  useEffect(() => {
    hasRestoredRef.current = false;
  }, [contentId, episodeId]);

  // Save progress when component unmounts or visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveProgress();
      }
    };

    const handleBeforeUnload = () => {
      saveProgress();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveProgress]);

  return {
    saveProgress,
    restoreProgress,
    clearProgress,
    getSavedProgress,
  };
}