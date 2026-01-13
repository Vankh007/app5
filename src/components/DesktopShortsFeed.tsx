import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Volume2, VolumeX, Heart, MessageCircle, Share2, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Short {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  views: number;
  show_title: string | null;
  show_poster: string | null;
  episode_number: number | null;
  season_number: number | null;
  content_id: string | null;
  content_type: 'movie' | 'series' | null;
  tmdb_id: number | null;
}

const DesktopShortsFeed = () => {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    fetchShorts();
  }, []);

  const fetchShorts = async () => {
    try {
      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setShorts(data);
      }
    } catch (error) {
      console.error('Error fetching shorts:', error);
      setHasError(true);
    }
  };

  // Handle smooth scroll navigation
  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (isTransitioning) return;
    
    const canScrollDown = direction === 'down' && currentIndex < shorts.length - 1;
    const canScrollUp = direction === 'up' && currentIndex > 0;
    
    if (!canScrollDown && !canScrollUp) return;

    // Pause current video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    // Start transition
    setIsTransitioning(true);

    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Change video after fade out
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev => direction === 'down' ? prev + 1 : prev - 1);
      setHasError(false);
      
      // End transition and auto-play
      setTimeout(() => {
        setIsTransitioning(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }, 100);
    }, 300);
  }, [currentIndex, shorts.length, isTransitioning]);

  // Handle wheel scroll with debouncing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollTime = 0;
    const scrollDebounceDelay = 600; // Prevent rapid scrolling

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const now = Date.now();
      if (now - lastScrollTime < scrollDebounceDelay) return;
      
      lastScrollTime = now;

      if (e.deltaY > 0) {
        handleScroll('down');
      } else if (e.deltaY < 0) {
        handleScroll('up');
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleScroll]);

  // Optimize mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle video errors
  const handleVideoError = useCallback(() => {
    console.error('Video playback error');
    setHasError(true);
    setIsPlaying(false);
  }, []);

  // Handle video loaded
  const handleVideoLoaded = useCallback(() => {
    setHasError(false);
    if (!isTransitioning && videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isTransitioning]);

  const togglePlay = useCallback(() => {
    if (videoRef.current && !hasError) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [isPlaying, hasError]);

  const toggleMute = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMuted(prev => !prev);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Unable to load shorts</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading shorts...</p>
        </div>
      </div>
    );
  }

  const currentShort = shorts[currentIndex];

  return (
    <div
      ref={containerRef}
      className="h-screen w-full bg-black flex items-center justify-center overflow-hidden relative"
    >
      {/* Video Container - 9:16 Portrait Aspect Ratio */}
      <div className="relative h-full flex items-center justify-center transition-opacity duration-300" style={{ opacity: isTransitioning ? 0 : 1 }}>
        <div className="relative h-full" style={{ aspectRatio: '9/16', maxHeight: '100vh' }}>
          <video
            ref={videoRef}
            key={currentShort.id}
            src={currentShort.video_url}
            poster={currentShort.thumbnail_url || undefined}
            loop
            playsInline
            muted={isMuted}
            preload="auto"
            className="w-full h-full object-cover bg-black"
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={handleVideoError}
            onLoadedData={handleVideoLoaded}
          />

          {/* Play/Pause indicator */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-full p-8 backdrop-blur-sm">
                <Play className="w-16 h-16 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Mute/Unmute button */}
          <button
            onClick={toggleMute}
            className="absolute top-6 right-6 bg-black/50 rounded-full p-3 backdrop-blur-sm text-white hover:bg-black/70 transition-all z-10"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </button>

          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

          {/* Info Section */}
          <div className="absolute bottom-8 left-8 right-32 text-white z-10">
            {currentShort.show_title && (
              <h3 className="font-bold text-2xl mb-2 tracking-wide uppercase drop-shadow-lg">
                {currentShort.show_title}
              </h3>
            )}
            {(currentShort.season_number || currentShort.episode_number) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const id = currentShort.tmdb_id || currentShort.content_id;
                  if (id) {
                    const type = currentShort.content_type || 'series';
                    navigate(`/watch/${type}/${id}/${currentShort.season_number || 1}/${currentShort.episode_number || 1}`);
                  }
                }}
                className="text-lg font-semibold text-white mb-3 tracking-wide uppercase hover:text-primary transition-colors block drop-shadow-lg"
              >
                S{currentShort.season_number || 1}E{currentShort.episode_number || 1} - {currentShort.title}
              </button>
            )}
            {currentShort.description && (
              <p className="text-sm text-white/90 mb-2 line-clamp-2 leading-relaxed drop-shadow-lg max-w-2xl">
                {currentShort.description}
              </p>
            )}
          </div>

          {/* Side Actions */}
          <div className="absolute right-8 bottom-24 flex flex-col items-center gap-6 z-10">
            {/* Show Poster */}
            {currentShort.show_poster && (
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <img 
                  src={currentShort.show_poster} 
                  alt={currentShort.show_title || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <button
              onClick={() => setLiked(!liked)}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
            >
              <div className="bg-black/30 rounded-full p-3 backdrop-blur-sm">
                <Heart className={`w-7 h-7 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              </div>
              <span className="text-sm font-medium">9.5K</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                const id = currentShort.tmdb_id || currentShort.content_id;
                if (id && (currentShort.season_number || currentShort.episode_number)) {
                  const type = currentShort.content_type || 'series';
                  navigate(`/watch/${type}/${id}/${currentShort.season_number || 1}/${currentShort.episode_number || 1}`);
                } else if (id) {
                  navigate(`/watch/${currentShort.content_type || 'series'}/${id}`);
                }
              }}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform"
            >
              <div className="bg-black/30 rounded-full p-3 backdrop-blur-sm">
                <List className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium">Episodes</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform">
              <div className="bg-black/30 rounded-full p-3 backdrop-blur-sm">
                <MessageCircle className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium">Comment</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-white hover:scale-110 transition-transform">
              <div className="bg-black/30 rounded-full p-3 backdrop-blur-sm">
                <Share2 className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          {/* Navigation Indicators */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-1.5 z-10">
            {shorts.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-8 bg-white' 
                    : 'w-1 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      {currentIndex === 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-bounce pointer-events-none">
          Scroll to see more
        </div>
      )}
    </div>
  );
};

export default DesktopShortsFeed;
