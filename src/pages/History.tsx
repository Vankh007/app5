import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Film, Tv, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface WatchHistory {
  id: string;
  content_id: string;
  episode_id?: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  type: 'movie' | 'series';
  watched_at: string;
  progress?: number;
  overview?: string;
  genre?: string;
  rating?: number;
  episode_title?: string;
  episode_number?: number;
  season_number?: number;
}

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWatchHistory();
    }
  }, [user]);

  const fetchWatchHistory = async () => {
    try {
      setLoading(true);
      
      const { data: historyData, error: historyError } = await supabase
        .from('watch_history')
        .select(`
          *,
          content:content_id (
            id,
            title,
            poster_path,
            backdrop_path,
            content_type,
            overview,
            genre,
            popularity
          ),
          episode:episode_id (
            id,
            title,
            episode_number,
            season_id
          )
        `)
        .eq('user_id', user?.id)
        .order('watched_at', { ascending: false });

      if (historyError) {
        console.error('Watch history error:', historyError);
        toast.error('Failed to load watch history');
        return;
      }

      // Get unique season IDs to fetch season numbers
      const seasonIds = new Set(
        historyData
          ?.map((item: any) => item.episode?.season_id)
          .filter(Boolean)
      );

      // Fetch season information
      let seasonsMap = new Map();
      if (seasonIds.size > 0) {
        const { data: seasonsData } = await supabase
          .from('seasons')
          .select('id, season_number')
          .in('id', Array.from(seasonIds));
        
        seasonsData?.forEach((season: any) => {
          seasonsMap.set(season.id, season.season_number);
        });
      }

      // Deduplicate by content_id
      const deduplicatedHistory: WatchHistory[] = [];
      const seenContentIds = new Set<string>();
      
      historyData?.forEach((item: any) => {
        if (!seenContentIds.has(item.content_id)) {
          seenContentIds.add(item.content_id);
          deduplicatedHistory.push({
            id: item.id,
            content_id: item.content_id,
            episode_id: item.episode_id,
            title: item.content?.title || 'Unknown',
            poster_path: item.content?.poster_path,
            backdrop_path: item.content?.backdrop_path,
            type: item.content?.content_type === 'series' ? 'series' : 'movie',
            watched_at: item.watched_at,
            progress: item.progress_percentage,
            overview: item.content?.overview,
            genre: item.content?.genre,
            rating: item.content?.popularity ? Math.min(item.content.popularity / 100, 10) : undefined,
            episode_title: item.episode?.title,
            episode_number: item.episode?.episode_number,
            season_number: item.episode?.season_id ? seasonsMap.get(item.episode.season_id) : undefined,
          });
        }
      });

      setWatchHistory(deduplicatedHistory);
    } catch (error) {
      console.error('Error fetching watch history:', error);
      toast.error('Failed to load watch history');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Watch History</h1>
            <p className="text-muted-foreground">Your recently watched content</p>
          </div>
        </div>

        {/* Watch History List */}
        {watchHistory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No watch history yet</h3>
              <p className="text-muted-foreground mb-6">Start watching to see your history here</p>
              <Button onClick={() => navigate('/')}>
                Browse Content
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {watchHistory.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-xl transition-all overflow-hidden border-0 group rounded-xl"
                onClick={() => navigate(`/watch/${item.type}/${item.content_id}`)}
              >
                <div className="relative h-44 sm:h-48 md:h-52 overflow-hidden">
                  {/* Backdrop Background */}
                  <div className="absolute inset-0">
                    {item.backdrop_path || item.poster_path ? (
                      <img
                        src={item.backdrop_path || item.poster_path}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
                  </div>

                  {/* Content Container */}
                  <div className="relative h-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5">
                    {/* Small Poster */}
                    <div className="w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl">
                      {item.poster_path ? (
                        <img
                          src={item.poster_path}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-muted/20">
                          {item.type === 'movie' ? (
                            <Film className="h-6 w-6 sm:h-8 sm:w-8 text-white/50" />
                          ) : (
                            <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-white/50" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-3 min-w-0">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-white line-clamp-1">
                        {item.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/70">TYPE :</span>
                          <span className="text-white font-medium">
                            {item.type === 'series' ? 'Series' : 'Movie'}
                          </span>
                        </div>
                        {item.genre && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/70">GENRE :</span>
                            <span className="text-white font-medium line-clamp-1">{item.genre}</span>
                          </div>
                        )}
                        {item.rating && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/70">RATING :</span>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500 font-bold">{item.rating.toFixed(1)}</span>
                              <div className="flex">
                                {[1, 2, 3].map((star) => (
                                  <span key={star} className="text-yellow-500 text-sm">★</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Episode Info for Series */}
                      {item.type === 'series' && item.episode_number && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white/70" />
                          <span className="text-white/90 line-clamp-1">
                            Currently watching: 
                            {item.season_number && ` S${item.season_number}`}
                            {` E${item.episode_number}`}
                            {item.episode_title && ` - ${item.episode_title}`}
                          </span>
                        </div>
                      )}

                      {item.overview && (
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-2 hidden sm:block">
                          {item.overview}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {item.progress && item.progress > 0 && (
                        <div className="space-y-1">
                          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-600 transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/60">
                            {item.progress.toFixed(0)}% watched
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Play Button */}
                    <Button 
                      size="icon" 
                      className="flex-shrink-0 rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-red-600 hover:bg-red-700 shadow-lg group-hover:scale-110 transition-transform"
                    >
                      <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
