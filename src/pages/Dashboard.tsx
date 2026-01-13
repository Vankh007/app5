import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Heart, Clock, TrendingUp, User, Settings, LogOut, Film, Tv, Wallet, CreditCard, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { KHQRPaymentDialog } from '@/components/payment/KHQRPaymentDialog';
import { ProfileImageUpload } from '@/components/ProfileImageUpload';
import { useWallet } from '@/hooks/useWallet';
import { NewAddsSection } from '@/components/dashboard/NewAddsSection';
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

interface FavoriteContent {
  id: string;
  content_id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  type: 'movie' | 'series';
  created_at: string;
  overview?: string;
  genre?: string;
  rating?: number;
}

interface RentalContent {
  id: string;
  content_id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  type: 'movie' | 'series';
  purchase_date: string;
  expires_at?: string;
  overview?: string;
  genre?: string;
  rating?: number;
}

interface UserStats {
  totalWatched: number;
  totalFavorites: number;
  watchTimeHours: number;
  joinedDate: string;
  walletBalance: number;
  membershipType: string | null;
  membershipExpiry: string | null;
  totalRentals: number;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { balance: walletBalance, refetch: refetchWallet } = useWallet();
  const navigate = useNavigate();
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [favorites, setFavorites] = useState<FavoriteContent[]>([]);
  const [rentals, setRentals] = useState<RentalContent[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [profileImage, setProfileImage] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch watch history with content and episode details
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

      if (historyError) console.error('Watch history error:', historyError);

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

      // Deduplicate by content_id - keep only the most recent watch per content
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
      
      // Limit to 10 most recent unique content
      const limitedHistory = deduplicatedHistory.slice(0, 10);

      // Fetch favorites with full content details
      const { data: favoritesData, error: favError } = await supabase
        .from('favorites')
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
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (favError) console.error('Favorites error:', favError);

      // Fetch user profile for wallet balance and images
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance, profile_image, cover_image')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfileImage(profileData.profile_image || '');
        setCoverImage(profileData.cover_image || '');
      }

      // Fetch membership info
      const { data: membershipData } = await supabase
        .from('user_memberships')
        .select('membership_type, expires_at, status')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch rental purchases with content details
      const { data: rentalsData } = await supabase
        .from('user_content_purchases')
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
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .order('purchase_date', { ascending: false });

      // Transform rentals data
      const transformedRentals = rentalsData?.map((item: any) => ({
        id: item.id,
        content_id: item.content_id,
        title: item.content?.title || 'Unknown',
        poster_path: item.content?.poster_path,
        backdrop_path: item.content?.backdrop_path,
        type: (item.content?.content_type === 'series' ? 'series' : 'movie') as 'movie' | 'series',
        purchase_date: item.purchase_date,
        expires_at: item.expires_at,
        overview: item.content?.overview,
        genre: item.content?.genre,
        rating: item.content?.popularity ? Math.min(item.content.popularity / 100, 10) : undefined,
      })) || [];

      // Calculate total unique watched content
      const uniqueContentIds = new Set(historyData?.map(h => h.content_id) || []);
      const totalWatched = uniqueContentIds.size;
      
      // Calculate total watch time from watch_progress table (real Shaka player data)
      const { data: progressData } = await supabase
        .from('watch_progress')
        .select('watch_duration_seconds')
        .eq('user_id', user?.id);
      
      const totalSeconds = progressData?.reduce((acc, item) => acc + (item.watch_duration_seconds || 0), 0) || 0;
      const watchTimeHours = Math.floor(totalSeconds / 3600);

      const totalFavorites = favoritesData?.length || 0;

      // Transform favorites data
      const transformedFavorites = favoritesData?.map((item: any) => ({
        id: item.id,
        content_id: item.content_id,
        title: item.content?.title || item.title,
        poster_path: item.content?.poster_path || item.poster_path,
        backdrop_path: item.content?.backdrop_path,
        type: item.content?.content_type === 'series' ? 'series' : (item.type || 'movie'),
        created_at: item.created_at,
        overview: item.content?.overview,
        genre: item.content?.genre,
        rating: item.content?.popularity ? Math.min(item.content.popularity / 100, 10) : undefined,
      })) || [];

      setWatchHistory(limitedHistory);
      setFavorites(transformedFavorites);
      setRentals(transformedRentals);
      setStats({
        totalWatched,
        totalFavorites,
        watchTimeHours,
        joinedDate: user?.created_at || new Date().toISOString(),
        walletBalance: Number(profileData?.wallet_balance || 0),
        membershipType: membershipData?.membership_type || null,
        membershipExpiry: membershipData?.expires_at || null,
        totalRentals: transformedRentals.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
        {/* Profile Header */}
        <Card className="overflow-hidden border-primary/20">
          {/* Cover Image Section */}
          <div className="relative h-48 sm:h-64 md:h-72 bg-gradient-to-r from-primary/10 to-primary/5">
            {coverImage ? (
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/10 to-primary/5" />
            )}
            <div className="absolute top-4 right-4">
              <ProfileImageUpload
                type="cover"
                currentImage={coverImage}
                onUploadSuccess={(url) => setCoverImage(url)}
              />
            </div>
          </div>

          {/* User Info Section - Overlapping the cover */}
          <div className="relative mx-4 sm:mx-6 -mt-16 sm:-mt-20">
            <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-md">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl sm:text-3xl font-bold">
                        {getUserInitials()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute bottom-0 right-0">
                    <ProfileImageUpload
                      type="profile"
                      currentImage={profileImage}
                      onUploadSuccess={(url) => setProfileImage(url)}
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                    Welcome back!
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">{user?.email}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Member since {new Date(stats?.joinedDate || '').toLocaleDateString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/profile-settings')} 
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 pt-4">
            {/* Empty - content moved above */}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Account Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-primary">${walletBalance.toFixed(2)}</div>
              <Button size="sm" className="mt-2 w-full text-xs" onClick={() => setShowPaymentDialog(true)}>
                Top Up
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Membership</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-base sm:text-xl font-bold">
                {stats?.membershipType ? (
                  <Badge variant={stats.membershipType === 'premium' ? 'default' : 'secondary'} className="text-xs">
                    {stats.membershipType.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">FREE</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                {stats?.membershipExpiry 
                  ? (() => {
                      const now = new Date();
                      const expiryDate = new Date(stats.membershipExpiry);
                      const diffMs = expiryDate.getTime() - now.getTime();
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const diffMonths = Math.floor(diffDays / 30);
                      const remainingDays = diffDays % 30;
                      
                      if (diffDays < 0) return 'Expired';
                      if (diffMonths > 0 && remainingDays > 0) {
                        return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''} left`;
                      } else if (diffMonths > 0) {
                        return `${diffMonths} month${diffMonths > 1 ? 's' : ''} left`;
                      } else {
                        return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
                      }
                    })()
                  : 'No active plan'}
              </p>
              <Button 
                size="sm" 
                className="mt-2 w-full text-xs" 
                onClick={() => navigate('/subscriptions')}
                variant={stats?.membershipType ? 'outline' : 'default'}
              >
                {stats?.membershipType ? 'Upgrade' : 'Join Membership'}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Watched</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-primary">{stats?.totalWatched || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Unique content</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Watch Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats?.watchTimeHours || 0}h</div>
              <p className="text-xs text-muted-foreground mt-1">Total hours</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Rentals</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-destructive">{stats?.totalRentals || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active rentals</p>
            </CardContent>
          </Card>
        </div>

        {/* New Adds Section */}
        <NewAddsSection />

        {/* Content Tabs */}
        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="history" className="text-xs sm:text-sm py-2">Watch History</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs sm:text-sm py-2">Favorites</TabsTrigger>
            <TabsTrigger value="rentals" className="text-xs sm:text-sm py-2">My Rentals</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Watch History</h3>
                <p className="text-sm text-muted-foreground">Your recently watched content</p>
              </div>
              <div>
                {watchHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No watch history yet</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>
                      Start Watching
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {watchHistory.map((item) => (
                      <div
                        key={item.id}
                        className="cursor-pointer hover:opacity-90 transition-all overflow-hidden group rounded-xl"
                        onClick={() => navigate(`/watch/${item.type}/${item.content_id}`)}
                      >
                        <div className="relative h-44 sm:h-48 md:h-52 overflow-hidden rounded-xl">
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
                            <div className="w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40 flex-shrink-0 rounded-lg overflow-hidden">
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
                              className="flex-shrink-0 rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-red-600 hover:bg-red-700 group-hover:scale-110 transition-transform"
                            >
                              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Your Favorites</h3>
                <p className="text-sm text-muted-foreground">Content you've marked as favorite</p>
              </div>
              <div>
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No favorites yet</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>
                      Browse Content
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                    {favorites.map((item) => (
                      <div
                        key={item.id}
                        className="cursor-pointer hover:opacity-90 transition-all overflow-hidden group rounded-xl"
                        onClick={() => navigate(`/watch/${item.type}/${item.content_id}`)}
                      >
                        <div className="relative h-44 sm:h-48 md:h-52 overflow-hidden rounded-xl">
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
                            <div className="w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40 flex-shrink-0 rounded-lg overflow-hidden">
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
                              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white line-clamp-2">
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
                              </div>

                              {item.rating && (
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
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

                              {item.overview && (
                                <p className="text-xs sm:text-sm text-white/80 line-clamp-2 hidden sm:block">
                                  {item.overview}
                                </p>
                              )}
                            </div>

                            {/* Play Button */}
                            <Button 
                              size="icon" 
                              className="flex-shrink-0 rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-red-600 hover:bg-red-700 group-hover:scale-110 transition-transform"
                            >
                              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rentals" className="space-y-4">
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">My Rentals</h3>
                <p className="text-sm text-muted-foreground">Content you've rented or purchased</p>
              </div>
              <div>
                {rentals.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No active rentals</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Rental data will appear here once you purchase or rent content
                    </p>
                    <Button className="mt-4" onClick={() => navigate('/')}>
                      Browse Content
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rentals.map((item) => (
                      <div
                        key={item.id}
                        className="cursor-pointer hover:opacity-90 transition-all overflow-hidden group rounded-xl"
                        onClick={() => navigate(`/watch/${item.type}/${item.content_id}`)}
                      >
                        <div className="relative h-44 sm:h-48 md:h-52 overflow-hidden rounded-xl">
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
                            <div className="w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40 flex-shrink-0 rounded-lg overflow-hidden">
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
                              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white line-clamp-2">
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
                              </div>

                              {item.rating && (
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
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

                              {item.expires_at && (
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                                  <span className="text-white/70">EXPIRES :</span>
                                  <span className="text-yellow-500 font-medium">
                                    {new Date(item.expires_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}

                              {item.overview && (
                                <p className="text-xs sm:text-sm text-white/80 line-clamp-2 hidden sm:block">
                                  {item.overview}
                                </p>
                              )}
                            </div>

                            {/* Play Button */}
                            <Button 
                              size="icon" 
                              className="flex-shrink-0 rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-red-600 hover:bg-red-700 group-hover:scale-110 transition-transform"
                            >
                              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <KHQRPaymentDialog
          isOpen={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          onSuccess={(newBalance) => {
            setStats(prev => prev ? { ...prev, walletBalance: newBalance } : null);
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;
