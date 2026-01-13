import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Film, Tv, Sparkles, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface NewContent {
  id: string;
  title: string;
  poster_path: string | null;
  content_type: string;
  created_at: string;
  genre: string | null;
}

export const NewAddsSection = () => {
  const navigate = useNavigate();
  const [newContent, setNewContent] = useState<NewContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewContent();
  }, []);

  const fetchNewContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('id, title, poster_path, content_type, created_at, genre')
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setNewContent(data || []);
    } catch (error) {
      console.error('Error fetching new content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentClick = (item: NewContent) => {
    const type = item.content_type === 'series' ? 'series' : 'movie';
    navigate(`/watch/${type}/${item.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-28 h-40 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (newContent.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">New Adds</h3>
          <Badge variant="secondary" className="text-xs">
            {newContent.length}
          </Badge>
        </div>
        <button 
          onClick={() => navigate('/movies')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {newContent.map((item) => (
            <div
              key={item.id}
              className="group flex-shrink-0 w-28 cursor-pointer"
              onClick={() => handleContentClick(item)}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted mb-2">
                {item.poster_path ? (
                  <img
                    src={item.poster_path}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted">
                    {item.content_type === 'series' ? (
                      <Tv className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <Film className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-1.5 left-1.5">
                  <Badge 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0 bg-primary/80 text-primary-foreground"
                  >
                    {item.content_type === 'series' ? 'Series' : 'Movie'}
                  </Badge>
                </div>

                {/* New Badge */}
                <div className="absolute top-1.5 right-1.5">
                  <Badge 
                    variant="destructive" 
                    className="text-[10px] px-1.5 py-0"
                  >
                    NEW
                  </Badge>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Film className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <p className="text-xs font-medium text-foreground line-clamp-2 whitespace-normal">
                {item.title}
              </p>
              {item.genre && (
                <p className="text-[10px] text-muted-foreground line-clamp-1 whitespace-normal mt-0.5">
                  {item.genre}
                </p>
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
