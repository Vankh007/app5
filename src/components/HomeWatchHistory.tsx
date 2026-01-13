import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Content {
  id: string;
  title: string;
  overview?: string;
  content_type: 'movie' | 'series' | 'short';
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  popularity?: number;
  genre?: string;
  progress?: number;
}

const HomeWatchHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies');
  const [watchHistory, setWatchHistory] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchHistory();
  }, []);

  const fetchWatchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setWatchHistory([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('watch_history')
        .select(`
          content_id,
          watched_at,
          progress_percentage,
          content:content_id (
            id,
            title,
            overview,
            content_type,
            poster_path,
            backdrop_path,
            release_date,
            popularity,
            genre
          )
        `)
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching watch history:', error);
        setWatchHistory([]);
      } else {
        const historyContent = (data || [])
          .filter(item => item.content)
          .map(item => ({
            ...(item.content as unknown as Content),
            progress: item.progress_percentage
          }));
        setWatchHistory(historyContent);
      }
    } catch (err) {
      console.error('Error fetching watch history:', err);
      setWatchHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContentClick = (content: Content) => {
    navigate(`/watch/${content.content_type}/${content.id}`);
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    const normalizedRating = rating / 2;
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'fill-primary text-primary'
                : i === fullStars && hasHalfStar
                ? 'fill-primary/50 text-primary'
                : 'fill-muted text-muted'
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredHistory = watchHistory.filter(content => 
    activeTab === 'movies' ? content.content_type === 'movie' : content.content_type === 'series'
  );

  if (loading || filteredHistory.length === 0) {
    return null;
  }

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('watch-history-scroll');
    if (container) {
      const scrollAmount = 600;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-4 px-4 lg:px-8">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-primary" />
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wide">
            WATCH HISTORY
          </h2>
        </div>
        
        {/* Movies/Series Toggle */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'movies' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('movies')}
            className={cn(
              "uppercase font-semibold",
              activeTab === 'movies' 
                ? 'bg-primary text-primary-foreground' 
                : 'border-border hover:border-primary'
            )}
          >
            Movies
          </Button>
          <Button
            variant={activeTab === 'series' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('series')}
            className={cn(
              "uppercase font-semibold",
              activeTab === 'series' 
                ? 'bg-primary text-primary-foreground' 
                : 'border-border hover:border-primary'
            )}
          >
            Series
          </Button>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scrollContainer('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        {/* Scrollable Content */}
        <div
          id="watch-history-scroll"
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        >
          {filteredHistory.map((content) => (
            <div
              key={content.id}
              onClick={() => handleContentClick(content)}
              className="group cursor-pointer border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 relative flex-shrink-0 w-[600px]"
            >
              {/* Background Banner */}
              {content.backdrop_path && (
                <div className="absolute inset-0">
                  <img
                    src={content.backdrop_path}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/60" />
                </div>
              )}
              
              <div className="relative flex gap-4 p-4">
                {/* Poster Image */}
                <div className="flex-shrink-0 w-32">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={content.poster_path || content.backdrop_path || '/placeholder.svg'}
                      alt={content.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div>
                    <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2 text-white">
                      {content.title.toUpperCase()}
                    </h3>

                    <div className="space-y-2 mb-2">
                      {/* TYPE */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400 font-semibold uppercase">TYPE :</span>
                        <span className="text-white capitalize">
                          {content.content_type === 'short' ? 'Short' : content.content_type}
                        </span>
                      </div>

                      {/* GENRE */}
                      {content.genre && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 font-semibold uppercase">GENRE :</span>
                          <span className="text-white">{content.genre}</span>
                        </div>
                      )}

                      {/* RATING */}
                      {content.popularity && (
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-400 font-semibold uppercase">RATING :</span>
                          <span className="text-primary font-bold text-base">
                            {(content.popularity / 10).toFixed(1)}
                          </span>
                          {getRatingStars(content.popularity)}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {content.overview && (
                      <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                        {content.overview}
                      </p>
                    )}

                    {/* Progress Bar */}
                    {content.progress && content.progress > 0 && (
                      <div className="space-y-1 mt-2">
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${content.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-white/60">
                          {content.progress.toFixed(0)}% watched
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Play Button */}
                <div className="flex-shrink-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                    <Play className="h-6 w-6 text-primary group-hover:text-white fill-current transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scrollContainer('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default HomeWatchHistory;
