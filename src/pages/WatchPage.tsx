import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Film, Tv, ThumbsUp, ThumbsDown, Share2, LayoutDashboard, Sparkles, MessageSquare, Info, ChevronDown, Wallet, Crown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoPlayer from "@/components/VideoPlayer";
import { useIsTablet } from "@/hooks/use-tablet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTabletLandscape } from "@/hooks/use-tablet-landscape";
import { CommentsSection } from "@/components/CommentsSection";
import { useDeviceSession } from "@/hooks/useDeviceSession";
import { DeviceLimitWarning } from "@/components/DeviceLimitWarning";
import { useSwipeScroll } from "@/hooks/useSwipeScroll";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { CastSkeleton, EpisodesSkeleton, RecommendedSkeleton } from "@/components/watch/ContentSkeleton";
import { ActionButtons } from "@/components/watch/ActionButtons";
import { SocialShareMeta } from "@/components/SocialShareMeta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WalletSection } from "@/components/wallet/WalletSection";
import { SubscriptionDialog } from "@/components/subscription/SubscriptionDialog";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import CastMemberDialog from "@/components/movie/CastMemberDialog";
import { useProfileImage } from "@/hooks/useProfileImage";
import { useContentData, Content } from "@/hooks/useContentData";
import { NativeBannerAdSlot } from "@/components/ads/NativeBannerAdSlot";
import { useIframeFullscreenHandler, useFullscreenState } from "@/hooks/useFullscreenState";
import { Capacitor } from "@capacitor/core";

interface Episode {
  id: string;
  episode_number: number;
  title: string;
  still_path?: string;
  season_id?: string;
  show_id?: string;
  access_type?: 'free' | 'membership' | 'purchase';
  price?: number;
}

// Collapsible Tabs Section Component for Desktop Right Sidebar
interface CollapsibleTabsSectionProps {
  isSeriesContent: boolean;
  seasons: any[];
  selectedSeasonId: string | null;
  setSelectedSeasonId: (id: string) => void;
  episodes: Episode[];
  episodesLoading: boolean;
  content: Content | null;
  currentEpisode: Episode | null;
  fetchVideoSource: (episodeId: string) => void;
  getProgressPercentage: (episodeId: string) => number;
  forYouContent: any[];
  navigate: (path: string) => void;
}

