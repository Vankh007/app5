import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';
import { useLanguage } from '@/contexts/LanguageContext';
import GridMovieCard from '@/components/GridMovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, TrendingUp, Eye, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Content {
  id: string;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  content_type: string;
  overview: string | null;
  release_date: string | null;
  popularity: number | null;
  tmdb_id: number | null;
  genre?: string;
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
}

interface Short {
  id: string;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  views: number;
  description: string | null;
  created_at: string;
}

const Viral = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [trendingContent, setTrendingContent] = useState<Content[]>([]);
  const [viralShorts, setViralShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    fetchViralContent();
  }, []);

  const fetchViralContent = async () => {
    setIsLoading(true);
    try {
      // Fetch trending content sorted by popularity
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('id, title, poster_path, backdrop_path, content_type, overview, release_date, popularity, tmdb_id, genre, access_type, recent_episode')
        .order('popularity', { ascending: false })
        .limit(20);

      if (contentError) throw contentError;
      if (contentData) setTrendingContent(contentData);

      // Fetch viral shorts sorted by views
      const { data: shortsData, error: shortsError } = await supabase
        .from('shorts')
        .select('id, title, thumbnail_url, video_url, views, description, created_at')
        .eq('status', 'active')
        .order('views', { ascending: false })
        .limit(12);

      if (shortsError) throw shortsError;
      if (shortsData) setViralShorts(shortsData);
    } catch (error) {
      console.error('Error fetching viral content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentClick = (content: Content) => {
    const type = content.content_type === 'movie' ? 'movie' : 'series';
    const id = content.tmdb_id || content.id;
    navigate(`/watch/${type}/${id}`);
  };

  const handleShortClick = (short: Short) => {
    navigate('/short');
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  // Get backdrop image from most viral content
  const getHeroBackdrop = () => {
    if (activeTab === 'trending' && trendingContent.length > 0) {
      return trendingContent[0].backdrop_path;
    }
    if (activeTab === 'shorts' && viralShorts.length > 0) {
      return viralShorts[0].thumbnail_url;
    }
    return null;
  };

  const heroBackdrop = getHeroBackdrop();

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 md:gap-4">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );

  // Artistic rank number component
  const RankBadge = ({ rank }: { rank: number }) => (
    <div className="absolute -left-2 sm:-left-3 md:-left-4 bottom-0 z-10 flex items-end pointer-events-none">
      <span 
        className="font-black text-transparent bg-clip-text leading-none drop-shadow-2xl"
        style={{
          fontSize: isMobile ? '3rem' : isTablet ? '4rem' : '5rem',
          backgroundImage: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 50%, hsl(var(--primary)/0.3) 100%)',
          WebkitTextStroke: '2px hsl(var(--primary)/0.5)',
          textShadow: '0 4px 20px hsl(var(--primary)/0.4), 0 0 40px hsl(var(--primary)/0.2)',
        }}
      >
        {rank}
      </span>
    </div>
  );

  const renderTrendingContent = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 md:gap-5 lg:gap-6">
      {trendingContent.map((content, index) => (
        <div 
          key={content.id} 
          className="relative group"
          style={{ paddingLeft: index < 10 ? (isMobile ? '1.5rem' : '2rem') : 0 }}
        >
          {/* Large Artistic Rank Number for Top 10 */}
          {index < 10 && <RankBadge rank={index + 1} />}
          
          <GridMovieCard
            item={{
              id: content.id,
              title: content.title,
              poster_path: content.poster_path || undefined,
              backdrop_path: content.backdrop_path || undefined,
              overview: content.overview || undefined,
              genre: content.genre || undefined,
              tmdb_id: content.tmdb_id || undefined,
              content_type: content.content_type,
              access_type: content.access_type,
              recent_episode: content.recent_episode || undefined
            }}
            onClick={() => handleContentClick(content)}
          />
        </div>
      ))}
    </div>
  );

  const renderViralShorts = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 md:gap-5 lg:gap-6">
      {viralShorts.map((short, index) => (
        <div
          key={short.id}
          className="relative group cursor-pointer"
          onClick={() => handleShortClick(short)}
          style={{ paddingLeft: index < 10 ? (isMobile ? '1.5rem' : '2rem') : 0 }}
        >
          {/* Large Artistic Rank Number for Top 10 */}
          {index < 10 && <RankBadge rank={index + 1} />}
          
          <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted">
            {short.thumbnail_url ? (
              <img
                src={short.thumbnail_url}
                alt={short.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <Flame className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Views count */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex items-center gap-1 text-white text-xs">
                <Eye className="w-3 h-3" />
                <span>{formatViews(short.views)} views</span>
              </div>
              <p className="text-white text-sm font-medium line-clamp-2 mt-1">
                {short.title}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section with Dynamic Backdrop */}
      <div className="relative h-[220px] md:h-[320px] overflow-hidden">
        {/* Background Image */}
        {heroBackdrop && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBackdrop})` }}
          />
        )}
        
        {/* Gradient Fallback/Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B0000] via-[#5C0000] to-[#2D0000]" style={{ opacity: heroBackdrop ? 0.85 : 1 }} />
        
        {/* Additional Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        
        {/* Radial Glow Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.2),transparent_70%)]" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 px-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full backdrop-blur-sm border border-primary/30">
              <Flame className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">{t('viral') || 'Viral'}</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
              Trending & Viral
            </h1>
            <p className="text-white/80 max-w-md mx-auto text-sm md:text-base">
              Discover the most popular and viral content everyone is watching
            </p>
          </div>
        </div>
      </div>
      
      <div className="px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Trending</span>
            </TabsTrigger>
            <TabsTrigger value="shorts" className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              <span>Viral Shorts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="mt-0">
            {isLoading ? renderLoadingSkeleton() : renderTrendingContent()}
          </TabsContent>

          <TabsContent value="shorts" className="mt-0">
            {isLoading ? renderLoadingSkeleton() : renderViralShorts()}
          </TabsContent>
        </Tabs>

        {/* Stats Section */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Trending</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{trendingContent.length}</p>
              <p className="text-xs text-muted-foreground">Popular titles</p>
            </div>
            
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Flame className="w-4 h-4" />
                <span className="text-sm">Viral</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{viralShorts.length}</p>
              <p className="text-xs text-muted-foreground">Hot shorts</p>
            </div>
            
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm">Total Views</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatViews(viralShorts.reduce((sum, s) => sum + s.views, 0))}
              </p>
              <p className="text-xs text-muted-foreground">Combined views</p>
            </div>
            
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Updated</span>
              </div>
              <p className="text-2xl font-bold text-foreground">Now</p>
              <p className="text-xs text-muted-foreground">Real-time data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Viral;
