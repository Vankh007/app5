import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search as SearchIcon, Loader2, Play, Star, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Content {
  id: string;
  title: string;
  overview?: string;
  content_type: 'movie' | 'series' | 'short';
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  popularity?: number;
  genre?: string;
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(query);
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<Content[]>([]);

  useEffect(() => {
    if (query) {
      performSearch(query);
    } else {
      fetchSuggestedContent();
    }
  }, [query]);

  const fetchSuggestedContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .order('popularity', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching suggested content:', error);
        setSuggestedContent([]);
      } else {
        setSuggestedContent(data || []);
      }
    } catch (err) {
      console.error('Error fetching suggested content:', err);
      setSuggestedContent([]);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,overview.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) {
        console.error('Search error:', error);
        setResults([]);
      } else {
        setResults(data || []);
      }
    } catch (err) {
      console.error('Error performing search:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleContentClick = (content: Content) => {
    navigate(`/watch/${content.content_type}/${content.id}`);
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    const normalizedRating = rating / 2; // Convert to 5-star scale
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'fill-primary text-primary'
                : i === fullStars && hasHalfStar
                ? 'fill-primary/50 text-primary'
                : 'fill-muted text-muted'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Top Search Bar */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="search"
              placeholder="Search Movies, Series, Animes, Streaming..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-4 pr-12 bg-secondary/50 border-border text-base"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchQuery('');
                  setResults([]);
                  setSearched(false);
                  navigate('/search');
                }}
                className="absolute right-0 top-0 h-12 w-12"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            {/* Results Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-primary" />
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wide">
                  SEARCH RESULTS - {results.length}
                </h2>
              </div>
            </div>

            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((content) => (
                  <div
                    key={content.id}
                    onClick={() => handleContentClick(content)}
                    className="group cursor-pointer border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 relative"
                  >
                    {/* Background Banner */}
                    {content.backdrop_path && (
                      <div className="absolute inset-0">
                        <img
                          src={content.backdrop_path}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/60" />
                      </div>
                    )}
                    
                    <div className="relative flex gap-3 md:gap-4 p-3 md:p-4">
                      {/* Poster Image */}
                      <div className="flex-shrink-0 w-24 md:w-32 lg:w-40">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                          <img
                            src={content.poster_path || content.backdrop_path || '/placeholder.svg'}
                            alt={content.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div>
                          <h3 className="text-sm md:text-lg lg:text-xl font-bold mb-2 md:mb-3 group-hover:text-primary transition-colors line-clamp-2 text-white">
                            {content.title.toUpperCase()}
                          </h3>

                          <div className="space-y-1 md:space-y-2 mb-2">
                            {/* TYPE */}
                            <div className="flex items-center gap-2 text-xs md:text-sm">
                              <span className="text-gray-400 font-semibold uppercase">TYPE :</span>
                              <span className="text-white capitalize">
                                {content.content_type === 'short' ? 'Short' : content.content_type}
                              </span>
                            </div>

                            {/* GENRE */}
                            {content.genre && (
                              <div className="flex items-center gap-2 text-xs md:text-sm">
                                <span className="text-gray-400 font-semibold uppercase">GENRE :</span>
                                <span className="text-white">{content.genre}</span>
                              </div>
                            )}

                            {/* RATING */}
                            {content.popularity && (
                              <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                                <span className="text-gray-400 font-semibold uppercase">RATING :</span>
                                <span className="text-primary font-bold text-sm md:text-base">
                                  {(content.popularity / 10).toFixed(1)}
                                </span>
                                {getRatingStars(content.popularity)}
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {content.overview && (
                            <p className="text-xs md:text-sm text-gray-300 line-clamp-2 md:line-clamp-3">
                              {content.overview}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Play Button */}
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                          <Play className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-white fill-current transition-colors duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results State */}
            {results.length === 0 && (
              <div className="text-center py-12">
                <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-xl text-muted-foreground mb-2">No results found</p>
                <p className="text-sm text-muted-foreground">
                  Try searching with different keywords or check your spelling
                </p>
              </div>
            )}
          </>
        )}

        {/* Initial State - Show Suggested Programmes */}
        {!loading && !searched && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-primary" />
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wide">
                  SUGGESTED PROGRAMMES
                </h2>
              </div>
            </div>

            {suggestedContent.length > 0 && (
              <div className="space-y-4">
                {suggestedContent.map((content) => (
                  <div
                    key={content.id}
                    onClick={() => handleContentClick(content)}
                    className="group cursor-pointer border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 relative"
                  >
                    {/* Background Banner */}
                    {content.backdrop_path && (
                      <div className="absolute inset-0">
                        <img
                          src={content.backdrop_path}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/60" />
                      </div>
                    )}
                    
                    <div className="relative flex gap-3 md:gap-4 p-3 md:p-4">
                      {/* Poster Image */}
                      <div className="flex-shrink-0 w-24 md:w-32 lg:w-40">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                          <img
                            src={content.poster_path || content.backdrop_path || '/placeholder.svg'}
                            alt={content.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div>
                          <h3 className="text-sm md:text-lg lg:text-xl font-bold mb-2 md:mb-3 group-hover:text-primary transition-colors line-clamp-2 text-white">
                            {content.title.toUpperCase()}
                          </h3>

                          <div className="space-y-1 md:space-y-2 mb-2">
                            {/* TYPE */}
                            <div className="flex items-center gap-2 text-xs md:text-sm">
                              <span className="text-gray-400 font-semibold uppercase">TYPE :</span>
                              <span className="text-white capitalize">
                                {content.content_type === 'short' ? 'Short' : content.content_type}
                              </span>
                            </div>

                            {/* GENRE */}
                            {content.genre && (
                              <div className="flex items-center gap-2 text-xs md:text-sm">
                                <span className="text-gray-400 font-semibold uppercase">GENRE :</span>
                                <span className="text-white">{content.genre}</span>
                              </div>
                            )}

                            {/* RATING */}
                            {content.popularity && (
                              <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                                <span className="text-gray-400 font-semibold uppercase">RATING :</span>
                                <span className="text-primary font-bold text-sm md:text-base">
                                  {(content.popularity / 10).toFixed(1)}
                                </span>
                                {getRatingStars(content.popularity)}
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {content.overview && (
                            <p className="text-xs md:text-sm text-gray-300 line-clamp-2 md:line-clamp-3">
                              {content.overview}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Play Button */}
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                          <Play className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-white fill-current transition-colors duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Search;
