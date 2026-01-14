import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import MovieCard from './MovieCard';
import { useIsTablet } from '@/hooks/use-tablet';

interface CastMember {
  id: string;
  profile_path: string;
  name?: string;
}

interface Content {
  id: string;
  title: string;
  overview: string;
  thumbnail_url?: string;
  poster_path?: string;
  backdrop_path?: string;
  content_type: string;
  genre?: string;
  tmdb_id?: number;
  cast_members?: CastMember[];
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const getImageUrl = (item: Content): string | null => {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.poster_path) return `${TMDB_IMAGE_BASE_URL}${item.poster_path}`;
  if (item.backdrop_path) return `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}`;
  return null;
};

interface ContentRowProps {
  title: string;
  category?: string;
  contentType?: 'movie' | 'series' | 'short';
  className?: string;
}

const ContentRow = ({ title, category, contentType, className }: ContentRowProps) => {
  const navigate = useNavigate();
  const isTablet = useIsTablet();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';

  // Fetch cast member profile images from TMDB
  const fetchCastWithImages = async (tmdbId: number, isMovie: boolean): Promise<CastMember[]> => {
    try {
      const mediaType = isMovie ? 'movie' : 'tv';
      const response = await fetch(
        `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const cast = data.cast || [];
      
      // Return top 5 cast members with images
      return cast.slice(0, 5).map((member: any) => ({
        id: member.id.toString(),
        profile_path: member.profile_path,
        name: member.name
      }));
    } catch (error) {
      console.error('Error fetching cast images:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchContent = async () => {
      try {
        let query = supabase
          .from('content')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(10);

        if (category) {
          query = query.eq('category', category);
        }

        if (contentType) {
          if (contentType === 'series') {
            query = query.or('content_type.eq.series,content_type.eq.tv_show');
          } else {
            query = query.eq('content_type', contentType);
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error('Supabase error:', error);
          setContent([]);
          setLoading(false);
          return;
        }

        // Fetch cast images from TMDB for each content item
        const contentWithCast = await Promise.all(
          (data || []).map(async (item) => {
            let castMembers: CastMember[] = [];
            
            // If we have tmdb_id, fetch cast from TMDB API
            if (item.tmdb_id) {
              const isMovie = item.content_type === 'movie';
              castMembers = await fetchCastWithImages(item.tmdb_id, isMovie);
            }
            
            return {
              ...item,
              cast_members: castMembers
            };
          })
        );
        
        setContent(contentWithCast);
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [category, contentType]);

  if (loading) {
    return (
      <div className="space-y-4 mb-8">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-64 h-36 bg-muted rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="space-y-4 mb-8">
        <h2 className="text-2xl font-bold text-foreground px-2">{title}</h2>
        <p className="text-muted-foreground px-2">No content available. Check console for errors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-10">
      <h2 className="text-xl md:text-2xl xl:text-3xl font-bold text-foreground px-2 md:px-0">{title}</h2>
      <div className="flex gap-2 md:gap-3 xl:gap-5 2xl:gap-6 overflow-x-auto pb-4 scrollbar-hide py-2 px-2 scroll-smooth">
        {content.map((item) => {
          const imageUrl = getImageUrl(item);
          
          // Navigate based on content type and TMDB ID
          const handleClick = () => {
            if (!item.tmdb_id) return;
            
            if (item.content_type === 'series' || item.content_type === 'tv_show') {
              navigate(`/watch/series/${item.tmdb_id}/1/1`);
            } else if (item.content_type === 'movie') {
              navigate(`/watch/movie/${item.tmdb_id}`);
            }
          };
          
          return (
            <div key={item.id} className="flex-shrink-0 w-[200px] md:w-[240px] transition-transform duration-300 ease-out">
              <MovieCard
                id={item.id}
                title={item.title}
                description={item.overview || 'No description available'}
                imageUrl={imageUrl}
                category={item.genre}
                cast={item.cast_members}
                contentType={item.content_type as 'movie' | 'series'}
                accessType={item.access_type}
                recentEpisode={item.recent_episode}
                onClick={handleClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContentRow;
