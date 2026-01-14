import MobileTopSection from '@/components/MobileTopSection';
import MobilePaginatedGrid from '@/components/MobilePaginatedGrid';

const Movies = () => {
  return (
    <div className="pt-16">
      <MobileTopSection contentType="movie" />
      <MobilePaginatedGrid contentType="movie" title="ALL MOVIES" />
    </div>
  );
};

export default Movies;
