import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface PremiumContent {
  id: string;
  title: string;
  overview: string;
  thumbnail_path: string;
  poster_path: string;
  backdrop_path: string;
  content_type: 'movie' | 'series';
  tmdb_id: number;
  genre: string;
}

const PremiumMember = () => {
  const [premiumContent, setPremiumContent] = useState<PremiumContent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPremiumContent();
  }, []);

  const fetchPremiumContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('access_type', 'membership')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPremiumContent(data || []);
    } catch (error) {
      console.error('Error fetching premium content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: PremiumContent) => {
    return item.thumbnail_path || item.poster_path || item.backdrop_path || '/placeholder.svg';
  };

  const handleItemClick = (item: PremiumContent) => {
    navigate(`/watch/${item.content_type}/${item.tmdb_id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Premium Content</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Exclusive content for premium members only
      </p>

      {premiumContent.length === 0 ? (
        <div className="text-center py-12">
          <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No premium content available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {premiumContent.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleItemClick(item)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-[2/3]">
                  <img
                    src={getImageUrl(item)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="bg-primary">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{item.title}</h3>
                  {item.genre && (
                    <p className="text-xs text-muted-foreground">{item.genre}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PremiumMember;
