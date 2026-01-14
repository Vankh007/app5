import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsMobile } from './use-mobile';
import { Capacitor } from '@capacitor/core';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  /**
   * Optional ref to a specific scrollable container.
   * If not provided, checks window.scrollY.
   */
  containerRef?: React.RefObject<HTMLElement>;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 100,
  resistance = 4, // Increased resistance for better separation
  containerRef,
}: UsePullToRefreshOptions) => {
  const isMobile = useIsMobile();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const isPullToRefreshActive = useRef(false);
  const touchStartTime = useRef(0);
  
  // Stricter thresholds for better separation
  const minPullDistance = 40; // Increased minimum pull before activating
  const maxInitialVelocity = 0.5; // Max velocity to consider as pull (not scroll)

  // Check if at the top of the scrollable area
  const isAtTop = useCallback(() => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop <= 0;
    }
    return window.scrollY <= 0;
  }, [containerRef]);

  // Check if target element is a scrollable container (not the main page)
  const isInsideScrollableElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    
    let element: Element | null = target;
    while (element && element !== document.body) {
      const style = window.getComputedStyle(element);
      const overflowY = style.overflowY;
      const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
      
      // If we find a scrollable element that's not at its top, disable pull-to-refresh
      if (isScrollable && (element as HTMLElement).scrollTop > 0) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Reset state
      isPullToRefreshActive.current = false;
      
      // Don't start if inside a scrolled container
      if (isInsideScrollableElement(e.target)) {
        isDragging.current = false;
        return;
      }
      
      // Only activate if at the very top
      if (isAtTop()) {
        startY.current = e.touches[0].clientY;
        touchStartTime.current = Date.now();
        isDragging.current = true;
      } else {
        isDragging.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;
      const timeSinceStart = Date.now() - touchStartTime.current;
      
      // Calculate velocity (pixels per ms)
      const velocity = timeSinceStart > 0 ? diff / timeSinceStart : 0;

      // Only trigger pull-to-refresh if:
      // 1. Still at top of page
      // 2. Pulling down (positive diff)
      // 3. Pulled past minimum threshold
      // 4. Not scrolling fast (which indicates scroll intent, not refresh)
      // 5. Not inside a scrolled container
      if (isAtTop() && diff > minPullDistance && velocity < maxInitialVelocity && !isInsideScrollableElement(e.target)) {
        // Activate pull-to-refresh
        isPullToRefreshActive.current = true;
        e.preventDefault();
        // Apply resistance - more pull needed for same visual distance
        const adjustedPull = (diff - minPullDistance) / resistance;
        setPullDistance(Math.min(adjustedPull, threshold * 1.2));
      } else if (!isPullToRefreshActive.current) {
        // User started scrolling, disable pull-to-refresh for this touch
        isDragging.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging.current) return;

      isDragging.current = false;

      if (isPullToRefreshActive.current && pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
      
      isPullToRefreshActive.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, pullDistance, threshold, resistance, onRefresh, isRefreshing, isAtTop, isInsideScrollableElement]);

  const isNative = Capacitor.isNativePlatform();

  return {
    pullDistance,
    isRefreshing,
    isEnabled: isMobile || isNative,
  };
};
