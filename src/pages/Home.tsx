import MobileHeroBanner from '@/components/MobileHeroBanner';
import MobileCircleSlider from '@/components/MobileCircleSlider';
import MobileTopSection from '@/components/MobileTopSection';
import MobileContentSection from '@/components/MobileContentSection';
import CollectionsScroll from '@/components/CollectionsScroll';
import HomeContinuousWatch from '@/components/HomeContinuousWatch';
import { UpcomingSection } from '@/components/UpcomingSection';
import AdSlot from '@/components/ads/AdSlot';
import SeriesUpdateTodaySection from '@/components/SeriesUpdateTodaySection';

const Home = () => {
  return (
    <div className="min-h-screen scrollbar-hide">
      <MobileHeroBanner page="home" />
      <MobileCircleSlider />
      <HomeContinuousWatch />
      <MobileTopSection />
      <SeriesUpdateTodaySection />
      <AdSlot placement="banner" pageLocation="home_top_series" className="px-4 py-2" />
      <MobileContentSection title="Trending Now" type="trending" link="/movies" />
      <MobileContentSection title="New Releases" type="new_releases" link="/movies" />
      <UpcomingSection />
      <CollectionsScroll />
      <AdSlot placement="banner" pageLocation="home_collections" className="px-4 py-2" />
    </div>
  );
};

export default Home;
