import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface Content {
  id: string;
  title: string;
  poster_path?: string;
  tmdb_id?: number;
  content_type?: 'movie' | 'series';
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w200';

interface MobileCircleSliderProps {
  contentType?: 'movie' | 'series';
}

const MobileCircleSlider = ({ contentType }: MobileCircleSliderProps) => {
  const navigate = useNavigate();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        let query = supabase
          .from('content')
          .select('id, title, poster_path, tmdb_id, content_type')
          .not('poster_path', 'is', null)
          .order('popularity', { ascending: false })
          .limit(10);

        if (contentType) {
          query = query.eq('content_type', contentType);
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
  }, [contentType]);

  const handleClick = (item: Content) => {
    if (item.tmdb_id) {
      navigate(`/watch/${item.content_type || 'movie'}/${item.tmdb_id}`);
    }
  };

  if (loading) return null;

  return (
    <div className="py-4 bg-white dark:bg-black">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-4">
        {content.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-[3px] border-primary/60 hover:border-primary hover:scale-110 transition-all">
              {item.poster_path ? (
                <img
                  src={`${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-center px-1 font-bold">{item.title.slice(0, 2)}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileCircleSlider;
