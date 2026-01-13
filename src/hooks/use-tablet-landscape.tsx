import { useEffect, useState } from "react";

// Detect if device is tablet in landscape mode
// Tablet range: 768px - 1279px width in portrait
// When in landscape, we want to use desktop layout
const MIN_TABLET_WIDTH = 768;
const MAX_TABLET_WIDTH = 1279;

export function useIsTabletLandscape() {
  const [isTabletLandscape, setIsTabletLandscape] = useState<boolean>(false);

  useEffect(() => {
    const checkIsTabletLandscape = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Check if we're in landscape (width > height)
      const isLandscape = width > height;
      
      // Check if the shorter dimension (height in landscape) is in tablet range
      // This means the device is a tablet rotated to landscape
      const shorterDimension = Math.min(width, height);
      const isTabletDevice = shorterDimension >= MIN_TABLET_WIDTH && shorterDimension <= MAX_TABLET_WIDTH;
      
      // Also check if width is above tablet portrait max (indicating landscape of a tablet)
      const widthAboveTabletPortrait = width > MAX_TABLET_WIDTH;
      
      setIsTabletLandscape(isLandscape && (isTabletDevice || (shorterDimension >= MIN_TABLET_WIDTH && widthAboveTabletPortrait)));
    };
    
    checkIsTabletLandscape();
    
    // Listen to both resize and orientation change events
    window.addEventListener("resize", checkIsTabletLandscape);
    window.addEventListener("orientationchange", checkIsTabletLandscape);
    
    // Also use matchMedia for orientation if available
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    const handleOrientationChange = () => checkIsTabletLandscape();
    mediaQuery.addEventListener?.("change", handleOrientationChange);
    
    return () => {
      window.removeEventListener("resize", checkIsTabletLandscape);
      window.removeEventListener("orientationchange", checkIsTabletLandscape);
      mediaQuery.removeEventListener?.("change", handleOrientationChange);
    };
  }, []);

  return isTabletLandscape;
}
