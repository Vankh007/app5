import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Folder } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
interface ContentItem {
  id: string;
  poster_path?: string;
  title: string;
  tmdb_id?: number;
  content_type: string;
}
interface Collection {
  id: string;
  name: string;
  backdrop_url?: string | null;
  content: ContentItem[];
}
const CollectionsScroll = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const {
          data: collectionsData,
          error: collectionsError
        } = (await supabase.from('collections').select('id, name, backdrop_url')) as any;
        if (collectionsError) throw collectionsError;

        // Get all collections with backdrop URLs
        const collectionsWithBackdrops = (collectionsData || []).filter((c: any) => c.backdrop_url);

        // Rotate backdrop every 6 hours based on current time
        if (collectionsWithBackdrops.length > 0) {
          const now = new Date();
          const hoursSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60));
          const index = Math.floor(hoursSinceEpoch / 6) % collectionsWithBackdrops.length;
          setBackdropUrl(collectionsWithBackdrops[index].backdrop_url);
        }
        const collectionsWithContent = await Promise.all((collectionsData || []).map(async (collection: any) => {
          const {
            data: contentData
          } = await supabase.from('content').select('id, poster_path, title, tmdb_id, content_type').eq('collection_id', collection.id).limit(4);
          return {
            ...collection,
            content: contentData || []
          };
        }));
        setCollections(collectionsWithContent);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, []);
  if (loading || collections.length === 0) {
    return null;
  }
  return <div className="space-y-0">
      <div className="relative overflow-hidden">
        {/* Background Image */}
        {backdropUrl && <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${backdropUrl})`
      }}>
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/70 dark:from-black/95 dark:via-black/85 dark:to-black/70" />
          </div>}

        {/* Content */}
        <div className="relative p-0 md:p-4 lg:p-6 px-[15px]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 md:mb-4 px-2 md:px-0">
            <div className="h-4 md:h-6 lg:h-8 w-1 bg-primary" />
            <h2 className="text-xs md:text-lg lg:text-xl xl:text-2xl font-bold uppercase tracking-wide text-foreground">
              Collections
            </h2>
          </div>

          {/* Collections Scroll Container */}
          <div className="h-auto">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 md:gap-3 lg:gap-4 px-2 md:px-0">
                {collections.map(collection => {
                const slug = collection.name.toLowerCase().replace(/\s+/g, '-');
                return <NavLink key={collection.id} to={`/collections/${slug}`} className="flex-shrink-0 w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 animate-fade-in">
                      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer border-border/50 hover:border-primary overflow-hidden bg-card/40 backdrop-blur-md">
                        <CardContent className="p-2 md:p-3 lg:p-4 flex flex-col">
                          <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                            <Folder className="h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-primary flex-shrink-0" />
                            <h3 className="font-semibold text-[10px] md:text-xs lg:text-sm text-foreground line-clamp-1">
                              {collection.name}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 md:gap-1.5 lg:gap-2 mb-1.5 md:mb-2">
                            {collection.content.slice(0, 4).map(item => <NavLink key={item.id} to={item.tmdb_id ? item.content_type === 'series' || item.content_type === 'anime' ? `/watch/series/${item.tmdb_id}/1/1` : `/watch/movie/${item.tmdb_id}` : '#'} onClick={e => {
                          if (!item.tmdb_id) {
                            e.preventDefault();
                            console.error('No TMDB ID for content:', item.title);
                          } else {
                            e.stopPropagation();
                          }
                        }} className="aspect-[2/3] rounded overflow-hidden bg-muted shadow-sm hover:ring-2 hover:ring-primary transition-all">
                                {item.poster_path ? <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} alt={item.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Folder className="h-4 w-4 md:h-6 md:w-6" />
                                  </div>}
                              </NavLink>)}
                          </div>
                          
                          <p className="text-[8px] md:text-[10px] lg:text-xs text-muted-foreground">
                            {collection.content.length} {collection.content.length === 1 ? 'item' : 'items'}
                          </p>
                        </CardContent>
                      </Card>
                    </NavLink>;
              })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default CollectionsScroll;