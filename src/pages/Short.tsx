import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import MobileShortsFeed from '@/components/MobileShortsFeed';
import BottomNav from '@/components/BottomNav';

const Short = () => {
  // Allow landscape orientation on shorts player
  useScreenOrientation(true);

  return (
    <>
      <MobileShortsFeed />
      <BottomNav />
    </>
  );
};

export default Short;
