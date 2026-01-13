import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, SkipForward, ExternalLink, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoAd {
  id: string;
  name: string;
  video_url: string;
  thumbnail_url: string | null;
  click_url: string | null;
  duration_seconds: number;
  skip_after_seconds: number;
}

interface VideoAdPlayerProps {
  ad: VideoAd;
  onAdComplete: () => void;
  onSkip: () => void;
  onImpression: (adId: string) => void;
  onClick: (adId: string) => void;
  canSkipImmediately?: boolean;
  adIndex?: number;
  totalAds?: number;
}

export const VideoAdPlayer = ({ 
  ad, 
  onAdComplete, 
  onSkip, 
  onImpression,
  onClick,
  canSkipImmediately = false,
  adIndex = 1,
  totalAds = 1
}: VideoAdPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [countdown, setCountdown] = useState(canSkipImmediately ? 0 : ad.skip_after_seconds);
  const [canSkip, setCanSkip] = useState(canSkipImmediately);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(ad.duration_seconds || 0);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const isMobile = useIsMobile();

  // Extract domain from click_url
  const getDomain = (url: string | null) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    const remaining = duration - currentTime;
    return formatTime(Math.max(0, remaining));
  };

  // Track impression when ad starts playing
  useEffect(() => {
    if (!hasTrackedImpression) {
      onImpression(ad.id);
      setHasTrackedImpression(true);
    }
  }, [ad.id, onImpression, hasTrackedImpression]);

  // Countdown timer for skip button
  useEffect(() => {
    if (canSkipImmediately) {
      setCanSkip(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canSkipImmediately]);

  // Update progress from video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      onAdComplete();
    };

    const handleError = () => {
      console.error('Ad video failed to load');
      onAdComplete();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    video.play().catch(() => {
      onAdComplete();
    });

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onAdComplete]);

  // Update mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleAdClick = () => {
    if (ad.click_url) {
      onClick(ad.id);
      window.open(ad.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onSkip();
  };

  const domain = getDomain(ad.click_url);

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col landscape:flex-row landscape:items-center landscape:justify-center">
        {/* Video Container */}
        <div className="relative flex-1 w-full h-full landscape:flex-none landscape:w-full landscape:h-full">
          <video
            ref={videoRef}
            src={ad.video_url}
            className="w-full h-full object-contain landscape:object-cover"
            playsInline
            muted={isMuted}
            onClick={handleAdClick}
          />

          {/* Visit Advertiser - Top Right */}
          {ad.click_url && (
            <button
              className="absolute top-3 right-3 text-white/90 text-xs font-medium hover:text-white"
              onClick={handleAdClick}
            >
              Visit Advertiser
            </button>
          )}

          {/* Controls - Top Left - Horizontal layout */}
          <div className="absolute top-3 left-3 flex flex-row items-center gap-2">
            <button
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white bg-black/30 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* No logo overlay on mobile - cleaner fullscreen experience */}

          {/* Bottom Bar - Sponsored info and Skip */}
          <div className="absolute bottom-0 left-0 right-0">
            {/* Sponsored Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
              {/* Left side - Sponsored info */}
              <div className="flex items-center gap-1.5 text-white text-xs">
                <span className="bg-[#ffcc00] text-black font-medium px-1 py-0.5 rounded-sm text-[10px]">
                  Sponsored
                </span>
                <button className="w-4 h-4 rounded-full border border-white/50 flex items-center justify-center">
                  <span className="text-[9px]">i</span>
                </button>
                {totalAds > 1 && (
                  <span className="text-white/80">• {adIndex} of {totalAds}</span>
                )}
                <span className="text-white/80">• {getRemainingTime()}</span>
              </div>

              {/* Right side - Skip button */}
              {canSkip ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border border-white/60 text-white hover:bg-white/20 font-medium text-xs px-3 h-7 rounded-sm gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip();
                  }}
                >
                  Skip
                  <SkipForward className="h-3 w-3" />
                </Button>
              ) : (
                <div className="bg-white/10 border border-white/30 text-white text-xs px-3 py-1.5 rounded-sm">
                  Skip in {countdown}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-white/30">
              <div 
                className="h-full bg-[#ff0000] transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    );
  }

  // Desktop/Tablet Layout
  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      {/* Video Container */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          src={ad.video_url}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          muted={isMuted}
          onClick={handleAdClick}
        />
        
        {/* YouTube-style Bottom Left Info Card */}
        {ad.click_url && (
          <div 
            className="absolute bottom-20 left-4 flex items-center gap-3 bg-[#212121]/95 backdrop-blur-sm rounded-lg px-3 py-2.5 cursor-pointer hover:bg-[#2d2d2d] transition-colors group"
            onClick={handleAdClick}
          >
            {/* Ad Thumbnail/Logo */}
            {ad.thumbnail_url ? (
              <img 
                src={ad.thumbnail_url} 
                alt={ad.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
            )}
            
            {/* Info Text */}
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-medium truncate max-w-[180px]">
                {ad.name}
              </span>
              <span className="text-gray-400 text-xs truncate max-w-[180px]">
                {domain}
              </span>
            </div>
            
            {/* CTA Button */}
            <Button
              size="sm"
              className="bg-white text-black hover:bg-gray-200 font-medium text-xs px-4 h-8 rounded-sm ml-2"
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick();
              }}
            >
              Visit Site
            </Button>
          </div>
        )}

        {/* Sponsored Label - YouTube style */}
        <div className="absolute bottom-12 left-4 flex items-center gap-2 text-xs">
          <span className="bg-[#ffcc00] text-black font-medium px-1.5 py-0.5 rounded-sm">
            Sponsored
          </span>
          <span className="text-white/80 flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/40">
              <span className="text-[10px]">i</span>
            </span>
            {totalAds > 1 && (
              <span>• {adIndex} of {totalAds}</span>
            )}
            {domain && <span className="ml-1">{domain}</span>}
          </span>
        </div>

        {/* Skip Button - YouTube style (Right side) */}
        <div className="absolute bottom-16 right-4">
          {canSkip ? (
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-2 border-white/80 text-white hover:bg-white/10 hover:border-white font-medium px-4 h-10 rounded-sm gap-2"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
            >
              Skip
              <SkipForward className="h-4 w-4" />
            </Button>
          ) : (
            <div className="bg-[#212121]/90 border border-white/20 text-white text-sm px-4 py-2 rounded-sm flex items-center gap-2">
              <span>Video will play after ad</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* Volume Control - Bottom left */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          
          {/* Time Display */}
          <span className="text-white text-xs font-medium ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Progress Bar - YouTube yellow/red style */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 group cursor-pointer">
        <div 
          className="h-full bg-[#ff0000] transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        {/* Hover scrubber dot */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#ff0000] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
    </div>
  );
};
