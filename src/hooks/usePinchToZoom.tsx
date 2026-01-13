import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface UsePinchToZoomProps {
  containerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  isFullscreen: boolean;
  enabled?: boolean;
}

interface TouchState {
  initialDistance: number;
  initialScale: number;
  initialX: number;
  initialY: number;
  currentX: number;
  currentY: number;
  centerX: number;
  centerY: number;
}

interface Velocity {
  x: number;
  y: number;
  timestamp: number;
}

export const usePinchToZoom = ({
  containerRef,
  videoRef,
  isFullscreen,
  enabled = true
}: UsePinchToZoomProps) => {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const touchStateRef = useRef<TouchState | null>(null);
  const isPinchingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastTapRef = useRef(0);
  const lastTapPositionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef<Velocity[]>([]);
  const momentumAnimationRef = useRef<number | null>(null);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const SNAP_THRESHOLD = 1.15;
  const VELOCITY_SAMPLE_COUNT = 5;
  const MOMENTUM_FRICTION = 0.92;
  const MOMENTUM_MIN_VELOCITY = 0.5;

  // Check if running on native platform (Capacitor)
  const isNativePlatform = Capacitor.isNativePlatform();

  // Check if device supports touch
  const isTouchDevice = useCallback(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Show zoom indicator briefly
  const showZoomIndicator = useCallback(() => {
    setShowIndicator(true);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = setTimeout(() => {
      setShowIndicator(false);
    }, 1500);
  }, []);

  // Reset zoom to default with smooth animation
  const resetZoom = useCallback((animate = true) => {
    if (momentumAnimationRef.current) {
      cancelAnimationFrame(momentumAnimationRef.current);
      momentumAnimationRef.current = null;
    }

    if (videoRef.current) {
      if (animate) {
        videoRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.transition = '';
          }
        }, 300);
      }
      videoRef.current.style.transform = 'none';
    }

    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [videoRef]);

  // Apply transform to video element with bounds checking
  const applyTransform = useCallback((
    newScale: number, 
    newTranslateX: number, 
    newTranslateY: number,
    animate = false
  ) => {
    if (!videoRef.current || !containerRef.current) return;
    
    // Clamp scale
    const clampedScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
    
    // Calculate max pan based on scale
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoRect = videoRef.current.getBoundingClientRect();
    
    // Use video's natural dimensions for accurate bounds
    const videoWidth = videoRef.current.videoWidth || containerRect.width;
    const videoHeight = videoRef.current.videoHeight || containerRect.height;
    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let displayWidth: number;
    let displayHeight: number;
    
    if (videoAspect > containerAspect) {
      // Video is wider - fits width
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / videoAspect;
    } else {
      // Video is taller - fits height
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * videoAspect;
    }
    
    const scaledWidth = displayWidth * clampedScale;
    const scaledHeight = displayHeight * clampedScale;
    const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    // Clamp translation with smooth rubber-banding for native feel
    let clampedTranslateX = newTranslateX;
    let clampedTranslateY = newTranslateY;

    // Apply elastic resistance at edges (Telegram-like feel)
    if (Math.abs(newTranslateX) > maxTranslateX) {
      const overflow = Math.abs(newTranslateX) - maxTranslateX;
      const resistance = 1 / (1 + overflow * 0.01);
      clampedTranslateX = Math.sign(newTranslateX) * (maxTranslateX + overflow * resistance * 0.3);
    }
    
    if (Math.abs(newTranslateY) > maxTranslateY) {
      const overflow = Math.abs(newTranslateY) - maxTranslateY;
      const resistance = 1 / (1 + overflow * 0.01);
      clampedTranslateY = Math.sign(newTranslateY) * (maxTranslateY + overflow * resistance * 0.3);
    }

    setScale(clampedScale);
    setTranslateX(clampedTranslateX);
    setTranslateY(clampedTranslateY);

    const video = videoRef.current;
    if (animate) {
      video.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.style.transition = '';
        }
      }, 200);
    } else {
      video.style.transition = '';
    }
    
    video.style.transform = `translate(${clampedTranslateX}px, ${clampedTranslateY}px) scale(${clampedScale})`;
    video.style.transformOrigin = 'center center';
    
    // Show indicator when zooming
    if (clampedScale !== 1) {
      showZoomIndicator();
    }
  }, [containerRef, videoRef, showZoomIndicator]);

  // Apply momentum-based animation after pan ends
  const applyMomentum = useCallback(() => {
    if (velocityRef.current.length < 2 || scale <= 1) return;

    const recentVelocities = velocityRef.current.slice(-VELOCITY_SAMPLE_COUNT);
    const avgVelocityX = recentVelocities.reduce((sum, v) => sum + v.x, 0) / recentVelocities.length;
    const avgVelocityY = recentVelocities.reduce((sum, v) => sum + v.y, 0) / recentVelocities.length;

    let velocityX = avgVelocityX;
    let velocityY = avgVelocityY;
    let currentX = translateX;
    let currentY = translateY;

    const animate = () => {
      velocityX *= MOMENTUM_FRICTION;
      velocityY *= MOMENTUM_FRICTION;

      if (Math.abs(velocityX) < MOMENTUM_MIN_VELOCITY && Math.abs(velocityY) < MOMENTUM_MIN_VELOCITY) {
        momentumAnimationRef.current = null;
        // Snap back to bounds if needed
        snapToBounds();
        return;
      }

      currentX += velocityX;
      currentY += velocityY;

      applyTransform(scale, currentX, currentY, false);
      momentumAnimationRef.current = requestAnimationFrame(animate);
    };

    momentumAnimationRef.current = requestAnimationFrame(animate);
  }, [scale, translateX, translateY, applyTransform]);

  // Snap back to bounds after momentum
  const snapToBounds = useCallback(() => {
    if (!videoRef.current || !containerRef.current || scale <= 1) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const videoWidth = videoRef.current.videoWidth || containerRect.width;
    const videoHeight = videoRef.current.videoHeight || containerRect.height;
    const videoAspect = videoWidth / videoHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let displayWidth: number;
    let displayHeight: number;
    
    if (videoAspect > containerAspect) {
      displayWidth = containerRect.width;
      displayHeight = containerRect.width / videoAspect;
    } else {
      displayHeight = containerRect.height;
      displayWidth = containerRect.height * videoAspect;
    }
    
    const scaledWidth = displayWidth * scale;
    const scaledHeight = displayHeight * scale;
    const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    const clampedX = Math.min(Math.max(translateX, -maxTranslateX), maxTranslateX);
    const clampedY = Math.min(Math.max(translateY, -maxTranslateY), maxTranslateY);

    if (clampedX !== translateX || clampedY !== translateY) {
      applyTransform(scale, clampedX, clampedY, true);
    }
  }, [scale, translateX, translateY, containerRef, videoRef, applyTransform]);

  // Handle double tap to zoom
  const handleDoubleTap = useCallback((x: number, y: number) => {
    if (!containerRef.current) return;

    if (scale > 1) {
      // If zoomed in, reset to 1x
      resetZoom(true);
    } else {
      // Zoom to 2x centered on tap position
      const containerRect = containerRef.current.getBoundingClientRect();
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      // Calculate offset to center the tap position
      const tapOffsetX = (centerX - (x - containerRect.left)) * (2 - 1);
      const tapOffsetY = (centerY - (y - containerRect.top)) * (2 - 1);
      
      applyTransform(2, tapOffsetX, tapOffsetY, true);
    }
  }, [scale, containerRef, resetZoom, applyTransform]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !isFullscreen || !isTouchDevice()) return;

    // Cancel any ongoing momentum animation
    if (momentumAnimationRef.current) {
      cancelAnimationFrame(momentumAnimationRef.current);
      momentumAnimationRef.current = null;
    }

    velocityRef.current = [];

    // Double tap detection
    const now = Date.now();
    if (e.touches.length === 1) {
      const tapX = e.touches[0].clientX;
      const tapY = e.touches[0].clientY;
      
      // Check for double tap (within 300ms and 50px radius)
      if (now - lastTapRef.current < 300) {
        const dx = tapX - lastTapPositionRef.current.x;
        const dy = tapY - lastTapPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50) {
          e.preventDefault();
          handleDoubleTap(tapX, tapY);
          lastTapRef.current = 0;
          return;
        }
      }
      
      lastTapRef.current = now;
      lastTapPositionRef.current = { x: tapX, y: tapY };
    }

    if (e.touches.length === 2) {
      // Start pinch gesture
      e.preventDefault();
      isPinchingRef.current = true;
      const center = getCenter(e.touches[0], e.touches[1]);
      touchStateRef.current = {
        initialDistance: getDistance(e.touches[0], e.touches[1]),
        initialScale: scale,
        initialX: center.x,
        initialY: center.y,
        currentX: translateX,
        currentY: translateY,
        centerX: center.x,
        centerY: center.y
      };
    } else if (e.touches.length === 1 && scale > 1) {
      // Start pan gesture when zoomed in
      isPanningRef.current = true;
      touchStateRef.current = {
        initialDistance: 0,
        initialScale: scale,
        initialX: e.touches[0].clientX,
        initialY: e.touches[0].clientY,
        currentX: translateX,
        currentY: translateY,
        centerX: 0,
        centerY: 0
      };
    }
  }, [enabled, isFullscreen, isTouchDevice, scale, translateX, translateY, getDistance, getCenter, handleDoubleTap]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isFullscreen || !touchStateRef.current) return;

    if (e.touches.length === 2 && isPinchingRef.current) {
      e.preventDefault();
      const state = touchStateRef.current;
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      
      // Calculate new scale with improved sensitivity for native apps
      const scaleRatio = currentDistance / state.initialDistance;
      const scaleSensitivity = isNativePlatform ? 1.2 : 1; // More responsive on native
      const newScale = state.initialScale * Math.pow(scaleRatio, scaleSensitivity);
      
      // Calculate pan during pinch (follow the center point)
      const panX = center.x - state.initialX;
      const panY = center.y - state.initialY;
      
      applyTransform(newScale, state.currentX + panX, state.currentY + panY, false);
    } else if (e.touches.length === 1 && isPanningRef.current && scale > 1) {
      e.preventDefault();
      const state = touchStateRef.current;
      const panX = e.touches[0].clientX - state.initialX;
      const panY = e.touches[0].clientY - state.initialY;
      
      // Track velocity for momentum
      const now = Date.now();
      const lastVelocity = velocityRef.current[velocityRef.current.length - 1];
      if (!lastVelocity || now - lastVelocity.timestamp > 16) {
        velocityRef.current.push({
          x: panX - (lastVelocity?.x || 0),
          y: panY - (lastVelocity?.y || 0),
          timestamp: now
        });
        
        // Keep only recent velocity samples
        if (velocityRef.current.length > VELOCITY_SAMPLE_COUNT * 2) {
          velocityRef.current = velocityRef.current.slice(-VELOCITY_SAMPLE_COUNT);
        }
      }
      
      applyTransform(scale, state.currentX + panX, state.currentY + panY, false);
    }
  }, [enabled, isFullscreen, scale, getDistance, getCenter, applyTransform, isNativePlatform]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) {
      isPinchingRef.current = false;
      isPanningRef.current = false;
      touchStateRef.current = null;
      
      // Snap back to 1x if close to it
      if (scale < SNAP_THRESHOLD && scale > 1) {
        resetZoom(true);
      } else if (scale >= SNAP_THRESHOLD) {
        // Apply momentum if panning was happening
        if (velocityRef.current.length > 0) {
          applyMomentum();
        } else {
          snapToBounds();
        }
      }
    } else if (e.touches.length === 1 && isPinchingRef.current) {
      // Switch from pinch to pan
      isPinchingRef.current = false;
      if (scale > 1) {
        isPanningRef.current = true;
        velocityRef.current = [];
        touchStateRef.current = {
          initialDistance: 0,
          initialScale: scale,
          initialX: e.touches[0].clientX,
          initialY: e.touches[0].clientY,
          currentX: translateX,
          currentY: translateY,
          centerX: 0,
          centerY: 0
        };
      }
    }
  }, [scale, translateX, translateY, resetZoom, applyMomentum, snapToBounds]);

  // Reset zoom when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen && scale !== 1) {
      resetZoom(false);
    }
  }, [isFullscreen, scale, resetZoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (momentumAnimationRef.current) {
        cancelAnimationFrame(momentumAnimationRef.current);
      }
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
    };
  }, []);

  // Attach/detach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || !isFullscreen) return;

    const options: AddEventListenerOptions = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, enabled, isFullscreen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    scale,
    translateX,
    translateY,
    resetZoom,
    isZoomed: scale > 1,
    showIndicator,
    zoomPercentage: Math.round(scale * 100)
  };
};
