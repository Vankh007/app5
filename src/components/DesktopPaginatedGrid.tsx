import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import GridMovieCard from './GridMovieCard';
import { useIsTablet } from '@/hooks/use-tablet';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Content {
  id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genre?: string;
  tmdb_id?: number;
  content_type?: string;
  cast?: CastMember[];
  access_type?: 'free' | 'purchase' | 'membership';
}

interface CastMember {
  id: string;
  profile_path: string;
  name?: string;
}

interface DesktopPaginatedGridProps {
  contentType: 'movie' | 'series';
  title: string;
}

const DesktopPaginatedGrid = ({ contentType, title }: DesktopPaginatedGridProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [content, setContent] = useState<Content[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  
  // iPad: 4 columns, 24 items | Desktop: 7 columns, 35 items
  const ITEMS_PER_PAGE = isTablet ? 24 : 35;

  const fetchCastWithImages = async (tmdbId: number, mediaType: string) => {
    try {
      // TMDB API uses 'tv' for series, not 'series'
      const apiMediaType = mediaType === 'series' ? 'tv' : mediaType;
      const response = await fetch(
        `https://api.themoviedb.org/3/${apiMediaType}/${tmdbId}/credits?api_key=5cfa727c2f549c594772a50e10e3f272`
      );
      const data = await response.json();
      return data.cast?.slice(0, 5).map((actor: any) => ({
        id: String(actor.id),
        profile_path: actor.profile_path
          ? `https://image.tmdb.org/t/p/w200${actor.profile_path}`
          : '',
        name: actor.name,
      })) || [];
    } catch (error) {
      console.error('Error fetching cast:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error, count } = await supabase
          .from('content')
          .select('*', { count: 'exact' })
          .eq('content_type', contentType)
          .in('status', ['active', 'Ended'])
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        // Fetch cast for each content item
        const contentWithCast = await Promise.all(
          (data || []).map(async (item) => {
            if (item.tmdb_id) {
              const cast = await fetchCastWithImages(item.tmdb_id, contentType);
              return { ...item, cast };
            }
            return item;
          })
        );

        setContent(contentWithCast);
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [contentType, currentPage, ITEMS_PER_PAGE]);

  const handleClick = (item: Content) => {
    const id = item.tmdb_id || item.id;
    navigate(`/watch/${contentType}/${id}`);
  };

  const setCurrentPage = (page: number) => {
    setSearchParams({ page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setCurrentPage(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  // iPad: 4 columns | Desktop: 7 columns
  const gridCols = isTablet 
    ? "grid-cols-4" 
    : "grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        <div className={`grid ${gridCols} gap-2`}>
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      
      <div className={`grid ${gridCols} gap-2`}>
        {content.map((item) => (
          <GridMovieCard
            key={item.id}
            item={item}
            onClick={handleClick}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {renderPaginationItems()}
            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default DesktopPaginatedGrid;
