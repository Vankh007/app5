import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Loader2, Tv, Film } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TMDBAnime {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  popularity: number;
  vote_average: number;
}

interface ConsumetResult {
  id: string;
  title: string | { romaji?: string; english?: string; native?: string; userPreferred?: string };
  image: string;
  releaseDate?: string;
  subOrDub?: string;
}

// Helper to extract title string from ConsumetResult
const getConsumetTitle = (title: ConsumetResult['title']): string => {
  if (typeof title === 'string') return title;
  return title?.english || title?.romaji || title?.userPreferred || title?.native || 'Unknown';
};

interface AnimeImportDialogProps {
  contentType?: 'movie' | 'series';
}

export function AnimeImportDialog({ contentType }: AnimeImportDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tmdbIdQuery, setTmdbIdQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'name' | 'id'>('name');
  const [searchResults, setSearchResults] = useState<TMDBAnime[]>([]);
  const [consumetResults, setConsumetResults] = useState<ConsumetResult[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<TMDBAnime | null>(null);
  const [selectedConsumet, setSelectedConsumet] = useState<ConsumetResult | null>(null);
  const [provider, setProvider] = useState('gogoanime');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingConsumet, setIsSearchingConsumet] = useState(false);
  const [step, setStep] = useState<'search' | 'match' | 'import'>('search');
  const [skipStreamingSources, setSkipStreamingSources] = useState(false);
  
  const queryClient = useQueryClient();

  const searchTMDB = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('anime-api', {
        body: { action: 'search', query: searchQuery }
      });
      
      if (error) throw error;
      setSearchResults(data.results || []);
    } catch (error: any) {
      toast.error('Failed to search: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const searchByTMDBId = async () => {
    const id = parseInt(tmdbIdQuery.trim());
    if (isNaN(id)) {
      toast.error('Please enter a valid TMDB ID number');
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('anime-api', {
        body: { action: 'details', tmdb_id: id }
      });
      
      if (error) throw error;
      
      if (data && data.id) {
        // Convert to TMDBAnime format and auto-select
        const anime: TMDBAnime = {
          id: data.id,
          title: data.title,
          original_title: data.original_title,
          overview: data.overview,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          release_date: data.release_date,
          popularity: data.popularity,
          vote_average: data.vote_average,
        };
        setSearchResults([anime]);
        toast.success(`Found: ${anime.title}`);
      } else {
        toast.error('Anime not found with this TMDB ID');
        setSearchResults([]);
      }
    } catch (error: any) {
      toast.error('Failed to fetch: ' + error.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchConsumet = async (title: string) => {
    setIsSearchingConsumet(true);
    try {
      const { data, error } = await supabase.functions.invoke('anime-api', {
        body: { action: 'consumet_search', query: title, provider },
      });

      if (error) throw error;

      if (data?.error) {
        setConsumetResults(data.results || []);
        const status = data?.debug?.status ?? data?.debug?.attempts?.[0]?.status;
        const statusText = status ? ` (status ${status})` : '';
        toast.error(`Provider "${provider}" error${statusText}: ${data.error}`);
        return;
      }

      setConsumetResults(data.results || []);
    } catch (error: any) {
      toast.error('Failed to search provider: ' + error.message);
    } finally {
      setIsSearchingConsumet(false);
    }
  };

  const selectAnime = async (anime: TMDBAnime) => {
    setSelectedAnime(anime);
    setStep('match');
    await searchConsumet(anime.title);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAnime) {
        throw new Error('Please select an anime from TMDB');
      }
      
      if (!skipStreamingSources && !selectedConsumet) {
        throw new Error('Please select a streaming source or enable "Skip streaming sources"');
      }

      // Get detailed info from TMDB
      const { data: tmdbDetails, error: tmdbError } = await supabase.functions.invoke('anime-api', {
        body: { action: 'details', tmdb_id: selectedAnime.id }
      });
      
      if (tmdbError) throw tmdbError;

      // Create the anime content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .insert({
          title: tmdbDetails.title,
          overview: tmdbDetails.overview,
          tagline: tmdbDetails.tagline,
          poster_path: tmdbDetails.poster_path,
          backdrop_path: tmdbDetails.backdrop_path,
          release_date: tmdbDetails.release_date,
          release_year: tmdbDetails.release_date?.split('-')[0],
          content_type: 'anime',
          tmdb_id: tmdbDetails.id,
          genre: tmdbDetails.genres?.join(', '),
          popularity: tmdbDetails.popularity,
          status: 'active',
          access_type: 'free',
          seasons: tmdbDetails.number_of_seasons,
        })
        .select()
        .single();

      if (contentError) throw contentError;

      // Get Consumet info only if not skipping streaming sources
      let consumetInfo: any = null;
      if (!skipStreamingSources && selectedConsumet) {
        const { data, error: consumetError } = await supabase.functions.invoke('anime-api', {
          body: { action: 'consumet_info', episode_id: selectedConsumet.id, provider }
        });
        if (!consumetError) {
          consumetInfo = data;
        }
      }

      // Create seasons
      for (const season of tmdbDetails.seasons || []) {
        const { data: seasonData, error: seasonError } = await supabase
          .from('seasons')
          .insert({
            show_id: content.id,
            season_number: season.season_number,
            title: season.name,
            poster_path: season.poster_path,
            tmdb_id: season.id,
          })
          .select()
          .single();

        if (seasonError) {
          console.error('Season insert error:', seasonError);
          continue;
        }

        // Get TMDB episodes for this season
        const { data: seasonDetails } = await supabase.functions.invoke('anime-api', {
          body: { action: 'season', tmdb_id: selectedAnime.id, episode_id: season.season_number }
        });

        // Create episodes
        for (const ep of seasonDetails?.episodes || []) {
          const { data: episodeData, error: epError } = await supabase
            .from('episodes')
            .insert({
              show_id: content.id,
              season_id: seasonData.id,
              episode_number: ep.episode_number,
              title: ep.name || `Episode ${ep.episode_number}`,
              overview: ep.overview,
              air_date: ep.air_date,
              still_path: ep.still_path,
              duration: ep.runtime,
              vote_average: ep.vote_average,
              tmdb_id: ep.id,
              access_type: 'free',
            })
            .select()
            .single();

          if (epError) {
            console.error('Episode insert error:', epError);
            continue;
          }

          // Only add streaming sources if not skipping
          if (!skipStreamingSources && consumetInfo) {
            const consumetEpisode = consumetInfo.episodes?.find(
              (ce: any) => ce.number === ep.episode_number
            );

            if (consumetEpisode?.id) {
              const { data: sources } = await supabase.functions.invoke('anime-api', {
                body: { action: 'consumet_sources', episode_id: consumetEpisode.id, provider }
              });

              if (sources?.sources?.length > 0) {
                for (const source of sources.sources) {
                  await supabase
                    .from('video_sources')
                    .insert({
                      episode_id: episodeData.id,
                      url: source.url,
                      quality: source.quality || 'auto',
                      source_type: source.isM3U8 ? 'hls' : 'mp4',
                      server_name: `${provider} - ${source.quality || 'default'}`,
                      is_default: source.quality === 'default' || sources.sources.indexOf(source) === 0,
                    });
                }
              }
            }
          }
        }
      }

      return content;
    },
    onSuccess: (data) => {
      const message = skipStreamingSources 
        ? `Successfully imported "${data.title}" with episodes (no streaming sources)!`
        : `Successfully imported "${data.title}" with episodes and streaming sources!`;
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['admin-animes'] });
      setOpen(false);
      resetDialog();
    },
    onError: (error: Error) => {
      toast.error('Import failed: ' + error.message);
    },
  });

  const resetDialog = () => {
    setSearchQuery('');
    setTmdbIdQuery('');
    setSearchMode('name');
    setSearchResults([]);
    setConsumetResults([]);
    setSelectedAnime(null);
    setSelectedConsumet(null);
    setStep('search');
    setSkipStreamingSources(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Import from API
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' && 'Search Anime from TMDB'}
            {step === 'match' && 'Match Streaming Source'}
            {step === 'import' && 'Import Anime'}
          </DialogTitle>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-2">
              <Button 
                variant={searchMode === 'name' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSearchMode('name')}
              >
                Search by Name
              </Button>
              <Button 
                variant={searchMode === 'id' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setSearchMode('id')}
              >
                Search by TMDB ID
              </Button>
            </div>

            {searchMode === 'name' ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Search anime (e.g., Naruto, One Piece)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchTMDB()}
                />
                <Button onClick={searchTMDB} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter TMDB ID (e.g., 301043 for Divine Manifestation)..."
                  value={tmdbIdQuery}
                  onChange={(e) => setTmdbIdQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchByTMDBId()}
                  type="number"
                />
                <Button onClick={searchByTMDBId} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {searchMode === 'id' 
                ? 'Tip: Find TMDB ID from themoviedb.org URL (e.g., /tv/301043 → ID is 301043)'
                : 'Tip: If search doesn\'t find the anime, try searching by TMDB ID instead'}
            </p>

            <ScrollArea className="h-[350px]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {searchResults.map((anime) => (
                  <div
                    key={anime.id}
                    className="cursor-pointer rounded-lg border p-2 hover:bg-accent transition-colors"
                    onClick={() => selectAnime(anime)}
                  >
                    {anime.poster_path ? (
                      <img
                        src={anime.poster_path}
                        alt={anime.title}
                        className="w-full h-40 object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted rounded flex items-center justify-center">
                        <Tv className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="mt-2 font-medium text-sm line-clamp-2">{anime.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {anime.release_date?.split('-')[0]} • ID: {anime.id}
                    </p>
                  </div>
                ))}
              </div>
              {searchResults.length === 0 && !isSearching && (
                <div className="text-center text-muted-foreground py-8">
                  {searchMode === 'name' 
                    ? 'Search for an anime to get started' 
                    : 'Enter a TMDB ID to fetch anime details'}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {step === 'match' && selectedAnime && (
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-accent/50 rounded-lg">
              {selectedAnime.poster_path && (
                <img src={selectedAnime.poster_path} alt={selectedAnime.title} className="w-20 h-28 object-cover rounded" />
              )}
              <div>
                <h3 className="font-semibold">{selectedAnime.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedAnime.release_date}</p>
                <p className="text-xs line-clamp-2 mt-1">{selectedAnime.overview}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={provider} onValueChange={(val) => { setProvider(val); setConsumetResults([]); }}>
                <SelectTrigger className="w-48 relative z-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent 
                  className="z-[100]"
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem value="gogoanime">GogoAnime</SelectItem>
                  <SelectItem value="zoro">Zoro/Aniwatch</SelectItem>
                  <SelectItem value="9anime">9Anime</SelectItem>
                  <SelectItem value="animefox">AnimeFox</SelectItem>
                  <SelectItem value="animepahe">AnimePahe</SelectItem>
                  <SelectItem value="bilibili">Bilibili (Chinese)</SelectItem>
                  <SelectItem value="marin">Marin</SelectItem>
                  <SelectItem value="enime">Enime</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => searchConsumet(selectedAnime.title)} disabled={isSearchingConsumet} variant="outline">
                {isSearchingConsumet ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Sources'}
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {consumetResults.map((result) => (
                  <div
                    key={result.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedConsumet?.id === result.id ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedConsumet(result)}
                  >
                    {result.image && (
                      <img src={result.image} alt={getConsumetTitle(result.title)} className="w-12 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{getConsumetTitle(result.title)}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {result.releaseDate && <span>{result.releaseDate}</span>}
                        {result.subOrDub && <span className="uppercase">{result.subOrDub}</span>}
                      </div>
                    </div>
                    {selectedConsumet?.id === result.id && (
                      <div className="text-primary font-medium">Selected</div>
                    )}
                  </div>
                ))}
                {consumetResults.length === 0 && !isSearchingConsumet && (
                  <div className="text-center text-muted-foreground py-8">
                    No streaming sources found. Try a different provider or search term.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox 
                id="skipSources" 
                checked={skipStreamingSources}
                onCheckedChange={(checked) => setSkipStreamingSources(checked as boolean)}
              />
              <Label htmlFor="skipSources" className="text-sm cursor-pointer">
                Skip streaming sources (import episodes without video links)
              </Label>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setStep('search'); setSelectedAnime(null); }}>
                Back
              </Button>
              <Button 
                onClick={() => importMutation.mutate()} 
                disabled={(!skipStreamingSources && !selectedConsumet) || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {skipStreamingSources ? 'Import Without Sources' : 'Import Anime'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
