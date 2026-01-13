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
  backdrop_path?: string;
  poster_path?: string;
  category?: string;
  content_type?: 'movie' | 'series';
  tmdb_id?: number;
  content_id?: string;
  genre?: string;
  popularity?: number;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface TabletHeroBannerProps {
  page?: 'home' | 'movies' | 'series';
}

const TabletHeroBanner = ({ page = 'home' }: TabletHeroBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [inMyList, setInMyList] = useState<Set<string>>(new Set());
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
            backdrop_path: item.backdrop_path,
            poster_path: item.poster_path,
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

  // Auto-advance slides every 10 seconds with pause functionality
  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    timerRef.current = setInterval(() => {
      handleSlideChange('next');
    }, 10000);

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

  const handlePlayClick = () => {
    const currentSlide = slides[currentIndex];
    if (currentSlide?.tmdb_id) {
      // Use content_id from slider_settings which is stored in tmdb_id field
      navigate(`/watch/${currentSlide.content_type || 'movie'}/${currentSlide.tmdb_id}`);
    }
  };

  if (loading || slides.length === 0) {
    return (
      <div className="relative w-full aspect-video bg-muted animate-pulse" />
    );
  }

  const currentSlide = slides[currentIndex];
  const backdropUrl = currentSlide.backdrop_path 
    ? `${TMDB_IMAGE_BASE_URL}${currentSlide.backdrop_path}` 
    : null;

  return (
    <div 
      className="relative w-full aspect-video overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
    >
      {/* Background Image with Fade Animation */}
      {backdropUrl && (
        <div 
          className={cn(
            "absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500",
            fadeState === 'in' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          {/* Gradient Overlay - black from bottom (100%) to top (0%) */}
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black via-black/70 to-transparent" />
        </div>
      )}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => handleSlideChange('prev')}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => handleSlideChange('next')}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Content Container */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20 max-w-2xl transition-opacity duration-500",
          fadeState === 'in' ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Title */}
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 drop-shadow-2xl">
          {currentSlide.title}
        </h1>

        {/* Genre & Rating */}
        <div className="flex items-center gap-2 mb-2">
          {currentSlide.popularity && (
            <Badge variant="secondary" className="bg-primary/90 text-primary-foreground font-semibold text-xs">
              ★ {currentSlide.popularity.toFixed(1)}
            </Badge>
          )}
          {currentSlide.genre && (
            <Badge variant="outline" className="border-white/60 text-white bg-black/40 backdrop-blur-sm font-medium text-xs">
              {currentSlide.genre}
            </Badge>
          )}
        </div>

        {/* Description */}
        {currentSlide.overview && (
          <p className="text-xs md:text-sm text-white/90 mb-4 line-clamp-2 max-w-xl drop-shadow-lg">
            {currentSlide.overview}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            size="sm" 
            onClick={handlePlayClick}
            className="gap-1.5 transition-all duration-200 hover:scale-105 shadow-lg text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            Play
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={handleAddToList}
            className="gap-1.5 transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm text-sm"
          >
            {currentSlide.content_id && inMyList.has(currentSlide.content_id) ? (
              <>
                <Check className="w-4 h-4" />
                In My List
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add To MyList
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-6 bg-white" 
                  : "w-3 bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TabletHeroBanner;
