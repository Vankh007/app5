import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Play, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CastMember {
  name: string;
  profile_path: string;
}

interface HeroSlide {
  id: string;
  title: string;
  description?: string;
  overview?: string;
  banner_url?: string;
  backdrop_path?: string;
  poster_path?: string;
  category?: string;
  content_type?: 'movie' | 'series';
  tmdb_id?: number;
  content_id?: string;
  order_index?: number;
  trailer_url?: string;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const getImageUrl = (item: HeroSlide): string | null => {
  if (item.banner_url) return item.banner_url;
  if (item.backdrop_path) return `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}`;
  if (item.poster_path) return `${TMDB_IMAGE_BASE_URL}${item.poster_path}`;
  return null;
};

const getDescription = (item: HeroSlide): string => {
  return item.description || item.overview || '';
};

interface HeroBannerProps {
  page?: 'home' | 'movies' | 'series';
}

const HeroBanner = ({ page = 'home' }: HeroBannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [inMyList, setInMyList] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        // Fetch from slider_settings table
        let query = supabase
          .from('slider_settings')
          .select('*')
          .eq('status', 'active');

        // For non-home pages, filter by section
        // For home, show all active slides
        if (page !== 'home') {
          query = query.eq('section', page);
        }

        const { data, error } = await query
          .order('position', { ascending: true })
          .limit(5);

        if (error) {
          console.error('Error fetching hero slides:', error);
        } else if (data) {
          const toEmbedUrl = (youtubeId?: string | null) =>
            youtubeId
              ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0&playsinline=1`
              : null;

          const baseSlides = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            overview: item.description,
            backdrop_path: item.backdrop_path,
            poster_path: item.poster_path,
            banner_url: item.image_url,
            content_type: item.content_type,
            content_id: item.content_id,
            trailer_url: item.trailer_self_hosted || toEmbedUrl(item.trailer_youtube_id),
          })) as HeroSlide[];

          setSlides(baseSlides);
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

  // Check for trailer and play after 4 seconds
  useEffect(() => {
    setShowTrailer(false);
    setTrailerUrl(null);
    
    const currentSlide = slides[currentIndex];
    if (!currentSlide?.trailer_url) return;

    const url = currentSlide.trailer_url;
    const timer = setTimeout(() => {
      setTrailerUrl(url || null);
      setShowTrailer(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setShowTrailer(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setShowTrailer(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setShowTrailer(false);
  };

  const handlePlayClick = () => {
    const currentSlide = slides[currentIndex];
    if (currentSlide.content_id) {
      // Use content_id directly from slider_settings
      navigate(`/watch/${currentSlide.content_type || 'movie'}/${currentSlide.content_id}`);
    }
  };

  if (loading) {
    return <div className="h-[60vh] md:h-[70vh] bg-muted animate-pulse" />;
  }

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];
  const imageUrl = getImageUrl(currentSlide);
  const description = getDescription(currentSlide);

  return (
    <div className="relative h-[69vh] md:h-[55vh] lg:h-[70vh] xl:h-[75vh] mx-0 -mt-16 mb-6 lg:mx-0 overflow-hidden group max-w-full">
      {/* Background Images/Video with Transition */}
      <div className="absolute inset-0">
        {showTrailer && trailerUrl ? (
          trailerUrl.includes('youtube.com') ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <iframe
                key={trailerUrl}
                src={trailerUrl}
                title={`${currentSlide.title} trailer`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0"
                style={{
                  width: '300%',
                  height: '300%',
                  minWidth: '100%',
                  minHeight: '100%'
                }}
              />
            </div>
          ) : (
            <video
              key={trailerUrl}
              src={trailerUrl}
              autoPlay
              muted
              loop
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          )
        ) : (
          slides.map((slide, index) => {
            const slideImageUrl = getImageUrl(slide);
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {slideImageUrl ? (
                  <img
                    src={slideImageUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
      {/* Left gradient overlay - 40% width, Desktop only */}
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-background/50 via-background/30 to-transparent z-10" />

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 xl:p-12 z-20 max-w-3xl xl:max-w-4xl 2xl:max-w-5xl">
        <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-2 drop-shadow-lg">
          {currentSlide.title}
        </h1>
        {currentSlide.category && (
          <Badge variant="secondary" className="mb-3 text-xs">{currentSlide.category}</Badge>
        )}
        {description && (
          <p className="text-base md:text-lg xl:text-xl text-white/90 mb-4 xl:mb-6 line-clamp-2 xl:line-clamp-3">
            {description}
            {description.length > 150 && <span className="text-white/70 ml-1">... Read more</span>}
          </p>
        )}
        <div className="flex gap-3 md:gap-4">
          <Button 
            size="lg" 
            onClick={handlePlayClick}
            className="gap-2 transition-all duration-200 hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-0"
          >
            <Play className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Play</span>
          </Button>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={handleAddToList}
            className="gap-2 transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm focus:outline-none focus-visible:ring-0"
          >
            {currentSlide.content_id && inMyList.has(currentSlide.content_id) ? (
              <>
                <Check className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">In My List</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Add To MyList</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 md:right-8 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all focus:outline-none ${
                index === currentIndex 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroBanner;
