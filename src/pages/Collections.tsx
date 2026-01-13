import { Folder } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface ContentItem {
  id: string;
  poster_path?: string;
  title: string;
  content_type?: string;
  tmdb_id?: number;
}

interface Collection {
  id: string;
  name: string;
  backdrop_url?: string | null;
  content: ContentItem[];
}

const Collections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        // Fetch all collections including backdrop_url
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('id, name, backdrop_url') as any;

        if (collectionsError) throw collectionsError;

        // Get all collections with backdrop URLs
        const collectionsWithBackdrops = (collectionsData || []).filter(
          (c: any) => c.backdrop_url
        );

        // Rotate backdrop every 6 hours based on current time
        if (collectionsWithBackdrops.length > 0) {
          const now = new Date();
          const hoursSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60));
          const index = Math.floor(hoursSinceEpoch / 6) % collectionsWithBackdrops.length;
          setBackdropUrl(collectionsWithBackdrops[index].backdrop_url);
        }

        // For each collection, fetch its content items
        const collectionsWithContent = await Promise.all(
          (collectionsData || []).map(async (collection) => {
            const { data: contentData } = await supabase
              .from('content')
              .select('id, poster_path, title, content_type, tmdb_id')
              .eq('collection_id', collection.id)
              .limit(6);

            return {
              ...collection,
              content: contentData || [],
            };
          })
        );

        setCollections(collectionsWithContent);
      } catch (error) {
        console.error('Error fetching collections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading collections...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: backdropUrl ? `linear-gradient(to bottom, hsl(var(--background) / 0.50), hsl(var(--background) / 0.70)), url(${backdropUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="container mx-auto py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Collections</h1>
          <p className="text-muted-foreground text-lg">Browse content collections</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => {
            // Convert collection name to slug (e.g., "C-Drama" -> "c-drama")
            const slug = collection.name.toLowerCase().replace(/\s+/g, '-');
            
            return (
              <NavLink key={collection.id} to={`/collections/${slug}`}>
                <Card className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-border/50 hover:border-primary overflow-hidden bg-card/40 backdrop-blur-md h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {collection.name}
                  </CardTitle>
                  <Folder className="h-5 w-5 text-primary flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {collection.content.slice(0, 6).map((item) => (
                      <div key={item.id} className="aspect-[2/3] rounded-md overflow-hidden bg-muted shadow-sm">
                        {item.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Folder className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {collection.content.length} {collection.content.length === 1 ? 'item' : 'items'}
                  </p>
                </CardContent>
              </Card>
            </NavLink>
            );
          })}
        </div>

        {collections.length === 0 && (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No collections found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Collections;
