import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MovieCard from './MovieCard';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  thumbnail?: string;
  content_type?: 'movie' | 'series';
  genre?: string;
  tmdb_id?: number;
  cast?: CastMember[];
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
}

interface CastMember {
  id: string;
  profile_path: string;
  name?: string;
}

interface SeriesUpdateTodaySectionProps {
  className?: string;
}

const SeriesUpdateTodaySection = ({ className }: SeriesUpdateTodaySectionProps = {}) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (item: Content): string | null => {
    return item.thumbnail || item.poster_path || item.backdrop_path || null;
  };

  const fetchCastWithImages = async (tmdbId: number, mediaType: string) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=5cfa727c2f549c594772a50e10e3f272`
      );
      const data = await response.json();
      return data.cast?.slice(0, 3).map((actor: any) => ({
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
    const fetchUpdatedSeries = async () => {
      setLoading(true);
      try {
        // Get all content IDs that are in upcoming_releases with status='upcoming'
        const { data: upcomingData } = await supabase
          .from('upcoming_releases')
          .select('content_id')
          .eq('status', 'upcoming')
          .not('content_id', 'is', null);

        const upcomingContentIds = upcomingData?.map(item => item.content_id).filter(Boolean) || [];

        // Query series content ordered by updated_at (most recent first)
        let query = supabase
          .from('content')
          .select('*')
          .eq('content_type', 'series')
          .in('status', ['active', 'Ended'])
          .order('last_content_update', { ascending: false, nullsFirst: false })
          .limit(15);

        // Exclude upcoming content if there are any
        if (upcomingContentIds.length > 0) {
          query = query.not('id', 'in', `(${upcomingContentIds.join(',')})`);
        }

        // Add secondary sort by created_at for items without last_content_update
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        const contentWithCast = await Promise.all(
          (data || []).map(async (item) => {
            if (item.tmdb_id) {
              const cast = await fetchCastWithImages(item.tmdb_id, 'tv');
              return { ...item, cast };
            }
            return item;
          })
        );

        setContent(contentWithCast);
      } catch (error) {
        console.error('Error fetching updated series:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpdatedSeries();
  }, []);

  const handleCardClick = (item: Content) => {
    if (item.tmdb_id) {
      navigate(`/watch/series/${item.tmdb_id}/1/1`);
    } else {
      navigate(`/watch/${item.id}`);
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-32 w-64" />
          <Skeleton className="h-8 w-32 ml-auto" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-44 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!content.length) {
    return null;
  }

  return (
    <div className={cn("space-y-3 md:space-y-4 w-full", className)}>
      {/* Header Section */}
      <div className="flex items-center justify-between md:justify-start md:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Large "SERIES" text */}
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-primary leading-none">
            SERIES
          </h2>
          {/* Category text */}
          <div className="flex flex-col justify-center">
            <p className="text-sm md:text-lg lg:text-xl font-semibold text-foreground uppercase tracking-wide">
              UPDATE
            </p>
            <p className="text-xs md:text-lg lg:text-xl font-medium md:font-semibold text-muted-foreground md:text-foreground uppercase">
              TODAY
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/series')}
          className="flex items-center gap-1 md:gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-xs md:text-sm lg:text-base group md:ml-2"
        >
          See all
          <ArrowRight className="h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Content Row */}
      <div className="relative">
        <div className="flex gap-2 md:gap-4 xl:gap-6 overflow-x-auto scrollbar-hide pb-2 md:pb-4">
          {content.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-28 md:w-48 xl:w-56 2xl:w-60 cursor-pointer"
              onClick={() => handleCardClick(item)}
            >
              {/* Mobile: Card matching MobileTopSection style */}
              <div className="md:hidden relative aspect-[2/3.7] rounded-lg overflow-hidden group">
                {/* Poster */}
                {getImageUrl(item) ? (
                  <img
                    src={getImageUrl(item)!}
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
              </div>

              {/* Desktop/Tablet: MovieCard */}
              <div className="hidden md:block">
                <MovieCard
                  id={item.id}
                  title={item.title}
                  description={item.overview || ''}
                  imageUrl={getImageUrl(item)}
                  category={item.genre}
                  cast={item.cast}
                  accessType={item.access_type}
                  recentEpisode={item.recent_episode}
                  onClick={() => handleCardClick(item)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeriesUpdateTodaySection;
