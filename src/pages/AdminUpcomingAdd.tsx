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
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TMDBSearchResult {
  id: number;
  name?: string;
  title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date?: string;
  release_date?: string;
  genre_ids: number[];
  vote_average: number;
  media_type?: string;
}

const TMDB_API_KEY = "5cfa727c2f549c594772a50e10e3f272";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const AdminUpcomingAdd = () => {
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
    description: "",
    release_date: "",
    tmdb_id: null as number | null,
    content_type: "series" as "movie" | "series" | "anime",
    status: "upcoming" as "upcoming" | "released" | "cancelled",
    is_featured: false,
    genre: "",
    vote_average: null as number | null,
    popularity: null as number | null,
    original_language: "",
    tagline: "",
    trailer_youtube_id: "",
    trailer_self_hosted: "",
  });

  const [importedData, setImportedData] = useState({
    castCount: 0,
    trailerFound: false,
    seasonsCount: 0,
    episodesCount: 0,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`
        );
        const data = await response.json();
        const filtered = data.results?.filter((r: any) => r.media_type === 'tv' || r.media_type === 'movie').slice(0, 8) || [];
        setSuggestions(filtered);
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
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`
      );
      const data = await response.json();
      const filtered = data.results?.filter((r: any) => r.media_type === 'tv' || r.media_type === 'movie') || [];
      setSearchResults(filtered);
    } catch (error) {
      console.error("TMDB search error:", error);
      toast.error("Failed to search TMDB");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectContent = async (result: TMDBSearchResult) => {
    const mediaType = result.media_type || (result.name ? 'tv' : 'movie');
    const contentType = mediaType === 'tv' ? 'series' : 'movie';
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    
    try {
      const [detailsResponse, videosResponse] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/${endpoint}/${result.id}?api_key=${TMDB_API_KEY}&language=en-US`
        ),
        fetch(
          `https://api.themoviedb.org/3/${endpoint}/${result.id}/videos?api_key=${TMDB_API_KEY}&language=en-US`
        ),
      ]);

      const details = await detailsResponse.json();
      const videosData = await videosResponse.json();

      let trailerYoutubeId = "";
      if (videosData.results && videosData.results.length > 0) {
        const trailer =
          videosData.results.find(
            (v: any) => v.type === "Trailer" && v.site === "YouTube"
          ) || videosData.results[0];

        if (trailer && trailer.site === "YouTube") {
          trailerYoutubeId = trailer.key;
        }
      }
      
      setFormData({
        ...formData,
        title: result.name || result.title || "",
        poster_path: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : "",
        backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : "",
        description: result.overview,
        release_date: result.first_air_date || result.release_date || "",
        tmdb_id: result.id,
        content_type: contentType,
        genre: details.genres?.map((g: any) => g.name).join(", ") || "",
        vote_average: details.vote_average || null,
        popularity: details.popularity || null,
        original_language: details.original_language || "",
        tagline: details.tagline || "",
        trailer_youtube_id: formData.trailer_youtube_id || trailerYoutubeId,
      });
      
      toast.success("Content info loaded from TMDB");
      setSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to fetch TMDB details:", error);
      toast.error("Failed to load content details");
    }
  };

  const createUpcomingMutation = useMutation({
    mutationFn: async () => {
      // First create the upcoming release entry
      const { data: upcomingRelease, error: upcomingError } = await supabase
        .from("upcoming_releases")
        .insert({
          title: formData.title,
          poster_path: formData.poster_path,
          backdrop_path: formData.backdrop_path,
          description: formData.description,
          release_date: formData.release_date,
          content_type: formData.content_type,
          status: formData.status,
          is_featured: formData.is_featured,
        })
        .select()
        .single();

      if (upcomingError) throw upcomingError;

      // Create the actual content entry in content table
      const { data: content, error: contentError } = await supabase
        .from("content")
        .insert({
          title: formData.title,
          poster_path: formData.poster_path,
          backdrop_path: formData.backdrop_path,
          genre: formData.genre,
          overview: formData.description,
          release_date: formData.release_date,
          tmdb_id: formData.tmdb_id,
          content_type: formData.content_type,
        })
        .select()
        .single();

      if (contentError) throw contentError;

      // Link the upcoming release to the content
      await supabase
        .from("upcoming_releases")
        .update({ content_id: content.id })
        .eq("id", upcomingRelease.id);

      // Import additional data from TMDB if available
      if (formData.tmdb_id && content && formData.content_type === 'series') {
        let castCount = 0;
        let trailerFound = false;
        let seasonsCount = 0;
        let episodesCount = 0;

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
                  castCount++;
                }
              } catch (castError) {
                console.error('Error processing cast member:', castError);
              }
            }
          }

          // Import trailer (prefer manually entered, then TMDB)
          if (formData.trailer_youtube_id || formData.trailer_self_hosted) {
            // Use manually entered trailer
            await supabase.from('trailers').delete().eq('content_id', content.id);
            await supabase.from('trailers').insert({
              content_id: content.id,
              youtube_id: formData.trailer_youtube_id || null,
              self_hosted_url: formData.trailer_self_hosted || null,
            });
            trailerFound = true;
          } else if (videosData.results && videosData.results.length > 0) {
            // Use TMDB trailer as fallback
            const trailer = videosData.results.find((v: any) =>
              v.type === 'Trailer' && v.site === 'YouTube'
            ) || videosData.results[0];

            if (trailer && trailer.site === 'YouTube') {
              await supabase.from('trailers').delete().eq('content_id', content.id);
              await supabase.from('trailers').insert({
                content_id: content.id,
                youtube_id: trailer.key,
              });
              trailerFound = true;
            }
          }

          // Import seasons and episodes
          if (seriesData.number_of_seasons) {
            seasonsCount = seriesData.number_of_seasons;
            for (let i = 1; i <= seriesData.number_of_seasons; i++) {
              const seasonResponse = await fetch(
                `https://api.themoviedb.org/3/tv/${formData.tmdb_id}/season/${i}?api_key=${TMDB_API_KEY}`
              );
              const seasonData = await seasonResponse.json();

              if (seasonData.success !== false) {
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
                      poster_path: seasonData.poster_path
                        ? `https://image.tmdb.org/t/p/original${seasonData.poster_path}`
                        : null,
                      tmdb_id: seasonData.id,
                    })
                    .select()
                    .single();

                  seasonId = newSeason?.id;
                }

                // Import episodes
                if (seasonData.episodes && seasonId) {
                  for (const episodeData of seasonData.episodes) {
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
                        still_path: episodeData.still_path
                          ? `https://image.tmdb.org/t/p/original${episodeData.still_path}`
                          : null,
                        air_date: episodeData.air_date,
                        vote_average: episodeData.vote_average,
                        duration: episodeData.runtime,
                        tmdb_id: episodeData.id,
                      });
                      episodesCount++;
                    }
                  }
                }
              }
            }
          }

          // Update imported data state
          setImportedData({
            castCount,
            trailerFound,
            seasonsCount,
            episodesCount,
          });
        } catch (importError) {
          console.error('Error importing additional data:', importError);
          toast.warning('Content created but some data could not be imported');
        }
      } else if (formData.tmdb_id && content && formData.content_type === 'movie') {
        let castCount = 0;
        let trailerFound = false;

        // Import cast and trailer for movies
        try {
          const creditsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${formData.tmdb_id}/credits?api_key=${TMDB_API_KEY}`
          );
          const creditsData = await creditsResponse.json();

          const videosResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${formData.tmdb_id}/videos?api_key=${TMDB_API_KEY}`
          );
          const videosData = await videosResponse.json();

          // Import cast members
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
                    media_type: 'movie',
                    release_date: formData.release_date,
                    poster_path: formData.poster_path,
                  });
                  castCount++;
                }
              } catch (castError) {
                console.error('Error processing cast member:', castError);
              }
            }
          }

          // Import trailer (prefer manually entered, then TMDB)
          if (formData.trailer_youtube_id || formData.trailer_self_hosted) {
            // Use manually entered trailer
            await supabase.from('trailers').delete().eq('content_id', content.id);
            await supabase.from('trailers').insert({
              content_id: content.id,
              youtube_id: formData.trailer_youtube_id || null,
              self_hosted_url: formData.trailer_self_hosted || null,
            });
            trailerFound = true;
          } else if (videosData.results && videosData.results.length > 0) {
            // Use TMDB trailer as fallback
            const trailer = videosData.results.find((v: any) =>
              v.type === 'Trailer' && v.site === 'YouTube'
            ) || videosData.results[0];

            if (trailer && trailer.site === 'YouTube') {
              await supabase.from('trailers').delete().eq('content_id', content.id);
              await supabase.from('trailers').insert({
                content_id: content.id,
                youtube_id: trailer.key,
              });
              trailerFound = true;
            }
          }

          // Update imported data state
          setImportedData({
            castCount,
            trailerFound,
            seasonsCount: 0,
            episodesCount: 0,
          });
        } catch (importError) {
          console.error('Error importing additional data:', importError);
        }
      }

      // Send new upcoming notification
      try {
        await supabase.functions.invoke('send-release-notification', {
          body: {
            release_id: upcomingRelease.id,
            title: formData.title,
            poster_path: formData.poster_path,
            content_type: formData.content_type,
            notification_type: 'new_upcoming'
          }
        });
        console.log('Notification sent for new upcoming release');
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      return { upcomingRelease, content };
    },
    onSuccess: () => {
      toast.success("Upcoming release created with cast, trailer, and episodes!");
      queryClient.invalidateQueries({ queryKey: ["upcoming-releases"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-releases-public"] });
      navigate("/admin/upcoming");
    },
    onError: (error: Error) => {
      toast.error("Failed to create upcoming release: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Please enter a title");
      return;
    }
    if (!formData.release_date) {
      toast.error("Please select a release date");
      return;
    }
    createUpcomingMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="space-y-6" onContextMenu={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/upcoming")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Upcoming Release</h1>
            <p className="text-muted-foreground">Search TMDB and schedule a new release</p>
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
                  placeholder="Search movies or series by title..."
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
                        onClick={() => handleSelectContent(result)}
                      >
                        {result.poster_path ? (
                          <img
                            src={`${TMDB_IMAGE_BASE}${result.poster_path}`}
                            alt={result.name || result.title}
                            className="w-12 h-18 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-18 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">No Image</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.name || result.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(result.first_air_date || result.release_date) 
                              ? new Date(result.first_air_date || result.release_date || "").getFullYear() 
                              : "N/A"} • {result.media_type || (result.name ? 'Series' : 'Movie')}
                          </p>
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
                    onClick={() => handleSelectContent(result)}
                  >
                    {result.poster_path ? (
                      <img
                        src={`${TMDB_IMAGE_BASE}${result.poster_path}`}
                        alt={result.name || result.title}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <p className="text-white text-xs font-medium line-clamp-2">
                        {result.name || result.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_type">Content Type</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value: "movie" | "series" | "anime") =>
                    setFormData({ ...formData, content_type: value })
                  }
                >
                  <SelectTrigger id="content_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                    <SelectItem value="anime">Anime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date">Release Date *</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "upcoming" | "released" | "cancelled") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="trailer_youtube_id">Trailer YouTube ID</Label>
                <Input
                  id="trailer_youtube_id"
                  value={formData.trailer_youtube_id}
                  onChange={(e) => setFormData({ ...formData, trailer_youtube_id: e.target.value })}
                  placeholder="e.g., dQw4w9WgXcQ"
                />
                <p className="text-xs text-muted-foreground">
                  From YouTube URL: youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trailer_self_hosted">Trailer Self-Hosted URL</Label>
                <Input
                  id="trailer_self_hosted"
                  value={formData.trailer_self_hosted}
                  onChange={(e) => setFormData({ ...formData, trailer_self_hosted: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Direct video URL (MP4, M3U8, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Action, Drama, Comedy..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vote_average">Rating (TMDB)</Label>
                <Input
                  id="vote_average"
                  type="number"
                  step="0.1"
                  value={formData.vote_average || ""}
                  onChange={(e) => setFormData({ ...formData, vote_average: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="popularity">Popularity</Label>
                <Input
                  id="popularity"
                  type="number"
                  step="0.1"
                  value={formData.popularity || ""}
                  onChange={(e) => setFormData({ ...formData, popularity: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_language">Original Language</Label>
                <Input
                  id="original_language"
                  value={formData.original_language}
                  onChange={(e) => setFormData({ ...formData, original_language: e.target.value })}
                  placeholder="en, ko, ja..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Enter tagline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_featured: checked })
                }
              />
              <Label htmlFor="is_featured">Featured Release</Label>
            </div>

            {importedData.castCount > 0 || importedData.trailerFound || importedData.seasonsCount > 0 || importedData.episodesCount > 0 ? (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-sm">Imported TMDB Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Cast Members</p>
                      <p className="font-semibold text-lg">{importedData.castCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Trailer</p>
                      <p className="font-semibold text-lg">{importedData.trailerFound ? '✓' : '✗'}</p>
                    </div>
                    {formData.content_type === 'series' && (
                      <>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Seasons</p>
                          <p className="font-semibold text-lg">{importedData.seasonsCount}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Episodes</p>
                          <p className="font-semibold text-lg">{importedData.episodesCount}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/admin/upcoming")}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createUpcomingMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createUpcomingMutation.isPending ? "Creating..." : "Create Release"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUpcomingAdd;
