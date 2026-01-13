import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Play, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface HeroSlide {
  id: string;
  title: string;
  description?: string;
  overview?: string;
  poster_path?: string;
  category?: string;
  content_type?: 'movie' | 'series';
  tmdb_id?: number;
  content_id?: string;
  genre?: string;
  popularity?: number;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface MobileHeroBannerProps {
  page?: 'home' | 'movies' | 'series';
}

const MobileHeroBanner = ({ page = 'home' }: MobileHeroBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [inMyList, setInMyList] = useState<Set<string>>(new Set());
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        let query = supabase
          .from('slider_settings')
          .select('*')
          .eq('status', 'active');

        // For non-home pages, filter by section
        if (page !== 'home') {
          query = query.eq('section', page);
        }

        const { data, error } = await query
          .order('position', { ascending: true })
          .limit(5);

        if (error) {
          console.error('Error fetching hero slides:', error);
        } else if (data) {
          const mappedSlides = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            overview: item.description,
            poster_path: item.poster_path || item.image_url,
            tmdb_id: item.content_id,
            content_id: item.content_id,
            genre: item.content_type,
            content_type: item.content_type,
          })) as HeroSlide[];
          setSlides(mappedSlides);
        }
      } catch (error) {
        console.error('Error fetching slides:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, [page]);

  useEffect(() => {
    if (user && slides.length > 0) {
      checkMyList();
    }
  }, [user, slides]);

  const checkMyList = async () => {
    if (!user) return;

    try {
      const contentIds = slides.map(s => s.content_id).filter(Boolean);
      const { data } = await supabase
        .from('my_list')
        .select('content_id')
        .eq('user_id', user.id)
        .in('content_id', contentIds);

      if (data) {
        setInMyList(new Set(data.map(item => item.content_id)));
      }
    } catch (error) {
      console.error('Error checking my list:', error);
    }
  };

  const handleAddToList = async () => {
    if (!user) {
      toast.error('Please sign in to add to your list');
      navigate('/auth');
      return;
    }

    const currentSlide = slides[currentIndex];
    if (!currentSlide.content_id) {
      toast.error('Cannot add this item to list');
      return;
    }

    const isInList = inMyList.has(currentSlide.content_id);

    try {
      if (isInList) {
        const { error } = await supabase
          .from('my_list')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', currentSlide.content_id);

        if (error) throw error;

        setInMyList(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentSlide.content_id!);
          return newSet;
        });
        toast.success('Removed from My List');
      } else {
        const { error } = await supabase
          .from('my_list')
          .insert({
            user_id: user.id,
            content_id: currentSlide.content_id,
          });

        if (error) throw error;

        setInMyList(prev => new Set(prev).add(currentSlide.content_id!));
        toast.success('Added to My List');
      }
    } catch (error) {
      console.error('Error updating list:', error);
      toast.error('Failed to update list');
    }
  };

  // Auto-advance slides with pause functionality
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    timerRef.current = setInterval(() => {
      handleSlideChange('next');
    }, 8000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused, currentIndex]);

  const handleSlideChange = (direction: 'next' | 'prev' | number) => {
    setFadeState('out');
    
    setTimeout(() => {
      if (typeof direction === 'number') {
        setCurrentIndex(direction);
      } else if (direction === 'next') {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
      }
      setFadeState('in');
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        handleSlideChange('next');
      } else {
        handleSlideChange('prev');
      }
    }
  };

  const handleWatchNow = () => {
    const currentSlide = slides[currentIndex];
    if (currentSlide?.id) {
      // Use content_id from slider_settings which is stored in tmdb_id field
      navigate(`/watch/${currentSlide.content_type || 'movie'}/${currentSlide.tmdb_id}`);
    }
  };

  if (loading || slides.length === 0) {
    return (
      <div className="relative w-full aspect-[9/10] bg-muted animate-pulse" />
    );
  }

  const currentSlide = slides[currentIndex];
  const posterUrl = currentSlide.poster_path 
    ? `${TMDB_IMAGE_BASE_URL}${currentSlide.poster_path}` 
    : null;

  return (
    <div 
      className="relative w-full overflow-hidden border-b border-white dark:border-transparent -mt-[env(safe-area-inset-top)]"
      style={{ 
        height: 'calc(60vh + env(safe-area-inset-top))',
        paddingTop: 'env(safe-area-inset-top)'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Poster with Fade Animation */}
      {posterUrl && (
        <div 
          className={cn(
            "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500",
            fadeState === 'in' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundImage: `url(${posterUrl})` }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/50 to-white dark:from-black/40 dark:via-black/60 dark:to-black" />
        </div>
      )}


      {/* Content Container */}
      <div 
        className={cn(
          "absolute inset-0 flex flex-col justify-end pb-6 px-4 transition-opacity duration-500",
          fadeState === 'in' ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Title & Info */}
        <div className="text-center space-y-3 px-2">
          {/* Uppercase Title - 40% smaller, single line with ellipsis */}
          <h1 className="text-lg font-black uppercase text-white tracking-wider drop-shadow-2xl truncate max-w-full">
            {currentSlide.title}
          </h1>

          {/* Rating & Genre */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {currentSlide.popularity && (
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground font-semibold">
                {currentSlide.popularity.toFixed(1)}
              </Badge>
            )}
            {currentSlide.genre && (
              <Badge variant="outline" className="border-white/60 text-white bg-black/40 backdrop-blur-sm font-medium">
                {currentSlide.genre}
              </Badge>
            )}
          </div>

          {/* Navigation Dots - Super thin below tags */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSlideChange(index)}
                className={cn(
                  "h-0.5 rounded-full transition-all duration-300",
                  index === currentIndex 
                    ? "w-8 bg-white" 
                    : "w-4 bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Buttons - Single line */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button 
              size="sm" 
              className="bg-white text-black hover:bg-white/90 font-bold rounded-full h-12 text-xs uppercase tracking-wide px-4"
              onClick={handleWatchNow}
            >
              <Play className="mr-1 h-4 w-4 fill-black" />
              Watch Now
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              className="border-2 border-foreground/80 text-foreground hover:bg-foreground/20 font-bold rounded-full h-12 text-xs uppercase tracking-wide backdrop-blur-sm px-4"
              onClick={handleAddToList}
            >
              {currentSlide.content_id && inMyList.has(currentSlide.content_id) ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  In My List
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  Add to MyList
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHeroBanner;
