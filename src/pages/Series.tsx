import HeroBanner from '@/components/HeroBanner';
import TopSection from '@/components/TopSection';
import MobileTopSection from '@/components/MobileTopSection';
import MobilePaginatedGrid from '@/components/MobilePaginatedGrid';
import DesktopPaginatedGrid from '@/components/DesktopPaginatedGrid';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useSearchParams } from 'react-router-dom';

const Series = () => {
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
          <MobileTopSection contentType="series" />
          <MobilePaginatedGrid contentType="series" title="ALL SERIES" />
        </>
      ) : (
        <>
          {showHeroAndTop && (
            <>
              <HeroBanner page="series" />
              <TopSection />
            </>
          )}
          <DesktopPaginatedGrid contentType="series" title="ALL SERIES" />
        </>
      )}
    </div>
  );
};

export default Series;
