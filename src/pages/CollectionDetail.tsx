import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContentItem {
  id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  overview?: string;
  content_type?: string;
  tmdb_id?: number;
}

interface Collection {
  id: string;
  name: string;
  backdrop_url?: string | null;
  description?: string | null;
}

const CollectionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollectionAndContent = async () => {
      if (!slug) return;

      try {
        setLoading(true);

        // Convert slug to name (e.g., "c-drama" -> "C-Drama", "k-drama" -> "K-Drama")
        const nameFromSlug = slug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('-');

        // Try to find collection by name (case-insensitive)
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select('*')
          .ilike('name', nameFromSlug)
          .maybeSingle();

        if (collectionError) {
          console.error('Error fetching collection:', collectionError);
          setLoading(false);
          return;
        }

        if (!collectionData) {
          setLoading(false);
          return;
        }

        setCollection(collectionData);

        // Fetch content for this collection
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('id, title, poster_path, backdrop_path, release_date, overview, content_type, tmdb_id')
          .eq('collection_id', collectionData.id)
          .order('created_at', { ascending: false });

        if (contentError) {
          console.error('Error fetching content:', contentError);
        } else {
          setContent(contentData || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionAndContent();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Folder className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Collection not found</h1>
        <Link to="/collections">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collections
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: collection.backdrop_url 
          ? `linear-gradient(to bottom, hsl(var(--background) / 0.50), hsl(var(--background) / 0.70)), url(${collection.backdrop_url})` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="container mx-auto px-4 py-8 relative z-10">
        <Link to="/collections">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collections
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">{collection.name}</h1>
          {collection.description && (
            <p className="text-muted-foreground text-lg">{collection.description}</p>
          )}
          <p className="text-muted-foreground mt-2">{content.length} items</p>
        </div>

        {content.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No content in this collection yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {content.map((item) => {
              const watchUrl = item.tmdb_id
                ? (item.content_type === 'series' || item.content_type === 'anime')
                  ? `/watch/series/${item.tmdb_id}/1/1`
                  : `/watch/movie/${item.tmdb_id}`
                : `/watch/${item.id}`;
              
              return (
              <Link 
                key={item.id} 
                to={watchUrl}
                className="group"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Folder className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                {item.release_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.release_date).getFullYear()}
                  </p>
                )}
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;
