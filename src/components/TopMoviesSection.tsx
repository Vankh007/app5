import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MovieCard from './MovieCard';
import { Skeleton } from './ui/skeleton';
import { useIsTablet } from '@/hooks/use-tablet';
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
interface TopMoviesSectionProps {
  className?: string;
}

const TopMoviesSection = ({ className }: TopMoviesSectionProps = {}) => {
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const getImageUrl = (item: Content): string | null => {
    return item.thumbnail || item.poster_path || item.backdrop_path || null;
  };
  const fetchCastWithImages = async (tmdbId: number, mediaType: string) => {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=5cfa727c2f549c594772a50e10e3f272`);
      const data = await response.json();
      return data.cast?.slice(0, 3).map((actor: any) => ({
        id: String(actor.id),
        profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : '',
        name: actor.name
      })) || [];
    } catch (error) {
      console.error('Error fetching cast:', error);
      return [];
    }
  };
  useEffect(() => {
    const fetchTopContent = async () => {
      setLoading(true);
      try {
        let query = supabase.from('content').select('*').eq('content_type', 'movie').eq('status', 'active').order('created_at', {
          ascending: false
        }).limit(10);
        const {
          data,
          error
        } = await query;
        if (error) throw error;
        const contentWithCast = await Promise.all((data || []).map(async item => {
          if (item.tmdb_id) {
            const cast = await fetchCastWithImages(item.tmdb_id, 'movie');
            return {
              ...item,
              cast
            };
          }
          return item;
        }));
        setContent(contentWithCast);
      } catch (error) {
        console.error('Error fetching top content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopContent();
  }, []);
  const handleCardClick = (item: Content) => {
    if (item.tmdb_id) {
      navigate(`/watch/${item.content_type || 'movie'}/${item.tmdb_id}`);
    } else {
      navigate(`/watch/${item.id}`);
    }
  };
  if (loading) {
    return <div className="space-y-4">
        <div className="flex items-center gap-4 mx-[15px]">
          <Skeleton className="h-32 w-64" />
          <Skeleton className="h-8 w-32 ml-auto" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-44 flex-shrink-0 rounded-lg" />)}
        </div>
      </div>;
  }
  if (!content.length) {
    return null;
  }
  return <div className="space-y-4 w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4 mx-[15px]">
        {/* Large "TOP" text */}
        <h2 className="text-6xl md:text-7xl lg:text-8xl font-black text-primary leading-none">
          TOP
        </h2>
        {/* Category text and See all */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col justify-center">
            <p className="text-lg md:text-xl font-semibold text-foreground uppercase tracking-wide">
              MOVIES
            </p>
            <p className="text-lg md:text-xl font-semibold text-foreground uppercase tracking-wide">
              TODAY
            </p>
          </div>
          <button onClick={() => navigate('/movies')} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-sm md:text-base group ml-2">
            See all
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Content Row */}
      <div className="relative">
        <div className="flex gap-3 md:gap-4 xl:gap-6 overflow-x-auto scrollbar-hide pb-4">
          {content.map(item => <div key={item.id} className="flex-shrink-0 w-44 md:w-48 xl:w-56 2xl:w-60 cursor-pointer" onClick={() => handleCardClick(item)}>
              <MovieCard id={item.id} title={item.title} description={item.overview || ''} imageUrl={getImageUrl(item)} category={item.genre} cast={item.cast} accessType={item.access_type} recentEpisode={item.recent_episode} onClick={() => handleCardClick(item)} />
            </div>)}
        </div>
      </div>
    </div>;
};
export default TopMoviesSection;