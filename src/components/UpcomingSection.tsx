import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Play, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TrailerDialog } from './admin/TrailerDialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

function CountdownTimer({ targetDate, compact = false }: { targetDate: string; compact?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        };
      }
      return null;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return <span className="text-[10px] text-primary font-medium">Available now!</span>;
  }

  if (compact) {
    return (
      <span className="text-[10px] text-primary font-medium">
        {timeLeft.days}d {timeLeft.hours}h
      </span>
    );
  }

  return (
    <div className="flex gap-1 text-center">
      <div className="bg-primary rounded px-1.5 py-0.5">
        <div className="text-[10px] font-bold text-primary-foreground">{timeLeft.days}d</div>
      </div>
      <div className="bg-primary rounded px-1.5 py-0.5">
        <div className="text-[10px] font-bold text-primary-foreground">{timeLeft.hours}h</div>
      </div>
      <div className="bg-primary rounded px-1.5 py-0.5">
        <div className="text-[10px] font-bold text-primary-foreground">{timeLeft.minutes}m</div>
      </div>
    </div>
  );
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface UpcomingSectionProps {
  className?: string;
}

export function UpcomingSection({ className }: UpcomingSectionProps = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [trailerDialogOpen, setTrailerDialogOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<string>('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['upcoming-releases-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select(`
          *,
          content:content_id (
            trailers (
              youtube_id,
              self_hosted_url
            )
          )
        `)
        .eq('status', 'upcoming')
        .order('release_date', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error('Error fetching upcoming releases:', error);
        throw error;
      }
      
      return data;
    },
  });

  const handlePlayTrailer = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const trailers = item?.content?.trailers;
    if (trailers && trailers.length > 0) {
      const trailer = trailers[0];
      const trailerUrl = trailer.youtube_id 
        ? `https://www.youtube.com/embed/${trailer.youtube_id}?autoplay=1`
        : trailer.self_hosted_url;
      
      if (trailerUrl) {
        setSelectedTrailer(trailerUrl);
        setTrailerDialogOpen(true);
      } else {
        toast.error('Trailer not available');
      }
    } else {
      toast.error('No trailer available for this content');
    }
  };

  const handleReserve = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to reserve content');
      return;
    }

    try {
      const { error } = await supabase
        .from('my_list')
        .insert({
          user_id: user.id,
          content_id: item.content_id || item.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Already reserved');
        } else {
          throw error;
        }
      } else {
        toast.success('Reserved successfully');
      }
    } catch (error) {
      console.error('Error reserving:', error);
      toast.error('Failed to reserve');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-[1px]">
          <h2 className="text-lg font-bold text-foreground">Coming Soon</h2>
        </div>
        <div className="flex gap-2 px-[1px] pb-2 overflow-x-auto scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-28 aspect-[2/3.7] md:w-44 md:aspect-[2/3] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!items?.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-[1px] md:px-0">
        <h2 className="text-lg md:text-xl font-bold text-foreground">Coming Soon</h2>
        <button
          onClick={() => navigate('/upcoming')}
          className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium text-xs group"
        >
          See all
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Horizontal Scrolling Content */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 md:gap-4 px-[1px] md:px-0 pb-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative flex-shrink-0 w-28 aspect-[2/3.7] md:w-44 md:aspect-[2/3] rounded-lg overflow-hidden group cursor-pointer"
            >
              {/* Poster */}
              {item.poster_path ? (
                <img
                  src={item.poster_path.startsWith('http') ? item.poster_path : `${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-center px-2">{item.title}</span>
                </div>
              )}

              {/* Countdown Badge */}
              <div className="absolute top-2 left-2 right-2">
                <CountdownTimer targetDate={item.release_date} compact={isMobile} />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-2 left-2 right-2 space-y-1">
                <p className="text-xs font-medium text-white line-clamp-2">{item.title}</p>
                
                {/* Action Buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => handlePlayTrailer(item, e)}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-primary hover:bg-primary/80 transition-colors"
                  >
                    <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                  </button>
                  <button
                    onClick={(e) => handleReserve(item, e)}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Heart className="h-3 w-3 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        
      <TrailerDialog
        open={trailerDialogOpen}
        onOpenChange={setTrailerDialogOpen}
        trailerUrl={selectedTrailer}
      />
    </div>
  );
}
