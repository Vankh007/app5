import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TMDBSearchResult {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  genre_ids: number[];
  vote_average: number;
}

interface AdminAnimeAddProps {
  contentType?: 'movie' | 'series';
}

const AdminAnimeAdd = ({ contentType }: AdminAnimeAddProps = {}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<TMDBSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    poster_path: "",
    backdrop_path: "",
    genre: "",
    overview: "",
    release_date: "",
    tmdb_id: null as number | null,
    access_type: "free" as "free" | "membership" | "purchase",
    price: 0,
    currency: "USD",
    purchase_period: 1,
    max_devices: 3,
    exclude_from_plan: false,
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced real-time search using anime-api edge function
  useEffect(() => {
    const searchTMDB = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('anime-api', {
          body: { action: 'search', query: searchQuery }
        });
        
        if (error) throw error;
        
        // Transform results to match our interface
        const results = (data.results || []).slice(0, 8).map((r: any) => ({
          id: r.id,
          name: r.title || r.name,
          poster_path: r.poster_path,
          backdrop_path: r.backdrop_path,
          overview: r.overview,
          first_air_date: r.release_date || r.first_air_date,
          genre_ids: [],
          vote_average: r.vote_average
        }));
        
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchTMDB, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('anime-api', {
        body: { action: 'search', query: searchQuery }
      });
      
      if (error) throw error;
      
      const results = (data.results || []).map((r: any) => ({
        id: r.id,
        name: r.title || r.name,
        poster_path: r.poster_path,
        backdrop_path: r.backdrop_path,
        overview: r.overview,
        first_air_date: r.release_date || r.first_air_date,
        genre_ids: [],
        vote_average: r.vote_average
      }));
      
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAnime = async (result: TMDBSearchResult) => {
    try {
      // Fetch detailed info from anime-api
      const { data: details, error } = await supabase.functions.invoke('anime-api', {
        body: { action: 'details', tmdb_id: result.id }
      });
      
      if (error) throw error;
      
      setFormData({
        ...formData,
        title: details.title || result.name,
        poster_path: details.poster_path || "",
        backdrop_path: details.backdrop_path || "",
        overview: details.overview || result.overview,
        release_date: details.release_date || result.first_air_date,
        tmdb_id: result.id,
        genre: details.genres?.join(", ") || "",
      });
      
      toast.success("Anime info loaded from TMDB");
      setSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to fetch details:", error);
      toast.error("Failed to load anime details");
    }
  };

  const createAnimeMutation = useMutation({
    mutationFn: async () => {
      // Create the anime content
      const { data: content, error } = await supabase
        .from("content")
        .insert({
          title: formData.title,
          poster_path: formData.poster_path,
          backdrop_path: formData.backdrop_path,
          genre: formData.genre,
          overview: formData.overview,
          release_date: formData.release_date,
          release_year: formData.release_date?.split('-')[0],
          tmdb_id: formData.tmdb_id,
          content_type: contentType === 'movie' ? 'anime-movie' : contentType === 'series' ? 'anime-series' : 'anime',
          access_type: formData.access_type,
          price: formData.price,
          currency: formData.currency,
          purchase_period: formData.purchase_period,
          max_devices: formData.max_devices,
          exclude_from_plan: formData.exclude_from_plan,
        })
        .select()
        .single();

      if (error) throw error;

      // Import additional data from TMDB if we have tmdb_id
      if (formData.tmdb_id && content) {
        try {
          // Fetch detailed anime info including seasons
          const { data: tmdbDetails } = await supabase.functions.invoke('anime-api', {
            body: { action: 'details', tmdb_id: formData.tmdb_id }
          });

          // Import trailer if available
          if (tmdbDetails?.videos?.results?.length > 0) {
            const trailer = tmdbDetails.videos.results.find((v: any) =>
              v.type === 'Trailer' && v.site === 'YouTube'
            ) || tmdbDetails.videos.results[0];

            if (trailer && trailer.site === 'YouTube') {
              await supabase.from('trailers').insert({
                content_id: content.id,
                youtube_id: trailer.key,
              });
            }
          }

          // Import seasons and episodes from TMDB (without streaming sources)
          if (tmdbDetails?.seasons?.length > 0) {
            for (const season of tmdbDetails.seasons) {
              // Skip specials (season 0) if needed
              if (season.season_number === 0) continue;

              const { data: newSeason } = await supabase
                .from('seasons')
                .insert({
                  show_id: content.id,
                  season_number: season.season_number,
                  title: season.name,
                  overview: season.overview,
                  poster_path: season.poster_path,
                  tmdb_id: season.id,
                })
                .select()
                .single();

              if (newSeason) {
                // Get episodes for this season
                const { data: seasonDetails } = await supabase.functions.invoke('anime-api', {
                  body: { action: 'season', tmdb_id: formData.tmdb_id, episode_id: season.season_number }
                });

                if (seasonDetails?.episodes?.length > 0) {
                  for (const ep of seasonDetails.episodes) {
                    await supabase.from('episodes').insert({
                      show_id: content.id,
                      season_id: newSeason.id,
                      episode_number: ep.episode_number,
                      title: ep.name || `Episode ${ep.episode_number}`,
                      overview: ep.overview,
                      air_date: ep.air_date,
                      still_path: ep.still_path,
                      duration: ep.runtime,
                      vote_average: ep.vote_average,
                      tmdb_id: ep.id,
                      access_type: formData.access_type,
                    });
                  }
                }
              }
            }
          }

          // Import cast members
          if (tmdbDetails?.credits?.cast?.length > 0) {
            for (const castMember of tmdbDetails.credits.cast.slice(0, 15)) {
              try {
                const { data: existingCast } = await supabase
                  .from('cast_members')
                  .select('id')
                  .eq('tmdb_id', castMember.id)
                  .maybeSingle();

                let castMemberId = existingCast?.id;

                if (!existingCast) {
                  const { data: newCast } = await supabase
                    .from('cast_members')
                    .insert({
                      tmdb_id: castMember.id,
                      name: castMember.name,
                      profile_path: castMember.profile_path
                        ? `https://image.tmdb.org/t/p/original${castMember.profile_path}`
                        : null,
                      known_for_department: castMember.known_for_department,
                      popularity: castMember.popularity,
                      gender: castMember.gender,
                    })
                    .select()
                    .single();

                  castMemberId = newCast?.id;
                }

                if (castMemberId) {
                  await supabase.from('cast_credits').insert({
                    cast_member_id: castMemberId,
                    tmdb_content_id: formData.tmdb_id,
                    title: formData.title,
                    character_name: castMember.character,
                    media_type: 'tv',
                    release_date: formData.release_date,
                    poster_path: formData.poster_path,
                  });
                }
              } catch (castError) {
                console.error('Error processing cast member:', castError);
              }
            }
          }
        } catch (importError) {
          console.error('Error importing additional data:', importError);
          toast.error('Anime created but some data could not be imported');
        }
      }

      return content;
    },
    onSuccess: (data) => {
      toast.success("Anime created with seasons & episodes!");
      queryClient.invalidateQueries({ queryKey: ["admin-animes"] });
      navigate(`/admin/animes/${data.id}/edit`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create anime: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Please enter an anime title");
      return;
    }
    createAnimeMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/animes")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Anime</h1>
            <p className="text-muted-foreground">Search TMDB and create a new anime (episodes imported without streaming sources)</p>
          </div>
        </div>

        {/* TMDB Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search TMDB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 relative" ref={searchRef}>
              <div className="flex-1 relative">
                <Input
                  placeholder="Search anime by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {suggestions.map((result) => (
                      <button
                        key={result.id}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors border-b border-border last:border-b-0 text-left"
                        onClick={() => handleSelectAnime(result)}
                      >
                        {result.poster_path ? (
                          <img
                            src={result.poster_path}
                            alt={result.name}
                            className="w-12 h-18 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">No Image</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.first_air_date ? new Date(result.first_air_date).getFullYear() : "N/A"}
                          </p>
                          {result.overview && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {result.overview}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="cursor-pointer group relative overflow-hidden rounded-lg border hover:border-primary transition-colors"
                    onClick={() => handleSelectAnime(result)}
                  >
                    {result.poster_path ? (
                      <img
                        src={result.poster_path}
                        alt={result.name}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-xs font-medium line-clamp-2">{result.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anime Form */}
        <Card>
          <CardHeader>
            <CardTitle>Anime Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Anime title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmdb_id">TMDB ID</Label>
                <Input
                  id="tmdb_id"
                  value={formData.tmdb_id || ""}
                  onChange={(e) => setFormData({ ...formData, tmdb_id: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="TMDB ID"
                  type="number"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poster_path">Poster URL</Label>
                <Input
                  id="poster_path"
                  value={formData.poster_path}
                  onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backdrop_path">Backdrop URL</Label>
                <Input
                  id="backdrop_path"
                  value={formData.backdrop_path}
                  onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Action, Comedy, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="release_date">Release Date</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overview">Overview</Label>
              <Textarea
                id="overview"
                value={formData.overview}
                onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                placeholder="Anime description..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_type">Access Type</Label>
              <Select
                value={formData.access_type}
                onValueChange={(value: "free" | "membership" | "purchase") =>
                  setFormData({ ...formData, access_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.access_type === "purchase" && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_period">Rental Period (days)</Label>
                  <Input
                    id="purchase_period"
                    type="number"
                    value={formData.purchase_period}
                    onChange={(e) => setFormData({ ...formData, purchase_period: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => navigate("/admin/animes")}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createAnimeMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {createAnimeMutation.isPending ? "Creating..." : "Create Anime"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnimeAdd;
