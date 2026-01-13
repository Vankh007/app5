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
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  uploadTmdbImagesToIdrive, 
  uploadSeasonPosterToIdrive, 
  uploadEpisodeStillToIdrive,
  uploadCastProfileToIdrive 
} from "@/lib/tmdbImageUpload";

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

const TMDB_API_KEY = "5cfa727c2f549c594772a50e10e3f272";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const AdminSeriesAdd = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<TMDBSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [uploadToIdrive, setUploadToIdrive] = useState(true);
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

  // Debounced real-time search
  useEffect(() => {
    const searchTMDB = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`
        );
        const data = await response.json();
        setSuggestions(data.results?.slice(0, 8) || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("TMDB search error:", error);
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
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("TMDB search error:", error);
      toast.error("Failed to search TMDB");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSeries = async (result: TMDBSearchResult) => {
    // Check for duplicates first
    const { data: existingContent } = await supabase
      .from("content")
      .select("id, title")
      .eq("tmdb_id", result.id)
      .eq("content_type", "series")
      .maybeSingle();

    if (existingContent) {
      toast.error(`"${result.name}" (TMDB ID: ${result.id}) already exists in your database!`, {
        duration: 5000,
      });
      return;
    }

    // Fetch detailed info
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${result.id}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      const details = await response.json();
      
      let finalPosterPath = result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : "";
      let finalBackdropPath = result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : "";
      
      // Upload images to iDrive E2 if enabled
      if (uploadToIdrive) {
        toast.info("Uploading images to iDrive E2...");
        const { posterUrl, backdropUrl } = await uploadTmdbImagesToIdrive(
          result.id,
          result.poster_path,
          result.backdrop_path,
          'tv'
        );
        
        // Use iDrive URLs if upload succeeded
        if (posterUrl) {
          finalPosterPath = posterUrl;
          console.log("Poster uploaded to iDrive:", posterUrl);
        }
        if (backdropUrl) {
          finalBackdropPath = backdropUrl;
          console.log("Backdrop uploaded to iDrive:", backdropUrl);
        }
      }
      
      setFormData({
        ...formData,
        title: result.name,
        poster_path: finalPosterPath,
        backdrop_path: finalBackdropPath,
        overview: result.overview,
        release_date: result.first_air_date,
        tmdb_id: result.id,
        genre: details.genres?.map((g: any) => g.name).join(", ") || "",
      });
      
      const successMsg = uploadToIdrive 
        ? "Series info loaded with images saved to iDrive E2" 
        : "Series info loaded from TMDB";
      toast.success(successMsg);
      setSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to fetch TMDB details:", error);
      toast.error("Failed to load series details");
    }
  };

  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      const { data: content, error } = await supabase
        .from("content")
        .insert({
          title: formData.title,
          poster_path: formData.poster_path,
          backdrop_path: formData.backdrop_path,
          genre: formData.genre,
          overview: formData.overview,
          release_date: formData.release_date,
          tmdb_id: formData.tmdb_id,
          content_type: "series",
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

      // Now fetch and import cast, trailers, seasons & episodes
      if (formData.tmdb_id && content) {
        try {
          // Fetch cast data
          const creditsResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${formData.tmdb_id}/credits?api_key=${TMDB_API_KEY}`
          );
          const creditsData = await creditsResponse.json();

          // Fetch trailer data
          const videosResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${formData.tmdb_id}/videos?api_key=${TMDB_API_KEY}`
          );
          const videosData = await videosResponse.json();

          // Fetch seasons data
          const seriesResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${formData.tmdb_id}?api_key=${TMDB_API_KEY}`
          );
          const seriesData = await seriesResponse.json();

          // Import cast members (top 15)
          if (creditsData.cast && creditsData.cast.length > 0) {
            for (const castMember of creditsData.cast.slice(0, 15)) {
              try {
                const { data: existingCast } = await supabase
                  .from('cast_members')
                  .select('id')
                  .eq('tmdb_id', castMember.id)
                  .maybeSingle();

                let castMemberId = existingCast?.id;

                if (!existingCast) {
                  // Upload cast profile image to iDrive if enabled
                  let finalProfilePath = castMember.profile_path
                    ? `https://image.tmdb.org/t/p/original${castMember.profile_path}`
                    : null;
                    
                  if (uploadToIdrive && castMember.profile_path) {
                    const castProfileUrl = await uploadCastProfileToIdrive(
                      castMember.id,
                      castMember.profile_path
                    );
                    if (castProfileUrl) {
                      finalProfilePath = castProfileUrl;
                    }
                  }
                    
                  const { data: newCast } = await supabase
                    .from('cast_members')
                    .insert({
                      tmdb_id: castMember.id,
                      name: castMember.name,
                      profile_path: finalProfilePath,
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

          // Import trailer
          if (videosData.results && videosData.results.length > 0) {
            const trailer = videosData.results.find((v: any) =>
              v.type === 'Trailer' && v.site === 'YouTube'
            ) || videosData.results[0];

            if (trailer && trailer.site === 'YouTube') {
              await supabase.from('trailers').delete().eq('content_id', content.id);
              await supabase.from('trailers').insert({
                content_id: content.id,
                youtube_id: trailer.key,
              });
            }
          }

          // Import seasons and episodes
          if (seriesData.number_of_seasons) {
            for (let i = 1; i <= seriesData.number_of_seasons; i++) {
              const seasonResponse = await fetch(
                `https://api.themoviedb.org/3/tv/${formData.tmdb_id}/season/${i}?api_key=${TMDB_API_KEY}`
              );
              const seasonData = await seasonResponse.json();

              if (seasonData.success !== false) {
                // Upload season poster to iDrive if enabled
                let finalSeasonPoster = seasonData.poster_path
                  ? `https://image.tmdb.org/t/p/original${seasonData.poster_path}`
                  : null;
                  
                if (uploadToIdrive && seasonData.poster_path) {
                  const seasonPosterUrl = await uploadSeasonPosterToIdrive(
                    formData.tmdb_id,
                    seasonData.season_number,
                    seasonData.poster_path
                  );
                  if (seasonPosterUrl) {
                    finalSeasonPoster = seasonPosterUrl;
                  }
                }
                  
                const { data: existingSeason } = await supabase
                  .from('seasons')
                  .select('id')
                  .eq('show_id', content.id)
                  .eq('season_number', seasonData.season_number)
                  .maybeSingle();

                let seasonId = existingSeason?.id;

                if (!existingSeason) {
                  const { data: newSeason } = await supabase
                    .from('seasons')
                    .insert({
                      show_id: content.id,
                      season_number: seasonData.season_number,
                      title: seasonData.name,
                      overview: seasonData.overview,
                      poster_path: finalSeasonPoster,
                      tmdb_id: seasonData.id,
                    })
                    .select()
                    .single();

                  seasonId = newSeason?.id;
                }

                // Import episodes
                if (seasonData.episodes && seasonId) {
                  for (const episodeData of seasonData.episodes) {
                    // Upload episode still to iDrive if enabled
                    let finalStillPath = episodeData.still_path
                      ? `https://image.tmdb.org/t/p/original${episodeData.still_path}`
                      : null;
                      
                    if (uploadToIdrive && episodeData.still_path) {
                      const episodeStillUrl = await uploadEpisodeStillToIdrive(
                        formData.tmdb_id,
                        seasonData.season_number,
                        episodeData.episode_number,
                        episodeData.still_path
                      );
                      if (episodeStillUrl) {
                        finalStillPath = episodeStillUrl;
                      }
                    }
                      
                    const { data: existingEpisode } = await supabase
                      .from('episodes')
                      .select('id')
                      .eq('show_id', content.id)
                      .eq('season_id', seasonId)
                      .eq('episode_number', episodeData.episode_number)
                      .maybeSingle();

                    if (!existingEpisode) {
                      await supabase.from('episodes').insert({
                        show_id: content.id,
                        season_id: seasonId,
                        episode_number: episodeData.episode_number,
                        title: episodeData.name,
                        overview: episodeData.overview,
                        still_path: finalStillPath,
                        air_date: episodeData.air_date,
                        vote_average: episodeData.vote_average,
                        duration: episodeData.runtime,
                        tmdb_id: episodeData.id,
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (importError) {
          console.error('Error importing additional data:', importError);
          toast.error('Series created but some data could not be imported');
        }
      }

      return content;
    },
    onSuccess: (data) => {
      toast.success("Series created with images saved to iDrive E2!");
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["admin-casters"] });
      navigate(`/admin/series/${data.id}/edit`);
    },
    onError: (error: Error) => {
      toast.error("Failed to create series: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Please enter a series title");
      return;
    }
    createSeriesMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="space-y-6" onContextMenu={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/series")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Series</h1>
            <p className="text-muted-foreground">Search TMDB and create a new series</p>
          </div>
        </div>

        {/* TMDB Search */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Search TMDB</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="uploadToIdrive" 
                checked={uploadToIdrive}
                onCheckedChange={(checked) => setUploadToIdrive(checked === true)}
              />
              <Label htmlFor="uploadToIdrive" className="text-sm font-normal cursor-pointer">
                Save images to iDrive E2
              </Label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 relative" ref={searchRef}>
              <div className="flex-1 relative">
                <Input
                  placeholder="Search series by title..."
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
                        onClick={() => handleSelectSeries(result)}
                      >
                        {result.poster_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE}${result.poster_path}`}
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
                    onClick={() => handleSelectSeries(result)}
                  >
                    {result.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${result.poster_path}`}
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

        {/* Series Form */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Series Information</CardTitle>
            <Button 
              onClick={handleSubmit} 
              disabled={createSeriesMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createSeriesMutation.isPending ? "Creating..." : "Create Series"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Series title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poster_path">Poster URL</Label>
                <Input
                  id="poster_path"
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  value={formData.poster_path}
                  onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
                />
                {formData.poster_path && (
                  <img src={formData.poster_path} alt="Poster preview" className="w-32 rounded" />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="backdrop_path">Backdrop URL</Label>
                <Input
                  id="backdrop_path"
                  placeholder="https://image.tmdb.org/t/p/original/..."
                  value={formData.backdrop_path}
                  onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  placeholder="Action, Drama, etc."
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
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
                placeholder="Series description..."
                value={formData.overview}
                onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_type">Access Type</Label>
              <Select
                value={formData.access_type}
                onValueChange={(value: any) => setFormData({ ...formData, access_type: value })}
              >
                <SelectTrigger id="access_type">
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
              <div className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="price">Rent Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_period">Rental Period (Days)</Label>
                  <Input
                    id="purchase_period"
                    type="number"
                    value={formData.purchase_period}
                    onChange={(e) => setFormData({ ...formData, purchase_period: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_devices">Max Devices</Label>
                  <Input
                    id="max_devices"
                    type="number"
                    value={formData.max_devices}
                    onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2 md:col-span-4">
                  <Label htmlFor="exclude_from_plan">Exclude from plan</Label>
                  <Select
                    value={formData.exclude_from_plan ? "yes" : "no"}
                    onValueChange={(value) => setFormData({ ...formData, exclude_from_plan: value === "yes" })}
                  >
                    <SelectTrigger id="exclude_from_plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSeriesAdd;
