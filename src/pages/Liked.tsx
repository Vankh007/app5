import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Film, Tv, Heart, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface LikedContent {
  id: string;
  content_id: string;
  title: string;
  poster_path?: string;
  type: 'movie' | 'series';
  created_at: string;
  backdrop_path?: string;
  overview?: string;
  genre?: string;
}

const Liked = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [likedContent, setLikedContent] = useState<LikedContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLikedContent();
    }
  }, [user]);

  const fetchLikedContent = async () => {
    try {
      setLoading(true);
      
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select(`
          *,
          content:content_id (
            backdrop_path,
            overview,
            genre
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (favoritesError) {
        console.error('Favorites error:', favoritesError);
        toast.error('Failed to load liked content');
        return;
      }

      const formattedContent: LikedContent[] = favoritesData?.map((item: any) => ({
        id: item.id,
        content_id: item.content_id,
        title: item.title,
        poster_path: item.poster_path,
        type: item.type === 'series' ? 'series' : 'movie',
        created_at: item.created_at,
        backdrop_path: item.content?.backdrop_path,
        overview: item.content?.overview,
        genre: item.content?.genre,
      })) || [];

      setLikedContent(formattedContent);
    } catch (error) {
      console.error('Error fetching liked content:', error);
      toast.error('Failed to load liked content');
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
            <h1 className="text-3xl font-bold">Liked Videos</h1>
            <p className="text-muted-foreground">Your favorite movies and series</p>
          </div>
        </div>

        {/* Liked Content List */}
        {likedContent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No liked content yet</h3>
              <p className="text-muted-foreground mb-6">Start liking movies and series to see them here</p>
              <Button onClick={() => navigate('/')}>
                Browse Content
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {likedContent.map((item) => (
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
                      </div>

                      {item.overview && (
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-2 hidden sm:block">
                          {item.overview}
                        </p>
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

export default Liked;