const CollapsibleTabsSection = ({
  isSeriesContent,
  seasons,
  selectedSeasonId,
  setSelectedSeasonId,
  episodes,
  episodesLoading,
  content,
  currentEpisode,
  fetchVideoSource,
  getProgressPercentage,
  forYouContent,
  navigate,
}: CollapsibleTabsSectionProps) => {
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  
  // Filter episodes by selected season
  const filteredEpisodes = useMemo(() => {
    if (!selectedSeasonId) return episodes;
    return episodes.filter(ep => ep.season_id === selectedSeasonId);
  }, [episodes, selectedSeasonId]);

  return (
    <Tabs defaultValue="episodes" className="w-full">
      {/* Tabs - Text only, no icons as per reference */}
      <TabsList className="w-full justify-center bg-transparent border-b rounded-none h-auto p-0">
        {isSeriesContent && (
          <TabsTrigger 
            value="episodes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:py-2"
          >
            Episodes
          </TabsTrigger>
        )}
        <TabsTrigger 
          value="foryou"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:py-2"
        >
          For You
        </TabsTrigger>
        <TabsTrigger 
          value="comments"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:py-2"
        >
          Comments
        </TabsTrigger>
        <TabsTrigger 
          value="detail"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:py-2"
        >
          Detail
        </TabsTrigger>
        <TabsTrigger 
          value="home"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-1.5 text-xs sm:text-sm sm:px-3 sm:py-2"
        >
          Home
        </TabsTrigger>
      </TabsList>

      {/* Episodes Tab Content */}
      <TabsContent value="episodes" className="mt-0">
        {/* Series Banner - Landscape Backdrop with poster overlay */}
        {isSeriesContent && content && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-lg overflow-hidden cursor-pointer"
            onClick={() => setEpisodesExpanded(!episodesExpanded)}
          >
            <img 
              src={content.backdrop_path || content.poster_path || "/placeholder.svg"} 
              alt={content.title}
              className="w-full aspect-[16/6.75] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
              {/* Series Poster */}
              <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-white/20">
                <img 
                  src={content.poster_path || "/placeholder.svg"} 
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Title and Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">{content.title}</p>
                <p className="text-sm text-primary font-medium">
                  {currentEpisode ? `Watching S${seasons.find(s => s.id === selectedSeasonId)?.season_number || 1} EP${currentEpisode.episode_number}` : 'Watching'}
                </p>
                <p className="text-xs text-white/70">
                  {filteredEpisodes.length} Episodes
                </p>
              </div>
              {/* More Episodes + Expand Icon */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-white/80 font-medium">More Episodes</span>
                <motion.div
                  animate={{ rotate: episodesExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/20 rounded-full p-1.5 backdrop-blur-sm"
                >
                  <ChevronDown className="h-4 w-4 text-white" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Expanded Episodes Grid */}
        <AnimatePresence mode="wait">
          {isSeriesContent && episodesExpanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden mt-3"
            >
              {/* Season Selector */}
              {seasons.length > 1 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {seasons.map((season) => (
                    <Button
                      key={season.id}
                      variant={selectedSeasonId === season.id ? "default" : "outline"}
                      size="sm"
                      className={`h-8 px-4 text-sm ${selectedSeasonId === season.id ? "bg-primary hover:bg-primary/90" : ""}`}
                      onClick={() => setSelectedSeasonId(season.id)}
                    >
                      Season {season.season_number}
                    </Button>
                  ))}
                </div>
              )}

              {/* Episodes Grid - 3 columns */}
              {episodesLoading ? (
                <EpisodesSkeleton />
              ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredEpisodes.map((ep) => {
                    const progressPercent = getProgressPercentage(ep.id);
                    const isActive = currentEpisode?.id === ep.id;
                    const isFreeEpisode = ep.access_type === 'free';
                    const isRentEpisode = ep.access_type === 'purchase';
                    const isMembershipEpisode = ep.access_type === 'membership';
                    return (
                      <motion.div
                        key={ep.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`relative aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-all hover:scale-[1.02] ${isActive ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => fetchVideoSource(ep.id)}
                      >
                        <img
                          src={ep.still_path || content?.backdrop_path || "/placeholder.svg"}
                          alt={`Episode ${ep.episode_number}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Access Type Badge - Top Right */}
                        <div className="absolute top-1.5 right-1.5">
                          {isFreeEpisode ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded shadow-md uppercase tracking-wide">
                              Free
                            </span>
                          ) : isRentEpisode ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded shadow-md uppercase tracking-wide flex items-center gap-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              Rent
                            </span>
                          ) : isMembershipEpisode ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded shadow-md uppercase tracking-wide flex items-center gap-0.5">
                              <Crown className="h-2.5 w-2.5" />
                              VIP+
                            </span>
                          ) : null}
                        </div>
                        {/* Progress Bar */}
                        {progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                            <div 
                              className="h-full bg-red-600 transition-all"
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        )}
                        {/* Large Episode Number - Word Art Style, 2x bigger on Desktop */}
                        <div className="absolute bottom-1 left-2">
                          <span className="text-6xl font-black text-white leading-none" style={{
                            textShadow: '3px 3px 0px rgba(0,0,0,0.9), 6px 6px 10px rgba(0,0,0,0.5)',
                            WebkitTextStroke: '1px rgba(255,255,255,0.3)',
                            letterSpacing: '-0.05em'
                          }}>
                            {ep.episode_number}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </TabsContent>

      {/* For You Tab */}
      <TabsContent value="foryou" className="mt-3">
        <div className="grid grid-cols-4 gap-2">
          {forYouContent && forYouContent.length > 0 ? (
            forYouContent.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => {
                  const contentIdentifier = item.tmdb_id || item.id;
                  if (item.content_type === 'anime') {
                    navigate(`/watch/anime/${contentIdentifier}/1/1`);
                  } else if (item.content_type === 'series') {
                    navigate(`/watch/series/${contentIdentifier}/1/1`);
                  } else {
                    navigate(`/watch/movie/${contentIdentifier}`);
                  }
                }}
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden">
                  <img
                    src={item.poster_path || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                  />
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                <img src="/placeholder.svg" alt={`For You ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))
          )}
        </div>
      </TabsContent>

      {/* Comments Tab */}
      <TabsContent value="comments" className="mt-3">
        <CommentsSection 
          episodeId={currentEpisode?.id}
          movieId={content?.content_type === 'movie' ? content.id : undefined}
        />
      </TabsContent>

      {/* Detail Tab */}
      <TabsContent value="detail" className="mt-3">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Description</h4>
            <p className="text-muted-foreground text-sm">
              {content?.overview || 'No description available.'}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* Home Tab */}
      <TabsContent value="home" className="mt-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/')}
          >
            <Home className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Home</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/series')}
          >
            <Tv className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Series</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/movies')}
          >
            <Film className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Movies</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Go to Dashboard</span>
            <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
          </motion.div>
        </motion.div>
      </TabsContent>
    </Tabs>
  );
};

const WatchPage = () => {
  const { type, id, season, episode } = useParams<{ type: string; id: string; season?: string; episode?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasActiveSubscription, remainingDays } = useSubscription();
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const isTabletLandscape = useIsTabletLandscape();
  const isAndroidNative = false; // PWA mode - no native Android
  const isVideoFullscreen = useFullscreenState();
  
  // Handle iframe fullscreen with orientation lock for Android native
  useIframeFullscreenHandler();

  // iPad: keep the same React tree across rotations so the <video> element isn't unmounted
  const isIPadDevice = useMemo(() => {
    return (
      /iPad/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }, []);

  // Detect iPad portrait mode for responsive layout
  const [isIPadPortrait, setIsIPadPortrait] = useState<boolean>(false);
  
  useEffect(() => {
    if (!isIPadDevice) {
      setIsIPadPortrait(false);
      return;
    }
    
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsIPadPortrait(isPortrait);
    };
    
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, [isIPadDevice]);

  const { 
    sessions, 
    currentDeviceId, 
    canStream, 
    maxDevices, 
    loading: deviceSessionLoading,
    signOutDevice,
    signOutAllDevices 
  } = useDeviceSession();

  const contentType = type === 'movie' ? 'movie' : 'series';
  const { content, seasons, episodes: rawEpisodes, videoSources: allVideoSources, loading, error } = useContentData(id, contentType as 'movie' | 'series');

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<any[]>([]);
  const [mobileActiveTab, setMobileActiveTab] = useState<string>("episodes");

  // Reset state when content changes
  useEffect(() => {
    setCurrentEpisode(null);
    setSelectedSeasonId(null);
    setVideoSources([]);
    setMobileActiveTab(type === 'series' ? "episodes" : "foryou");
  }, [id, type]);
  
  const [castMembers, setCastMembers] = useState<any[]>([]);
  const [forYouContent, setForYouContent] = useState<any[]>([]);
  const [relatedContent, setRelatedContent] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<string, { progress: number; duration: number }>>({});
  const [castLoading, setCastLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string | null; profile_image: string | null } | null>(null);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showDeviceLimitWarning, setShowDeviceLimitWarning] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [shorts, setShorts] = useState<any[]>([]);

  // Convert episodes to correct format
  const episodes: Episode[] = useMemo(() => rawEpisodes.map(ep => ({
    id: ep.id,
    episode_number: ep.episode_number || 1,
    title: ep.title,
    still_path: ep.still_path,
    season_id: ep.season_id,
    show_id: ep.show_id,
    access_type: ep.access_type,
    price: ep.price
  })), [rawEpisodes]);

  // Filter episodes by selected season
  const displayEpisodes = useMemo(() => {
    if (!selectedSeasonId) return episodes;
    const seasonExists = seasons.some(s => s.id === selectedSeasonId);
    if (!seasonExists) return episodes;
    return episodes.filter(ep => ep.season_id === selectedSeasonId);
  }, [episodes, selectedSeasonId, seasons, loading]);

  const { signedUrl: profileImageUrl } = useProfileImage({ 
    imagePath: userProfile?.profile_image,
    userId: user?.id 
  });

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('username, profile_image')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user?.id]);

  // Initialize video sources and current episode
  useEffect(() => {
    if (contentType === 'movie' && allVideoSources.length > 0) {
      setVideoSources(allVideoSources);
    } else if (contentType === 'series' && content?.id) {
      const seasonsMatchContent = seasons.length > 0 && seasons[0]?.show_id === content.id;
      if (!seasonsMatchContent) return;
      
      const episodesMatchContent = episodes.length > 0 && episodes[0]?.show_id === content.id;
      if (!episodesMatchContent) return;
      
      if (seasons.length > 0) {
        let targetSeasonId = selectedSeasonId;
        const selectedSeasonBelongsToContent = selectedSeasonId && seasons.some(s => s.id === selectedSeasonId);
        
        if (season && (!selectedSeasonId || !selectedSeasonBelongsToContent)) {
          const seasonNum = parseInt(season);
          const targetSeason = seasons.find(s => s.season_number === seasonNum);
          if (targetSeason) {
            targetSeasonId = targetSeason.id;
            setSelectedSeasonId(targetSeason.id);
          } else {
            targetSeasonId = seasons[0].id;
            setSelectedSeasonId(seasons[0].id);
          }
        } else if (!selectedSeasonId || !selectedSeasonBelongsToContent) {
          targetSeasonId = seasons[0].id;
          setSelectedSeasonId(seasons[0].id);
        }
      }
      
      if (episodes.length > 0 && allVideoSources.length > 0) {
        let targetEp: Episode | undefined;
        
        if (episode) {
          const episodeNum = parseInt(episode);
          if (season && seasons.length > 0) {
            const seasonNum = parseInt(season);
            const targetSeason = seasons.find(s => s.season_number === seasonNum);
            if (targetSeason) {
              const seasonEpisodes = episodes.filter(ep => ep.season_id === targetSeason.id);
              targetEp = seasonEpisodes.find(ep => ep.episode_number === episodeNum) || seasonEpisodes[0];
            }
          }
          
          if (!targetEp) {
            targetEp = episodes.find(ep => ep.episode_number === episodeNum);
          }
        }
        
        if (!targetEp) {
          targetEp = episodes[0];
        }
        
        if (targetEp) {
          setCurrentEpisode(targetEp);
          const sources = allVideoSources.filter(s => s.episode_id === targetEp!.id);
          setVideoSources(sources);
        }
      }
    }
  }, [content?.id, allVideoSources.length, episodes, seasons, season, episode, contentType, selectedSeasonId]);

  // Fetch related content
  useEffect(() => {
    const fetchRelated = async () => {
      if (!content?.id) return;
      
      const recommendationType = type === 'anime' ? 'anime' : contentType;
      
      const { data } = await supabase
        .from('content')
        .select('id, title, poster_path, tmdb_id, content_type')
        .eq('content_type', recommendationType)
        .neq('id', content.id)
        .limit(12);
      
      if (data) {
        setRelatedContent(data);
        setForYouContent(data);
      }
    };
    fetchRelated();
  }, [content?.id, contentType, type]);

  // Fetch cast
  useEffect(() => {
    const fetchCast = async () => {
      if (!content?.tmdb_id) {
        if (content && (content as any).cast_members) {
          const castString = (content as any).cast_members as string;
          const parsed = castString.split(',').map((item, index) => {
            const trimmed = item.trim();
            const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
            if (match) {
              return { id: `cast-${index}`, actor_name: match[1].trim(), character_name: match[2].trim(), profile_url: null };
            }
            return { id: `cast-${index}`, actor_name: trimmed, character_name: null, profile_url: null };
          }).filter(c => c.actor_name);
          setCastMembers(parsed);
        }
        setCastLoading(false);
        return;
      }

      const tmdbId = content.tmdb_id;
      const mediaType = contentType === 'movie' ? 'movie' : 'tv';
      
      try {
        const { data: castCredits } = await supabase
          .from('cast_credits')
          .select(`
            id,
            character_name,
            cast_member_id,
            cast_members!cast_credits_cast_member_id_fkey (
              id,
              name,
              profile_path
            )
          `)
          .eq('tmdb_content_id', tmdbId)
          .limit(15);

        if (castCredits && castCredits.length > 0) {
          const formattedCast = castCredits.map((credit: any) => ({
            id: credit.id,
            actor_name: credit.cast_members?.name || 'Unknown',
            character_name: credit.character_name,
            profile_url: credit.cast_members?.profile_path?.startsWith('http') 
              ? credit.cast_members.profile_path 
              : credit.cast_members?.profile_path 
                ? `https://image.tmdb.org/t/p/w185${credit.cast_members.profile_path}`
                : null
          })).filter((c: any) => c.actor_name !== 'Unknown');
          
          if (formattedCast.length > 0) {
            setCastMembers(formattedCast);
            setCastLoading(false);
            return;
          }
        }

        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/credits?api_key=5cfa727c2f549c594772a50e10e3f272`
        );
        
        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          if (tmdbData.cast && tmdbData.cast.length > 0) {
            const formattedCast = tmdbData.cast.slice(0, 15).map((member: any) => ({
              id: member.id.toString(),
              actor_name: member.name || member.original_name,
              character_name: member.character,
              profile_url: member.profile_path 
                ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                : null
            }));
            setCastMembers(formattedCast);
          }
        }
      } catch (err) {
        console.error('Error fetching cast:', err);
      }
      setCastLoading(false);
    };

    fetchCast();
  }, [content, contentType]);

  // Fetch shorts
  useEffect(() => {
    const fetchShorts = async () => {
      const { data } = await supabase
        .from('shorts')
        .select('*')
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(8);
      if (data) setShorts(data);
    };
    fetchShorts();
  }, []);

  const fetchVideoSource = async (episodeId: string) => {
    const sources = allVideoSources.filter(s => s.episode_id === episodeId);
    setVideoSources(sources);
    const ep = episodes.find(e => e.id === episodeId);
    if (ep) setCurrentEpisode(ep);
  };

  const desktopCastScrollRef = useSwipeScroll({ enabled: true });

  const getProgressPercentage = (episodeId: string) => {
    const history = watchHistory[episodeId];
    if (!history || !history.duration || history.duration === 0) return 0;
    return (history.progress / history.duration) * 100;
  };

  const isSeriesContent = type === 'series' || Boolean(season && episode);

  const videoPlayerAccessType = useMemo(() => {
    const effectiveAccessType = isSeriesContent 
      ? (currentEpisode?.access_type || episodes[0]?.access_type || content?.access_type)
      : content?.access_type;
    return effectiveAccessType === 'purchase' ? 'rent' : effectiveAccessType === 'membership' ? 'vip' : 'free';
  }, [isSeriesContent, currentEpisode?.access_type, episodes, content?.access_type]);

  const videoPlayerElement = useMemo(() => {
    const videoBackdrop = isSeriesContent && currentEpisode?.still_path 
      ? currentEpisode.still_path 
      : content?.backdrop_path;
    
    return (
      <VideoPlayer 
        videoSources={videoSources}
        contentBackdrop={videoBackdrop}
        contentId={content?.id}
        accessType={videoPlayerAccessType as 'free' | 'rent' | 'vip'}
        excludeFromPlan={content?.exclude_from_plan}
        rentalPrice={isSeriesContent && currentEpisode?.price ? currentEpisode.price : content?.price}
        rentalPeriodDays={content?.purchase_period || 7}
        mediaId={content?.id}
        mediaType={contentType}
        title={content?.title}
        movieId={id}
        currentEpisodeId={currentEpisode?.id}
        episodes={isSeriesContent ? displayEpisodes : []}
        onEpisodeSelect={isSeriesContent ? fetchVideoSource : undefined}
      />
    );
  }, [videoSources, content?.backdrop_path, content?.id, videoPlayerAccessType, content?.exclude_from_plan, content?.price, content?.purchase_period, content?.title, isSeriesContent, currentEpisode?.price, currentEpisode?.id, currentEpisode?.still_path, contentType, id, displayEpisodes]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background text-foreground gap-4">
        <h2 className="text-2xl font-bold">Content Not Found</h2>
        <p className="text-muted-foreground">{error || 'The requested content could not be loaded.'}</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  // Determine if we should use single-column layout (mobile/tablet/iPad portrait)
  const useSingleColumnLayout = isMobile || isTablet || isIPadPortrait;

  // Check if running on native platform
  const isNativeApp = Capacitor.isNativePlatform();

  // Unified Responsive Layout - Single column on mobile/tablet, two column on desktop
  return (
    <>
    <div className="min-h-screen bg-background text-foreground transition-all duration-300 ease-in-out">
      <SocialShareMeta title={content.title} description={content.overview || ''} image={content.backdrop_path || content.poster_path} type={contentType === 'movie' ? 'video.movie' : 'video.tv_show'} />
      <div className={`${useSingleColumnLayout ? 'flex flex-col' : 'flex h-screen overflow-hidden'}`}>
        {/* Left Column: Video + User Info + Cast - Full width on mobile/tablet, 55-65% on desktop */}
        <div 
          className={`flex-1 min-w-0 flex flex-col ${useSingleColumnLayout ? '' : 'overflow-hidden'}`} 
          style={useSingleColumnLayout ? {} : { flex: '1 1 60%', maxWidth: '65%', minWidth: '55%' }}
        >
          {/* Video Player - Below status bar in portrait, full screen in landscape fullscreen */}
          <div 
            className={`bg-black ${useSingleColumnLayout ? 'sticky top-0 z-50 watch-page-portrait-safe' : 'ipad-landscape-video'} ${isVideoFullscreen ? 'watch-page-fullscreen' : ''}`}
          >
            {videoPlayerElement}
          </div>
            
          {/* Scrollable Content Below Player */}
          <div className={useSingleColumnLayout ? 'flex-1' : 'flex-1 overflow-y-auto'}>
            {/* Native Banner Ad - Below Player */}
            <NativeBannerAdSlot placement="watch_banner" />
            
            {/* User Profile with Wallet Balance */}
            <div className="px-4 py-2">
              {/* Row 1: User Profile and Wallet */}
              <div className="flex items-center gap-3">
                <Avatar className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} border-2 border-primary flex-shrink-0 cursor-pointer`} onClick={() => navigate('/dashboard')}>
                  <AvatarImage src={profileImageUrl || undefined} alt={userProfile?.username || user?.email || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                    {(userProfile?.username || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold truncate`}>{userProfile?.username || user?.email?.split('@')[0] || 'Guest'}</h1>
                  <WalletSection iconClassName={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} textClassName={isMobile ? 'text-xs' : 'text-sm'} />
                </div>

                {/* VIP and ActionButtons on same row for desktop */}
                {!isMobile && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-sm gap-1 border-primary/50 text-primary hover:bg-primary/10" onClick={() => setShowSubscriptionDialog(true)}>
                      <Crown className="h-3.5 w-3.5" />
                      {hasActiveSubscription ? (<span className="flex items-center gap-1">VIP<Badge variant="secondary" className="h-4 px-1 text-xs bg-yellow-500/20 text-yellow-600">{remainingDays}d</Badge></span>) : 'VIP'}
                    </Button>
                    <ActionButtons contentId={content?.id} contentType={contentType as 'movie' | 'series'} episodeId={currentEpisode?.id} userId={user?.id} contentTitle={content?.title} tmdbId={id} seasonNumber={season ? parseInt(season) : undefined} episodeNumber={episode ? parseInt(episode) : undefined} />
                  </>
                )}
              </div>

              {/* Row 2: VIP + Action Buttons (Mobile only - aligned right) */}
              {isMobile && (
                <div className="flex items-center justify-end gap-1 mt-2">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 border-primary/50 text-primary hover:bg-primary/10" onClick={() => setShowSubscriptionDialog(true)}>
                    <Crown className="h-3 w-3" />
                    {hasActiveSubscription ? (<span className="flex items-center gap-1">VIP<Badge variant="secondary" className="h-3.5 px-0.5 text-[9px] bg-yellow-500/20 text-yellow-600">{remainingDays}d</Badge></span>) : 'VIP'}
                  </Button>
                  <ActionButtons contentId={content?.id} contentType={contentType as 'movie' | 'series'} episodeId={currentEpisode?.id} userId={user?.id} contentTitle={content?.title} tmdbId={id} seasonNumber={season ? parseInt(season) : undefined} episodeNumber={episode ? parseInt(episode) : undefined} />
                </div>
              )}
            </div>

            {/* Cast Section - Portrait cards with actor name + character */}
            <div className="px-4 py-2">
              {castLoading ? (
                <CastSkeleton />
              ) : castMembers.length > 0 ? (
                <div ref={desktopCastScrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-1">
                  {castMembers.slice(0, 10).map((member, idx) => (
                    <div key={idx} className="flex-shrink-0 cursor-pointer" onClick={() => setSelectedCastMember(member)}>
                      <div className={`${isMobile ? 'w-16 h-20' : 'w-20 h-28'} rounded-md overflow-hidden bg-muted ring-1 ring-border/30`}>
                        <img src={member.profile_url || "/placeholder.svg"} alt={member.actor_name} className="w-full h-full object-cover" />
                      </div>
                      <p className={`${isMobile ? 'text-[10px] w-16' : 'text-xs w-20'} text-center mt-1.5 truncate font-medium`}>{member.actor_name}</p>
                      {member.character_name && (
                        <p className={`${isMobile ? 'text-[9px] w-16' : 'text-[10px] w-20'} text-center text-muted-foreground truncate`}>{member.character_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* AdMob Banner - Between Cast and Tabs (Desktop only) */}
            {!useSingleColumnLayout && (
              <NativeBannerAdSlot placement="watch_cast_tabs_banner" className="mx-4 mb-2" />
            )}

            {/* Single Column Layout: Sidebar content moves here below Cast */}
            {useSingleColumnLayout && (
              <div className="px-4 py-3 space-y-4">
                {/* AdMob Banner - Between Cast and Tabs */}
                <NativeBannerAdSlot placement="watch_cast_tabs_banner" className="!px-0" />

                {/* Collapsible Tabs Section */}
                <CollapsibleTabsSection
                  key={`single-col-${content?.id || id}`}
                  isSeriesContent={isSeriesContent}
                  seasons={seasons}
                  selectedSeasonId={selectedSeasonId}
                  setSelectedSeasonId={setSelectedSeasonId}
                  episodes={episodes}
                  episodesLoading={episodesLoading}
                  content={content}
                  currentEpisode={currentEpisode}
                  fetchVideoSource={fetchVideoSource}
                  getProgressPercentage={getProgressPercentage}
                  forYouContent={forYouContent}
                  navigate={navigate}
                />

                {/* Subscription Banner */}
                <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5">
                  <div className="flex items-center justify-between">
                    <p className={`${isMobile ? 'text-[11px]' : 'text-xs'} font-medium`}>Subscribe to Membership, Enjoy watching our Premium videos</p>
                    <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => setShowSubscriptionDialog(true)}>
                      <Crown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Recommended Section */}
                <div>
                  <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-3`}>Recommended</h3>
                  <div className={`grid ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-4 gap-2'}`}>
                    {relatedContent && relatedContent.length > 0 ? (
                      relatedContent.slice(0, isMobile ? 6 : 8).map((item) => (
                        <div key={item.id} className="cursor-pointer transition-transform hover:scale-105" onClick={() => {
                          const contentIdentifier = item.tmdb_id || item.id;
                          if (item.content_type === 'anime') {
                            navigate(`/watch/anime/${contentIdentifier}/1/1`);
                          } else if (item.content_type === 'series') {
                            navigate(`/watch/series/${contentIdentifier}/1/1`);
                          } else {
                            navigate(`/watch/movie/${contentIdentifier}`);
                          }
                        }}>
                          <div className="aspect-[2/3] rounded-md overflow-hidden">
                            <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                          </div>
                        </div>
                      ))
                    ) : (
                      Array.from({ length: isMobile ? 6 : 8 }).map((_, idx) => (
                        <div key={idx} className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                          <img src="/placeholder.svg" alt={`Recommended ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))
                    )}
                  </div>
                  <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2">... More</button>
                </div>

                {/* Shorts Section */}
                <div className="pb-6">
                  <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-3`}>Shorts</h3>
                  <div className={`grid ${isMobile ? 'grid-cols-3 gap-2' : 'grid-cols-4 gap-2'}`}>
                    {shorts.length > 0 ? (
                      shorts.slice(0, isMobile ? 6 : 8).map((short) => (
                        <div 
                          key={short.id} 
                          className="aspect-[9/16] rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-all hover:scale-105"
                          onClick={() => navigate(`/short?id=${short.id}`)}
                        >
                          <img src={short.thumbnail_url || "/placeholder.svg"} alt={short.title} className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      Array.from({ length: isMobile ? 6 : 8 }).map((_, idx) => (
                        <div key={idx} className="aspect-[9/16] rounded-md overflow-hidden bg-muted animate-pulse" />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: 35-45% width, independently scrollable - Hidden on mobile/tablet/iPad portrait */}
        {!useSingleColumnLayout && (
        <div className="overflow-y-auto border-l border-border/40 transition-all duration-300 ease-in-out" style={{ flex: '0 0 40%', maxWidth: '45%', minWidth: '35%' }}>
          <div className="p-3 space-y-3">
            {/* Content Poster, Title - Only for Movies */}
            {!isSeriesContent && (
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                  <img src={content?.poster_path || "/placeholder.svg"} alt={content?.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold truncate">{content?.title}</h2>
                  <p className="text-sm text-primary font-medium">Watching Movie</p>
                </div>
              </div>
            )}

            {/* Collapsible Tabs Section */}
            <CollapsibleTabsSection
              key={content?.id || id}
              isSeriesContent={isSeriesContent}
              seasons={seasons}
              selectedSeasonId={selectedSeasonId}
              setSelectedSeasonId={setSelectedSeasonId}
              episodes={episodes}
              episodesLoading={episodesLoading}
              content={content}
              currentEpisode={currentEpisode}
              fetchVideoSource={fetchVideoSource}
              getProgressPercentage={getProgressPercentage}
              forYouContent={forYouContent}
              navigate={navigate}
            />

            {/* Subscription Banner */}
            <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Subscribe to Membership, Enjoy watching our Premium videos</p>
                <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => setShowSubscriptionDialog(true)}>
                  <Crown className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Recommended Section */}
            <div>
              <h3 className="text-base font-semibold mb-3">Recommended</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {relatedContent && relatedContent.length > 0 ? (
                  relatedContent.slice(0, 8).map((item) => (
                    <div key={item.id} className="cursor-pointer transition-transform hover:scale-105" onClick={() => {
                      const contentIdentifier = item.tmdb_id || item.id;
                      if (item.content_type === 'anime') {
                        navigate(`/watch/anime/${contentIdentifier}/1/1`);
                      } else if (item.content_type === 'series') {
                        navigate(`/watch/series/${contentIdentifier}/1/1`);
                      } else {
                        navigate(`/watch/movie/${contentIdentifier}`);
                      }
                    }}>
                      <div className="aspect-[2/3] rounded-md overflow-hidden">
                        <img src={item.poster_path || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="aspect-[2/3] rounded-md overflow-hidden bg-muted">
                      <img src="/placeholder.svg" alt={`Recommended ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
              <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2">... More</button>
            </div>

            {/* Shorts Section */}
            <div>
              <h3 className="text-base font-semibold mb-3">Shorts</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {shorts.length > 0 ? (
                  shorts.map((short) => (
                    <div 
                      key={short.id} 
                      className="aspect-[9/16] rounded-md overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-all hover:scale-105"
                      onClick={() => navigate(`/short?id=${short.id}`)}
                    >
                      <img src={short.thumbnail_url || "/placeholder.svg"} alt={short.title} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="aspect-[9/16] rounded-md overflow-hidden bg-muted animate-pulse" />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>

    {/* Dialogs */}
    <SubscriptionDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog} />
    <CastMemberDialog castMember={selectedCastMember} isOpen={!!selectedCastMember} onClose={() => setSelectedCastMember(null)} castType={contentType === 'movie' ? 'movie' : 'series'} />
    <DeviceLimitWarning open={showDeviceLimitWarning} onOpenChange={setShowDeviceLimitWarning} maxDevices={maxDevices} activeSessions={sessions} currentDeviceId={currentDeviceId} onSignOutDevice={signOutDevice} onSignOutAllDevices={signOutAllDevices} />
    </>
  );
};

export default WatchPage;
