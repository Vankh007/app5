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
  created_at?: string;
  popularity?: number;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface MobileContentSectionProps {
  title: string;
  type: 'trending' | 'new_releases';
  link?: string;
}

const MobileContentSection = ({ title, type, link = '/movies' }: MobileContentSectionProps) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        let query = supabase
          .from('content')
          .select('id, title, poster_path, tmdb_id, content_type, created_at, popularity')
          .eq('status', 'active')
          .not('poster_path', 'is', null)
          .limit(10);

        if (type === 'trending') {
          query = query.order('popularity', { ascending: false });
        } else if (type === 'new_releases') {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;
        setContent(data || []);
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [type]);

  const handleClick = (item: Content) => {
    if (item.tmdb_id) {
      if (item.content_type === 'series' || item.content_type === 'anime') {
        navigate(`/watch/${item.content_type}/${item.tmdb_id}/1/1`);
      } else {
        navigate(`/watch/movie/${item.tmdb_id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="py-2 px-4 space-y-3 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-28 aspect-[2/3] bg-muted rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (content.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-[1px]">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
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
          {content.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className="relative w-28 aspect-[2/3.7] rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
            >
              {/* Poster */}
              {item.poster_path ? (
                <img
                  src={item.poster_path.startsWith('http') ? item.poster_path : `${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-active:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-center px-2">{item.title}</span>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Title */}
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs font-medium text-white line-clamp-2">{item.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileContentSection;