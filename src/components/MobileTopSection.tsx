import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Content {
  id: string;
  title: string;
  poster_path?: string;
  tmdb_id?: number;
  content_type?: 'movie' | 'series' | 'anime';
  popularity?: number;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface MobileTopSectionProps {
  contentType?: 'movie' | 'series' | 'anime' | 'all';
}

const MobileTopSection = ({ contentType = 'all' }: MobileTopSectionProps) => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Content[]>([]);
  const [series, setSeries] = useState<Content[]>([]);
  const [animes, setAnimes] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch based on contentType prop
        if (contentType === 'all' || contentType === 'movie') {
          const { data: moviesData } = await supabase
            .from('content')
            .select('id, title, poster_path, tmdb_id, content_type, popularity')
            .eq('content_type', 'movie')
            .eq('status', 'active')
            .not('poster_path', 'is', null)
            .order('popularity', { ascending: false })
            .limit(10);
          setMovies(moviesData || []);
        }

        if (contentType === 'all' || contentType === 'series') {
          const { data: seriesData } = await supabase
            .from('content')
            .select('id, title, poster_path, tmdb_id, content_type, popularity')
            .eq('content_type', 'series')
            .eq('status', 'active')
            .not('poster_path', 'is', null)
            .order('popularity', { ascending: false })
            .limit(10);
          setSeries(seriesData || []);
        }

        if (contentType === 'all' || contentType === 'anime') {
          const { data: animesData } = await supabase
            .from('content')
            .select('id, title, poster_path, tmdb_id, content_type, popularity')
            .eq('content_type', 'anime')
            .eq('status', 'active')
            .not('poster_path', 'is', null)
            .order('popularity', { ascending: false })
            .limit(10);
          setAnimes(animesData || []);
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [contentType]);

  const handleClick = (item: Content) => {
    if (item.tmdb_id) {
      if (item.content_type === 'series') {
        navigate(`/watch/series/${item.tmdb_id}/1/1`);
      } else if (item.content_type === 'anime') {
        navigate(`/watch/anime/${item.tmdb_id}/1/1`);
      } else {
        navigate(`/watch/movie/${item.tmdb_id}`);
      }
    }
  };

  if (loading) {
    return <div className="py-6 px-4 space-y-8 animate-pulse">
      <div className="h-32 bg-muted rounded-lg" />
      <div className="h-32 bg-muted rounded-lg" />
    </div>;
  }

  const TopSection = ({ title, items, link }: { title: string; items: Content[]; link: string }) => (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-[1px]">
        <div className="flex items-center gap-2">
          <h2 className="text-5xl font-black text-primary leading-none">TOP</h2>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</p>
            <p className="text-xs font-medium text-muted-foreground uppercase">TODAY</p>
          </div>
        </div>
        <button
          onClick={() => navigate(link)}
          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium text-xs group"
        >
          See all
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Horizontal Scrolling Content */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 px-[1px] pb-2">
          {items.slice(0, 10).map((item, idx) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className="relative w-28 aspect-[2/3.7] rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
            >
              {/* Rank Number */}
              <div className="absolute bottom-1 left-1 z-10">
                <span 
                  className="text-7xl font-black leading-none"
                  style={{
                    WebkitTextStroke: '2px hsl(var(--primary))',
                    color: 'transparent'
                  }}
                >
                  {idx + 1}
                </span>
              </div>

              {/* Poster */}
              {item.poster_path ? (
                <img
                  src={`${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-active:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-center px-2">{item.title}</span>
                </div>
              )}

              {/* Gradient Overlay - 70% height from bottom */}
              <div 
                className="absolute bottom-0 left-0 right-0 pointer-events-none"
                style={{ height: '70%' }}
              >
                <div className="w-full h-full bg-gradient-to-t from-background via-background/70 to-transparent" />
              </div>

              {/* Overlay on active */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-active:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      {(contentType === 'all' || contentType === 'movie') && movies.length > 0 && (
        <TopSection title="MOVIES" items={movies} link="/movies" />
      )}
      {(contentType === 'all' || contentType === 'series') && series.length > 0 && (
        <TopSection title="TV SERIES" items={series} link="/series" />
      )}
      {(contentType === 'all' || contentType === 'anime') && animes.length > 0 && (
        <TopSection title="ANIMES" items={animes} link="/series?type=anime" />
      )}
    </div>
  );
};

export default MobileTopSection;
