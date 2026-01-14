import { useEffect, useState } from "react";

// Desktop starts at 1280px+ (standard PC width)
// Tablet range: 768px - 1279px width
const MIN_TABLET_WIDTH = 768;
const MAX_TABLET_WIDTH = 1279; // Desktop starts at 1280px

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState<boolean>(false);

  useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth;
      
      // Simple width-based check: tablet is between 768px and 1279px
      // Desktop is 1280px and above
      // Mobile is below 768px
      const isTabletSize = width >= MIN_TABLET_WIDTH && width <= MAX_TABLET_WIDTH;
      
      setIsTablet(isTabletSize);
    };
    
    checkIsTablet();
    window.addEventListener("resize", checkIsTablet);
    return () => window.removeEventListener("resize", checkIsTablet);
  }, []);

  return isTablet;
}
