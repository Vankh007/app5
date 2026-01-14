import MobileTopSection from '@/components/MobileTopSection';
import MobilePaginatedGrid from '@/components/MobilePaginatedGrid';

const Series = () => {
  return (
    <div className="pt-16">
      <MobileTopSection contentType="series" />
      <MobilePaginatedGrid contentType="series" title="ALL SERIES" />
    </div>
  );
};

export default Series;
