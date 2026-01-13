import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

interface ShopContent {
  id: string;
  title: string;
  overview: string;
  thumbnail_path: string;
  poster_path: string;
  backdrop_path: string;
  content_type: 'movie' | 'series';
  tmdb_id: number;
  price: number;
}

const Shop = () => {
  const [shopContent, setShopContent] = useState<ShopContent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchShopContent();
  }, []);

  const fetchShopContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('access_type', 'purchase')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShopContent(data || []);
    } catch (error) {
      console.error('Error fetching shop content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (item: ShopContent) => {
    return item.thumbnail_path || item.poster_path || item.backdrop_path || '/placeholder.svg';
  };

  const handleItemClick = (item: ShopContent) => {
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
        <ShoppingBag className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Shop</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Purchase premium content and own it forever
      </p>

      {shopContent.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No items available for purchase at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shopContent.map((item) => (
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
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-semibold">
                    ${item.price}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2">{item.title}</h3>
                  <Button size="sm" className="w-full">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Purchase
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shop;
