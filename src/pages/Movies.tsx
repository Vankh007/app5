import HeroBanner from '@/components/HeroBanner';
import TopMoviesSection from '@/components/TopMoviesSection';
import MobileTopSection from '@/components/MobileTopSection';
import MobilePaginatedGrid from '@/components/MobilePaginatedGrid';
import DesktopPaginatedGrid from '@/components/DesktopPaginatedGrid';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useSearchParams } from 'react-router-dom';

const Movies = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [searchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Mobile uses its own state-based pagination, tablet/desktop use URL params
  const showHeroAndTop = currentPage === 1;

  return (
    <div className={isMobile ? "pt-16" : isTablet ? "pt-16 space-y-6" : "space-y-6"}>
      {isMobile ? (
        <>
          <MobileTopSection contentType="movie" />
          <MobilePaginatedGrid contentType="movie" title="ALL MOVIES" />
        </>
      ) : (
        <>
          {showHeroAndTop && (
            <>
              <HeroBanner page="movies" />
              <TopMoviesSection />
            </>
          )}
          <DesktopPaginatedGrid contentType="movie" title="ALL MOVIES" />
        </>
      )}
    </div>
  );
};

export default Movies;
