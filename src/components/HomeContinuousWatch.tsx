import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import CastMemberDialog from '@/components/cast/CastMemberDialog';
import { getImageUrl } from '@/components/cast/utils';
interface Content {
  id: string;
  title: string;
  overview?: string;
  content_type: 'movie' | 'series' | 'short';
  poster_path?: string;
  backdrop_path?: string;
  popularity?: number;
  genre?: string;
}
interface WatchHistoryItem {
  id: string;
  content_id: string;
  watched_at: string;
  title: string;
  content_type: 'movie' | 'series' | 'short';
  poster_path?: string;
  backdrop_path?: string;
  genre?: string;
  overview?: string;
  popularity?: number;
  tmdb_id?: number;
}
interface CastMember {
  id: string;
  tmdb_id: number;
  name: string;
  character?: string;
  profile_path?: string;
  content_title: string;
}
const HomeContinuousWatch = () => {
  const navigate = useNavigate();
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCastId, setSelectedCastId] = useState<number | null>(null);
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  useEffect(() => {
    fetchContinuousWatch();
    fetchRecentCast();
  }, []);

  // Rotate big poster every 8 hours through top 3 items
  useEffect(() => {
    if (watchHistory.length > 0) {
      const hourOfDay = new Date().getHours();
      const index = Math.floor(hourOfDay / 8) % Math.min(3, watchHistory.length);
      setCurrentPosterIndex(index);
    }
  }, [watchHistory]);
  const fetchContinuousWatch = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        // Fetch most popular content for non-logged users
        const {
          data,
          error
        } = await supabase.from('content').select('id, title, overview, content_type, poster_path, backdrop_path, popularity, genre, tmdb_id').eq('status', 'active').order('popularity', {
          ascending: false
        }).limit(3);
        if (!error && data && data.length > 0) {
          const transformed = data.map(item => ({
            id: item.id,
            content_id: item.id,
            watched_at: new Date().toISOString(),
            title: item.title,
            content_type: item.content_type,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            genre: item.genre,
            overview: item.overview,
            popularity: item.popularity,
            tmdb_id: item.tmdb_id
          })) as WatchHistoryItem[];
          setWatchHistory(transformed);
        }
        setLoading(false);
        return;
      }

      // Fetch recent watch history
      const {
        data: historyData,
        error: historyError
      } = await supabase.from('watch_history').select(`
          id,
          content_id,
          watched_at,
          content:content_id (
            title,
            content_type,
            poster_path,
            backdrop_path,
            popularity,
            genre,
            overview,
            tmdb_id
          )
        `).eq('user_id', user.id).order('watched_at', {
        ascending: false
      }).limit(20);
      if (!historyError && historyData) {
        // Transform and deduplicate by content_id
        const uniqueHistory = new Map<string, WatchHistoryItem>();
        historyData.forEach((item: any) => {
          if (item.content && !uniqueHistory.has(item.content_id)) {
            uniqueHistory.set(item.content_id, {
              id: item.id,
              content_id: item.content_id,
              watched_at: item.watched_at,
              title: item.content.title,
              content_type: item.content.content_type,
              poster_path: item.content.poster_path,
              backdrop_path: item.content.backdrop_path,
              genre: item.content.genre,
              overview: item.content.overview,
              popularity: item.content.popularity,
              tmdb_id: item.content.tmdb_id
            });
          }
        });
        setWatchHistory(Array.from(uniqueHistory.values()).slice(0, 10));
      }
    } catch (err) {
      console.error('Error fetching continuous watch:', err);
    } finally {
      setLoading(false);
    }
  };
  const fetchRecentCast = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent watch history with content details
      const {
        data: historyData
      } = await supabase.from('watch_history').select(`
          content_id,
          content:content_id (
            tmdb_id,
            content_type
          )
        `).eq('user_id', user.id).order('watched_at', {
        ascending: false
      }).limit(5);
      if (!historyData || historyData.length === 0) return;
      const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';
      const castSet = new Map<number, CastMember>();

      // Fetch cast from TMDB for each content
      for (const item of historyData) {
        if (!item.content) continue;
        const content = item.content as any;
        const tmdbId = content.tmdb_id;
        const contentType = content.content_type;
        if (!tmdbId) continue;
        try {
          const endpoint = contentType === 'movie' ? `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}` : `https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
          const response = await fetch(endpoint);
          const data = await response.json();
          if (data.cast) {
            // Get top cast members with profile images
            data.cast.slice(0, 6).forEach((actor: any) => {
              if (actor.profile_path && !castSet.has(actor.id)) {
                castSet.set(actor.id, {
                  id: actor.id.toString(),
                  tmdb_id: actor.id,
                  name: actor.name,
                  profile_path: actor.profile_path,
                  content_title: ''
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching cast for ${contentType} ${tmdbId}:`, error);
        }

        // Limit total cast members
        if (castSet.size >= 20) break;
      }
      setCastMembers(Array.from(castSet.values()).slice(0, 20));
    } catch (err) {
      console.error('Error fetching cast:', err);
    }
  };
  const handleContentClick = (item: WatchHistoryItem) => {
    if (!item.tmdb_id) {
      console.error('No TMDB ID available for content');
      return;
    }
    if (item.content_type === 'series') {
      navigate(`/watch/series/${item.tmdb_id}/1/1`);
    } else if (item.content_type === 'movie') {
      navigate(`/watch/movie/${item.tmdb_id}`);
    } else {
      navigate(`/watch/${item.content_type}/${item.tmdb_id}`);
    }
  };
  if (loading || watchHistory.length === 0) {
    return null;
  }
  const currentContent = watchHistory[currentPosterIndex];
  const backgroundImage = currentContent?.backdrop_path || '';
  return <div className="space-y-0 scale-60 md:scale-100 origin-left">
      {/* Main Container with Background */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        {backgroundImage && <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${backgroundImage})`
      }}>
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/70 dark:from-black/95 dark:via-black/85 dark:to-black/70" />
          </div>}

        {/* Content */}
        <div className="relative p-2 md:p-6 pl-3 md:pl-4 lg:pl-8 pr-3 md:pr-0 px-[15px]">
          {/* Header */}
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-6">
            <div className="h-5 md:h-8 w-1 bg-primary" />
            <h2 className="text-sm md:text-xl lg:text-2xl xl:text-3xl font-bold uppercase tracking-wide text-foreground">
              CONTINUOUS WATCH
            </h2>
          </div>

          {/* Main Content Area - Poster + Right Side (Cards + Cast) */}
          <div className="flex flex-row gap-4 md:gap-6 xl:gap-8 items-start">
            {/* Left: Fixed Main Poster - Responsive */}
            <div className="flex-shrink-0 w-[140px] md:w-[180px] lg:w-[270px] xl:w-[320px] cursor-pointer group" onClick={() => currentContent && handleContentClick(currentContent)}>
              <div className="sticky top-6 rounded-lg overflow-hidden bg-muted border-2 border-border group-hover:border-primary transition-all aspect-[2/3] md:aspect-auto md:h-[284px] lg:h-[407px] xl:h-[473px]" style={{
              maxHeight: '473px'
            }}>
                <img src={currentContent?.poster_path || currentContent?.backdrop_path || '/placeholder.svg'} alt={currentContent?.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent dark:from-black/80" />
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <h3 className="text-white font-bold text-base md:text-lg line-clamp-2">
                    {currentContent?.title}
                  </h3>
                  {currentContent?.genre && <p className="text-gray-300 text-xs md:text-sm mt-1">{currentContent.genre}</p>}
                </div>
              </div>
            </div>

            {/* Right Side: Stacked Layout - Responsive */}
            <div className="flex-1 min-w-0 flex flex-col md:h-[284px] lg:h-[407px] xl:h-[473px]" style={{
            minHeight: '268px'
          }}>
              {/* Recent Watch Cards - Responsive */}
              <div className="flex-1 min-w-0 md:h-[213px] lg:h-[313px] xl:h-[378px]" style={{
              minHeight: '179px'
            }}>
                <div className="relative h-full">
                  {/* Cards Grid - Responsive Columns with Horizontal Scroll */}
                  <div id="continuous-watch-cards" className="grid grid-flow-col auto-cols-[minmax(90%,90%)] md:auto-cols-[minmax(48%,48%)] xl:auto-cols-[minmax(32%,32%)] gap-3 md:gap-6 overflow-x-auto scrollbar-hide h-full" style={{
                  scrollBehavior: 'smooth'
                }}>
                    {watchHistory.map(item => <div key={item.id} onClick={() => handleContentClick(item)} className="cursor-pointer group/card border-2 border-border/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-primary bg-background/60 dark:bg-black/60 backdrop-blur-sm h-full">
                        <div className="flex gap-3 md:gap-6 p-3 md:p-6 h-full">
                          {/* Card Poster */}
                          <div className="flex-shrink-0 w-20 md:w-28 lg:w-32">
                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-lg">
                              <img src={item.poster_path || item.backdrop_path || '/placeholder.svg'} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110" />
                            </div>
                          </div>

                          {/* Card Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2 md:space-y-3">
                            <h4 className="font-bold text-sm md:text-lg lg:text-xl mb-1 md:mb-2 group-hover/card:text-primary transition-colors line-clamp-2 text-foreground">
                              {item.title}
                            </h4>

                            <div className="space-y-1 md:space-y-2 text-xs md:text-base">
                              {/* Type */}
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-muted-foreground font-semibold uppercase text-[10px] md:text-sm">TYPE:</span>
                                <span className="text-foreground/80 capitalize font-medium text-xs md:text-base">
                                  {item.content_type === 'short' ? 'Short' : item.content_type}
                                </span>
                              </div>

                              {/* Genre */}
                              {item.genre && <div className="flex items-center gap-1 md:gap-2">
                                  <span className="text-muted-foreground font-semibold uppercase text-[10px] md:text-sm">GENRE:</span>
                                  <span className="text-foreground/80 line-clamp-1 font-medium text-xs md:text-base">{item.genre}</span>
                                </div>}

                              {/* Rating */}
                              {item.popularity && <div className="flex items-center gap-1 md:gap-2">
                                  <span className="text-muted-foreground font-semibold uppercase text-[10px] md:text-sm">RATING:</span>
                                  <span className="text-primary font-bold text-xs md:text-base">
                                    {(item.popularity / 10).toFixed(1)}
                                  </span>
                                </div>}
                            </div>

                            {/* Description - Hidden on mobile, max 2 lines */}
                            {item.overview && <p className="hidden md:block text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed max-h-[2.8em] overflow-hidden">
                                {item.overview}
                              </p>}
                          </div>
                        </div>
                      </div>)}
                  </div>
                </div>
              </div>

              {/* Cast Section - Responsive */}
              {castMembers.length > 0 && <div className="pt-px">
                  <div className="flex gap-3 md:gap-5 xl:gap-6 overflow-x-auto scrollbar-hide">
                    {castMembers.map(cast => <div key={cast.id} onClick={() => setSelectedCastId(cast.tmdb_id)} className="flex-shrink-0 cursor-pointer group/cast-item flex items-center gap-2 md:gap-3 py-[16px]">
                        <div className="relative w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden bg-muted border-2 md:border-4 border-border group-hover/cast-item:border-primary transition-all shadow-lg flex-shrink-0">
                          <img src={getImageUrl(cast.profile_path)} alt={cast.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/cast-item:scale-110" onError={e => {
                      console.error('Failed to load image:', getImageUrl(cast.profile_path));
                      e.currentTarget.src = '/placeholder.svg';
                    }} />
                        </div>
                        <div className="hidden md:block">
                          <p className="font-bold text-xs md:text-sm text-foreground group-hover/cast-item:text-primary transition-colors line-clamp-1">
                            {cast.name}
                          </p>
                        </div>
                      </div>)}
                  </div>
                </div>}
            </div>
          </div>

        </div>
      </div>

      {/* Cast Member Dialog */}
      {selectedCastId && <CastMemberDialog castMember={{
      id: selectedCastId,
      name: castMembers.find(c => c.tmdb_id === selectedCastId)?.name || '',
      role: '',
      image: getImageUrl(castMembers.find(c => c.tmdb_id === selectedCastId)?.profile_path || ''),
      profile_path: castMembers.find(c => c.tmdb_id === selectedCastId)?.profile_path || null
    }} isOpen={selectedCastId !== null} onClose={() => setSelectedCastId(null)} />}
    </div>;
};
export default HomeContinuousWatch;