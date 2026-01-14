import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Play, List } from 'lucide-react';

interface ShortVideoPlayerProps {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  views: number;
  isActive: boolean;
  showTitle?: string;
  showPoster?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  contentId?: string;
  contentType?: 'movie' | 'series';
  tmdbId?: number;
}

const ShortVideoPlayer = ({
  videoUrl,
  thumbnailUrl,
  title,
  description,
  views,
  isActive,
  showTitle,
  showPoster,
  episodeNumber,
  seasonNumber,
  contentId,
  contentType,
  tmdbId,
}: ShortVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Auto-play/pause when card becomes active
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // Reset to start
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.then(() => setIsPlaying(true)).catch((err) => {
          console.log('Auto-play prevented:', err);
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isMuted]);

  // Apply mute changes without resetting playback
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  // Reset muted state when video source changes
  useEffect(() => {
    setIsMuted(false);
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      const newMutedState = !isMuted;
      video.muted = newMutedState;
      if (!newMutedState) {
        if (video.volume === 0) {
          video.volume = 1;
        }
        const p = video.play();
        if (p && typeof (p as any).catch === 'function') {
          (p as Promise<void>).catch(() => {});
        }
      }
      setIsMuted(newMutedState);
    }
  };

  return (
    <div className="relative w-full h-full bg-black snap-start snap-always flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        loop
        playsInline
        muted={isMuted}
        preload="auto"
        className="w-full h-full object-contain"
        style={{ maxWidth: '100vw', maxHeight: '100vh' }}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={() => setIsMuted(videoRef.current?.muted ?? true)}
      />

      {/* Play/Pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-6 backdrop-blur-sm">
            <Play className="w-12 h-12 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute/Unmute button */}
      <button
        onClick={(e) => toggleMute(e)}
        className="absolute top-4 right-4 bg-black/50 rounded-full p-2.5 backdrop-blur-sm text-white active:scale-95 transition-all hover:bg-black/70 z-10 pointer-events-auto"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>


      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

      {/* Info Section */}
      <div className="absolute bottom-20 left-4 right-20 text-white pb-2 z-10">
        {showTitle && (
          <h3 className="font-bold text-base mb-1 tracking-wide uppercase drop-shadow-lg">{showTitle}</h3>
        )}
        {(seasonNumber || episodeNumber) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const id = tmdbId || contentId;
              if (id) {
                const type = contentType || 'series';
                navigate(`/watch/${type}/${id}/${seasonNumber || 1}/${episodeNumber || 1}`);
              }
            }}
            className="text-sm font-semibold text-white mb-2 tracking-wide uppercase hover:text-primary transition-colors block drop-shadow-lg"
          >
            S{seasonNumber || 1}E{episodeNumber || 1} - {title}
          </button>
        )}
        {description && (
          <p className="text-xs text-white/90 mb-1 line-clamp-2 leading-relaxed drop-shadow-lg">
            {description}
          </p>
        )}
      </div>

      {/* Side Actions */}
      <div className={`absolute right-2 flex flex-col items-center pb-4 z-10 ${
        isTablet ? 'bottom-[45%] gap-6' : 'bottom-24 gap-4'
      }`}>
        {/* Show Poster Circle */}
        {showPoster && (
          <div className="flex flex-col items-center gap-1">
            <div className={`rounded-full overflow-hidden border-2 border-white shadow-lg ${
              isTablet ? 'w-16 h-16' : 'w-11 h-11'
            }`}>
              <img 
                src={showPoster} 
                alt={showTitle}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-0.5 text-white active:scale-95 transition-transform"
        >
          <Heart
            className={`${isTablet ? 'w-10 h-10' : 'w-5 h-5'} ${liked ? 'fill-red-500 text-red-500' : ''}`}
          />
          <span className={`font-medium ${isTablet ? 'text-sm' : 'text-[10px]'}`}>9.5K</span>
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const id = tmdbId || contentId;
            if (id && (seasonNumber || episodeNumber)) {
              const type = contentType || 'series';
              navigate(`/watch/${type}/${id}/${seasonNumber || 1}/${episodeNumber || 1}`);
            } else if (id) {
              navigate(`/watch/${contentType || 'series'}/${id}`);
            }
          }}
          className="flex flex-col items-center gap-0.5 text-white active:scale-95 transition-transform touch-manipulation pointer-events-auto"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className={`flex items-center justify-center bg-white/10 rounded-lg backdrop-blur-sm ${
            isTablet ? 'w-10 h-10' : 'w-5 h-5'
          }`}>
            <List className={isTablet ? 'w-7 h-7' : 'w-3.5 h-3.5'} />
          </div>
          <span className={`font-medium ${isTablet ? 'text-sm' : 'text-[10px]'}`}>Episodes</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-white active:scale-95 transition-transform">
          <MessageCircle className={isTablet ? 'w-10 h-10' : 'w-5 h-5'} />
          <span className={`font-medium ${isTablet ? 'text-sm' : 'text-[10px]'}`}>Comment</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-white active:scale-95 transition-transform">
          <Share2 className={isTablet ? 'w-10 h-10' : 'w-5 h-5'} />
          <span className={`font-medium ${isTablet ? 'text-sm' : 'text-[10px]'}`}>Share</span>
        </button>
      </div>
    </div>
  );
};

export default ShortVideoPlayer;
