import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TMDB_API_KEY = "5cfa727c2f549c594772a50e10e3f272";

const AdminUpcomingEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    poster_path: "",
    backdrop_path: "",
    description: "",
    release_date: "",
    content_type: "series" as "movie" | "series" | "anime",
    status: "upcoming" as "upcoming" | "released" | "cancelled",
    is_featured: false,
    tmdb_id: null as number | null,
    content_id: null as string | null,
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

  const { data: upcomingItem, isLoading } = useQuery({
    queryKey: ['upcoming-release', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upcoming_releases')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (upcomingItem) {
      setFormData({
        title: upcomingItem.title || "",
        poster_path: upcomingItem.poster_path || "",
        backdrop_path: upcomingItem.backdrop_path || "",
        description: upcomingItem.description || "",
        release_date: upcomingItem.release_date || "",
        content_type: (upcomingItem.content_type as "movie" | "series" | "anime") || "series",
        status: (upcomingItem.status as "upcoming" | "released" | "cancelled") || "upcoming",
        is_featured: upcomingItem.is_featured || false,
        tmdb_id: upcomingItem.tmdb_id || null,
        content_id: upcomingItem.content_id || null,
        genre: "",
        vote_average: null,
        popularity: null,
        original_language: "",
        tagline: "",
        trailer_youtube_id: "",
        trailer_self_hosted: "",
      });

      // Fetch imported data counts and trailer if content_id exists
      if (upcomingItem.content_id) {
        fetchImportedDataCounts(upcomingItem.content_id);
        fetchExistingTrailer(upcomingItem.content_id);
      }
    }
  }, [upcomingItem]);

  const fetchExistingTrailer = async (contentId: string) => {
    try {
      const { data: trailer } = await supabase
        .from('trailers')
        .select('*')
        .eq('content_id', contentId)
        .maybeSingle();
      
      if (trailer) {
        setFormData(prev => ({
          ...prev,
          trailer_youtube_id: trailer.youtube_id || "",
          trailer_self_hosted: trailer.self_hosted_url || "",
        }));
      }
    } catch (error) {
      console.error('Error fetching trailer:', error);
    }
  };

  const fetchImportedDataCounts = async (contentId: string) => {
    try {
      const [castRes, trailerRes, seasonsRes, episodesRes] = await Promise.all([
        supabase.from('cast_credits').select('id', { count: 'exact', head: true }).eq('tmdb_content_id', formData.tmdb_id || 0),
        supabase.from('trailers').select('id').eq('content_id', contentId).maybeSingle(),
        supabase.from('seasons').select('id', { count: 'exact', head: true }).eq('show_id', contentId),
        supabase.from('episodes').select('id', { count: 'exact', head: true }).eq('show_id', contentId),
      ]);

      setImportedData({
        castCount: castRes.count || 0,
        trailerFound: !!trailerRes.data,
        seasonsCount: seasonsRes.count || 0,
        episodesCount: episodesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching imported data counts:', error);
    }
  };

  const handleImportFromTMDB = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      const result = data.results?.find((r: any) => r.media_type === 'movie' || r.media_type === 'tv');

      if (!result) {
        toast.error("No results found");
        return;
      }

      const mediaType = result.media_type || (result.name ? 'tv' : 'movie');
      const contentType = mediaType === 'tv' ? 'series' : 'movie';
      const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
      
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/${endpoint}/${result.id}?api_key=${TMDB_API_KEY}`
      );
      const details = await detailsResponse.json();

      setFormData({
        ...formData,
        title: result.name || result.title || "",
        poster_path: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
        backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : "",
        description: result.overview,
        release_date: result.first_air_date || result.release_date || "",
        content_type: contentType,
        tmdb_id: result.id,
        genre: details.genres?.map((g: any) => g.name).join(", ") || "",
        vote_average: details.vote_average || null,
        popularity: details.popularity || null,
        original_language: details.original_language || "",
        tagline: details.tagline || "",
      });

      toast.success("Content info loaded from TMDB");
      setSearchQuery("");
    } catch (error) {
      toast.error("Failed to fetch from TMDB");
    } finally {
      setIsSearching(false);
    }
  };

  const importAdditionalData = async (contentId: string, tmdbId: number, contentType: "movie" | "series" | "anime") => {
    let castCount = 0;
    let trailerFound = false;
    let seasonsCount = 0;
    let episodesCount = 0;

    try {
      if (contentType === 'series' || contentType === 'anime') {
        // Fetch cast, trailer, and seasons for series
        const [creditsRes, videosRes, seriesRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/videos?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`)
        ]);

        const [creditsData, videosData, seriesData] = await Promise.all([
          creditsRes.json(),
          videosRes.json(),
          seriesRes.json()
        ]);

        // Import cast
        if (creditsData.cast?.length > 0) {
          const castToImport = creditsData.cast.slice(0, 15);
          for (const castMember of castToImport) {
            const { data: existing } = await supabase
              .from('cast_members')
              .select('id')
              .eq('tmdb_id', castMember.id)
              .maybeSingle();

            let castId = existing?.id;
            if (!existing) {
              const { data: newCast } = await supabase.from('cast_members').insert({
                tmdb_id: castMember.id,
                name: castMember.name,
                profile_path: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : null,
                known_for_department: castMember.known_for_department,
                popularity: castMember.popularity,
                gender: castMember.gender,
              }).select().single();
              castId = newCast?.id;
            }

            if (castId) {
              await supabase.from('cast_credits').insert({
                cast_member_id: castId,
                tmdb_content_id: tmdbId,
                title: formData.title,
                character_name: castMember.character,
                media_type: 'tv',
                release_date: formData.release_date,
                poster_path: formData.poster_path,
              });
              castCount++;
            }
          }
        }

        // Import trailer
        if (videosData.results?.length > 0) {
          const trailer = videosData.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videosData.results[0];
          if (trailer?.site === 'YouTube') {
            await supabase.from('trailers').delete().eq('content_id', contentId);
            await supabase.from('trailers').insert({
              content_id: contentId,
              youtube_id: trailer.key,
            });
            trailerFound = true;
          }
        }

        // Import seasons and episodes
        if (seriesData.number_of_seasons) {
          seasonsCount = seriesData.number_of_seasons;
          for (let i = 1; i <= seriesData.number_of_seasons; i++) {
            const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${i}?api_key=${TMDB_API_KEY}`);
            const seasonData = await seasonRes.json();

            if (seasonData.success !== false) {
              const { data: existingSeason } = await supabase
                .from('seasons')
                .select('id')
                .eq('show_id', contentId)
                .eq('season_number', seasonData.season_number)
                .maybeSingle();

              let seasonId = existingSeason?.id;
              if (!existingSeason) {
                const { data: newSeason } = await supabase.from('seasons').insert({
                  show_id: contentId,
                  season_number: seasonData.season_number,
                  title: seasonData.name,
                  overview: seasonData.overview,
                  poster_path: seasonData.poster_path ? `https://image.tmdb.org/t/p/original${seasonData.poster_path}` : null,
                  tmdb_id: seasonData.id,
                }).select().single();
                seasonId = newSeason?.id;
              }

              // Import episodes
              if (seasonData.episodes && seasonId) {
                for (const ep of seasonData.episodes) {
                  const { data: existingEp } = await supabase
                    .from('episodes')
                    .select('id')
                    .eq('show_id', contentId)
                    .eq('season_id', seasonId)
                    .eq('episode_number', ep.episode_number)
                    .maybeSingle();

                  if (!existingEp) {
                    await supabase.from('episodes').insert({
                      show_id: contentId,
                      season_id: seasonId,
                      episode_number: ep.episode_number,
                      title: ep.name,
                      overview: ep.overview,
                      still_path: ep.still_path ? `https://image.tmdb.org/t/p/original${ep.still_path}` : null,
                      air_date: ep.air_date,
                      vote_average: ep.vote_average,
                      duration: ep.runtime,
                      tmdb_id: ep.id,
                    });
                    episodesCount++;
                  }
                }
              }
            }
          }
        }
      } else {
        // Import cast and trailer for movies
        const [creditsRes, videosRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`)
        ]);

        const [creditsData, videosData] = await Promise.all([
          creditsRes.json(),
          videosRes.json()
        ]);

        // Import cast
        if (creditsData.cast?.length > 0) {
          const castToImport = creditsData.cast.slice(0, 15);
          for (const castMember of castToImport) {
            const { data: existing } = await supabase
              .from('cast_members')
              .select('id')
              .eq('tmdb_id', castMember.id)
              .maybeSingle();

            let castId = existing?.id;
            if (!existing) {
              const { data: newCast } = await supabase.from('cast_members').insert({
                tmdb_id: castMember.id,
                name: castMember.name,
                profile_path: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : null,
                known_for_department: castMember.known_for_department,
                popularity: castMember.popularity,
                gender: castMember.gender,
              }).select().single();
              castId = newCast?.id;
            }

            if (castId) {
              await supabase.from('cast_credits').insert({
                cast_member_id: castId,
                tmdb_content_id: tmdbId,
                title: formData.title,
                character_name: castMember.character,
                media_type: 'movie',
                release_date: formData.release_date,
                poster_path: formData.poster_path,
              });
              castCount++;
            }
          }
        }

        // Import trailer
        if (videosData.results?.length > 0) {
          const trailer = videosData.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videosData.results[0];
          if (trailer?.site === 'YouTube') {
            await supabase.from('trailers').delete().eq('content_id', contentId);
            await supabase.from('trailers').insert({
              content_id: contentId,
              youtube_id: trailer.key,
            });
            trailerFound = true;
          }
        }
      }

      // Update imported data counts
      setImportedData({
        castCount,
        trailerFound,
        seasonsCount,
        episodesCount,
      });
    } catch (error) {
      console.error('Error importing additional data:', error);
      throw error;
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      let contentId = formData.content_id;

      // If status is "released", create content entry if it doesn't exist
      if (formData.status === 'released' && !contentId) {
        const { data: newContent, error: contentError } = await supabase
          .from('content')
          .insert({
            title: formData.title,
            poster_path: formData.poster_path,
            backdrop_path: formData.backdrop_path,
            overview: formData.description,
            release_date: formData.release_date,
            content_type: formData.content_type,
            tmdb_id: formData.tmdb_id,
            genre: formData.genre,
            popularity: formData.popularity,
            tagline: formData.tagline,
            release_year: formData.release_date ? new Date(formData.release_date).getFullYear().toString() : null,
          })
          .select()
          .single();

        if (contentError) throw contentError;
        contentId = newContent.id;
      }

      const { error } = await supabase
        .from("upcoming_releases")
        .update({
          title: formData.title,
          poster_path: formData.poster_path,
          backdrop_path: formData.backdrop_path,
          description: formData.description,
          release_date: formData.release_date,
          content_type: formData.content_type,
          status: formData.status,
          is_featured: formData.is_featured,
          tmdb_id: formData.tmdb_id,
          content_id: contentId,
        })
        .eq("id", id);

      if (error) throw error;

      // Save trailer data if content_id exists
      if (contentId && (formData.trailer_youtube_id || formData.trailer_self_hosted)) {
        // Delete existing trailer first
        await supabase.from('trailers').delete().eq('content_id', contentId);
        
        // Insert new trailer
        await supabase.from('trailers').insert({
          content_id: contentId,
          youtube_id: formData.trailer_youtube_id || null,
          self_hosted_url: formData.trailer_self_hosted || null,
        });
      }

      // Import additional data if TMDB ID and content ID are available
      if (formData.tmdb_id && contentId) {
        try {
          await importAdditionalData(contentId, formData.tmdb_id, formData.content_type);
          toast.success("Additional data imported from TMDB");
        } catch (importError) {
          console.error('Import error:', importError);
          toast.warning("Updated but some data could not be imported");
        }
      }
    },
    onSuccess: () => {
      toast.success("Upcoming release updated successfully");
      queryClient.invalidateQueries({ queryKey: ["upcoming-releases"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-release", id] });
      navigate("/admin/upcoming");
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
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
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">Edit Upcoming Release</h1>
            <p className="text-muted-foreground">Update release details</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Release Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Import from TMDB (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search TMDB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImportFromTMDB()}
                />
                <Button
                  variant="outline"
                  onClick={handleImportFromTMDB}
                  disabled={isSearching}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
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

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trailer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trailer_youtube_id">YouTube Video ID</Label>
                    <Input
                      id="trailer_youtube_id"
                      value={formData.trailer_youtube_id}
                      onChange={(e) => setFormData({ ...formData, trailer_youtube_id: e.target.value })}
                      placeholder="e.g., dQw4w9WgXcQ"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the YouTube video ID (the part after v= in the URL)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trailer_self_hosted">Self-hosted URL</Label>
                    <Input
                      id="trailer_self_hosted"
                      value={formData.trailer_self_hosted}
                      onChange={(e) => setFormData({ ...formData, trailer_self_hosted: e.target.value })}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Or provide a direct video URL (MP4, HLS, etc.)
                    </p>
                  </div>
                </div>
                {formData.trailer_youtube_id && (
                  <div className="aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                    <iframe
                      src={`https://www.youtube.com/embed/${formData.trailer_youtube_id}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </CardContent>
            </Card>

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

            {formData.content_id && formData.tmdb_id && (
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
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/admin/upcoming")}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Updating..." : "Update Release"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUpcomingEdit;
