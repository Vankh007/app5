import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Trash2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface MyListItem {
  id: string;
  content_id: string;
  added_at: string;
  content: {
    id: string;
    title: string;
    poster_path: string;
    backdrop_path: string;
    content_type: string;
    tmdb_id: number;
    overview: string;
  };
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const MyList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listItems, setListItems] = useState<MyListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyList();
  }, [user]);

  const fetchMyList = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('my_list')
        .select(`
          id,
          content_id,
          added_at,
          content:content_id (
            id,
            title,
            poster_path,
            backdrop_path,
            content_type,
            tmdb_id,
            overview
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match interface
      const transformedData = (data || []).map(item => ({
        ...item,
        content: Array.isArray(item.content) && item.content.length > 0 
          ? item.content[0]
          : item.content
      })) as MyListItem[];
      
      setListItems(transformedData);
    } catch (error) {
      console.error('Error fetching list:', error);
      toast.error('Failed to load your list');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('my_list')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setListItems(listItems.filter(item => item.id !== id));
      toast.success('Removed from My List');
    } catch (error) {
      console.error('Error removing from list:', error);
      toast.error('Failed to remove from list');
    }
  };

  const handleWatch = (item: MyListItem) => {
    if (item.content?.tmdb_id) {
      navigate(`/watch/${item.content.content_type}/${item.content.tmdb_id}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to view your list</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your list...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">My List</h1>
        
        {listItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">Your list is empty</p>
            <p className="text-muted-foreground mb-6">Add movies and series to your list to watch them later</p>
            <Button onClick={() => navigate('/')}>Browse Content</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listItems.map((item) => (
              <div key={item.id} className="group relative">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                  {item.content?.poster_path ? (
                    <img
                      src={`${TMDB_IMAGE_BASE_URL}${item.content.poster_path}`}
                      alt={item.content.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-sm text-muted-foreground text-center p-4">
                        {item.content?.title}
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleWatch(item)}
                      className="gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Watch
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemove(item.id)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                </div>
                
                <h3 className="mt-2 text-sm font-medium line-clamp-2">
                  {item.content?.title}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyList;