import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface Content {
  id: string;
  title: string;
  poster_path?: string;
  tmdb_id?: string | number;
  content_type: string;
}

interface MobilePaginatedGridProps {
  contentType: 'movie' | 'series';
  title: string;
}

const MobilePaginatedGrid = ({ contentType, title }: MobilePaginatedGridProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const itemsPerPage = 18;

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from('content')
        .select('*', { count: 'exact' })
        .eq('content_type', contentType)
        .in('status', ['active', 'Ended'])
        .order('popularity', { ascending: false })
        .range(start, end);

      if (!error && data) {
        setContent(data);
        if (count) {
          setTotalPages(Math.ceil(count / itemsPerPage));
        }
      }
      setLoading(false);
    };

    fetchContent();
  }, [contentType, currentPage]);

  const handleClick = (item: Content) => {
    const id = item.tmdb_id || item.id;
    if (contentType === 'series') {
      navigate(`/watch/series/${id}/1/1`);
    } else {
      navigate(`/watch/movie/${id}`);
    }
  };

  const getImageUrl = (posterPath?: string) => {
    if (!posterPath) return '';
    if (posterPath.startsWith('http')) return posterPath;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => setCurrentPage(1)} className="h-8 w-8 text-xs">1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis-start" className="h-8 w-8" />);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={currentPage === i}
            onClick={() => setCurrentPage(i)}
            className="h-8 w-8 text-xs"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<PaginationEllipsis key="ellipsis-end" className="h-8 w-8" />);
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => setCurrentPage(totalPages)} className="h-8 w-8 text-xs">
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="px-[1px] pb-20">
      <h2 className="text-3xl font-bold mb-6 text-foreground">{title}</h2>
      
      {loading ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-[2/3.7] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 mb-6">
            {content.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                className="relative aspect-[2/3.7] cursor-pointer overflow-hidden rounded-lg"
              >
                {item.poster_path ? (
                  <img
                    src={getImageUrl(item.poster_path)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-4xl">🎬</span>
                  </div>
                )}
                
                {/* Gradient Overlay - 70% height from bottom */}
                <div 
                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                  style={{ height: '70%' }}
                >
                  <div className="w-full h-full bg-gradient-to-t from-background via-background/70 to-transparent" />
                </div>
                
                <div className="absolute top-1 left-1 bg-background/80 text-foreground text-xs px-1.5 py-0.5 rounded z-10">
                  {contentType === 'movie' ? 'Movie' : 'Serie'}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent className="gap-0.5">
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={`h-8 px-2 text-xs ${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                  >
                    <span className="sr-only">Previous</span>
                  </PaginationPrevious>
                </PaginationItem>
                
                {renderPaginationItems()}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className={`h-8 px-2 text-xs ${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                  >
                    <span className="sr-only">Next</span>
                  </PaginationNext>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};

export default MobilePaginatedGrid;
