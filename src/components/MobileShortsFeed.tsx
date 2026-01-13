import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import ShortVideoPlayer from './ShortVideoPlayer';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

interface Short {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  views: number;
  content_id?: string;
  season_id?: string;
  episode_id?: string;
  content?: {
    title: string;
    poster_path?: string;
    tmdb_id?: number;
  };
  episodes?: {
    episode_number: number;
  };
  seasons?: {
    season_number: number;
  };
}

const MobileShortsFeed = () => {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Allow landscape orientation for video playback
  useScreenOrientation(true);

  useEffect(() => {
    fetchShorts();
  }, []);

  const fetchShorts = async () => {
    const { data, error } = await supabase
      .from('shorts')
      .select(`
        *,
        content(title, poster_path, tmdb_id),
        episodes(episode_number),
        seasons(season_number)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shorts:', error);
    }
    
    if (data) {
      setShorts(data);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolling(true);
      
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const index = Math.round(scrollTop / windowHeight);
      
      // Immediately update index for faster response
      if (index !== currentIndex && index >= 0 && index < shorts.length) {
        setCurrentIndex(index);
      }

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set new timeout to detect scroll end and snap
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        // Snap to nearest video after scroll ends
        const targetScroll = index * windowHeight;
        if (Math.abs(container.scrollTop - targetScroll) > 5) {
          container.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial play on mount
    setIsScrolling(false);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentIndex, shorts.length]);

  if (shorts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <p>Loading shorts...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black scroll-smooth"
      style={{ 
        scrollbarWidth: 'none', 
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {shorts.map((short, index) => (
        <div key={short.id} className="h-screen w-full">
          <ShortVideoPlayer
            id={short.id}
            videoUrl={short.video_url}
            thumbnailUrl={short.thumbnail_url}
            title={short.title}
            description={short.description}
            views={short.views || 0}
            isActive={index === currentIndex && !isScrolling}
            showTitle={short.content?.title}
            showPoster={short.content?.poster_path}
            episodeNumber={short.episodes?.episode_number}
            seasonNumber={short.seasons?.season_number}
            contentId={short.content_id}
            contentType={(short.content as any)?.type as 'movie' | 'series' | undefined}
            tmdbId={short.content?.tmdb_id}
          />
        </div>
      ))}
    </div>
  );
};

export default MobileShortsFeed;
