import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, X, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentInfoBoxes } from "@/components/admin/ContentInfoBoxes";

interface VideoSource {
  id?: string;
  media_id?: string;
  source_type: 'mp4' | 'hls' | 'iframe';
  url: string;
  quality?: string | null;
  language?: string | null;
  version?: string | null;
  quality_urls?: any;
  is_default?: boolean | null;
  server_name?: string | null;
}

const AdminMoviesEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewMovie = id === 'new';
  
  const [editedMovie, setEditedMovie] = useState<any>({
    title: '',
    overview: '',
    poster_path: '',
    backdrop_path: '',
    genre: '',
    cast_members: '',
    release_year: '',
    access_type: 'free',
    price: 0,
    currency: 'USD',
    purchase_period: 1,
    max_devices: 3,
    exclude_from_plan: false,
    collection_id: null,
    last_content_update: null,
  });
  
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [trailerUrl, setTrailerUrl] = useState("");

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: async () => {
      if (isNewMovie) return null;
      
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("id", id)
        .eq('content_type', 'movie')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !isNewMovie,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["movie-sources", id],
    queryFn: async () => {
      if (isNewMovie) return [];
      
      const { data, error } = await supabase
        .from("video_sources")
        .select("*")
        .eq("media_id", id);

      if (error) throw error;
      return data || [];
    },
    enabled: !isNewMovie,
  });

  const { data: trailer } = useQuery({
    queryKey: ["movie-trailer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trailers")
        .select("*")
        .eq("content_id", id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !isNewMovie,
  });

  useEffect(() => {
    if (movie) {
      setEditedMovie({
        title: movie.title || '',
        overview: movie.overview || '',
        poster_path: movie.poster_path || '',
        backdrop_path: movie.backdrop_path || '',
        genre: movie.genre || '',
        cast_members: movie.cast_members || '',
        release_year: movie.release_year || '',
        access_type: movie.access_type || 'free',
        price: movie.price || 0,
        currency: movie.currency || 'USD',
        purchase_period: movie.purchase_period || 1,
        max_devices: movie.max_devices || 3,
        exclude_from_plan: movie.exclude_from_plan || false,
        collection_id: movie.collection_id || null,
        last_content_update: (movie as any).last_content_update ? new Date((movie as any).last_content_update) : null,
      });
    }
  }, [movie]);

  useEffect(() => {
    if (sources.length > 0) {
      setVideoSources(sources);
    }
  }, [sources]);

  useEffect(() => {
    if (trailer) {
      if (trailer.youtube_id) {
        setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.youtube_id}`);
      } else if (trailer.self_hosted_url) {
        setTrailerUrl(trailer.self_hosted_url);
      }
    }
  }, [trailer]);

  const saveMovieMutation = useMutation({
    mutationFn: async () => {
      let movieId = id;
      let movieData;
      
      // Prepare data with proper date formatting
      const dataToSave = {
        ...editedMovie,
        last_content_update: editedMovie.last_content_update 
          ? editedMovie.last_content_update.toISOString() 
          : null,
      };
      
      if (isNewMovie) {
        const { data, error } = await supabase
          .from("content")
          .insert({
            ...dataToSave,
            content_type: 'movie',
          })
          .select()
          .single();

        if (error) throw error;
        movieId = data.id;
        movieData = data;
      } else {
        const { error } = await supabase
          .from("content")
          .update(dataToSave)
          .eq("id", id);

        if (error) throw error;
        movieData = movie;
      }

      // Handle trailer update if trailerUrl is provided
      if (trailerUrl && movieId) {
        const youtubeMatch = trailerUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        const youtubeId = youtubeMatch ? youtubeMatch[1] : null;

        if (trailer) {
          // Update existing trailer
          await supabase
            .from("trailers")
            .update({
              youtube_id: youtubeId,
              self_hosted_url: youtubeId ? null : trailerUrl,
            })
            .eq("id", trailer.id);
        } else {
          // Create new trailer
          await supabase
            .from("trailers")
            .insert({
              content_id: movieId,
              youtube_id: youtubeId,
              self_hosted_url: youtubeId ? null : trailerUrl,
            });
        }
      }

      return movieData;
    },
    onSuccess: (data) => {
      toast.success(isNewMovie ? "Movie created successfully!" : "Movie updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["movie", id] });
      queryClient.invalidateQueries({ queryKey: ["movie-trailer", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      setTrailerUrl("");
      if (isNewMovie && data) {
        navigate(`/admin/movies/${data.id}/edit`);
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to save movie: " + error.message);
    },
  });

  const saveVideoSourcesMutation = useMutation({
    mutationFn: async (sources: VideoSource[]) => {
      const movieId = isNewMovie ? null : id;
      if (!movieId) {
        throw new Error("Please save the movie first before adding video sources");
      }

      // Delete existing sources
      await supabase.from("video_sources").delete().eq("media_id", movieId);

      // Insert new sources
      if (sources.length > 0) {
        const { error } = await supabase
          .from("video_sources")
          .insert(sources.map(s => {
            // For MP4 sources with quality_urls, use the first available quality URL as main URL if url is empty
            let mainUrl = s.url;
            if (!mainUrl && s.source_type === "mp4" && s.quality_urls) {
              const qualityUrls = s.quality_urls as Record<string, string>;
              const firstQualityUrl = Object.values(qualityUrls).find(url => url && url.trim() !== '');
              mainUrl = firstQualityUrl || '';
            }
            
            return {
              media_id: movieId,
              source_type: s.source_type,
              url: mainUrl || '',
              quality: s.quality,
              language: s.language,
              version: s.version,
              quality_urls: s.quality_urls,
              is_default: s.is_default,
              server_name: s.server_name,
            };
          }));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Video sources saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["movie-sources", id] });
    },
    onError: (error: Error) => {
      toast.error("Failed to save video sources: " + error.message);
    },
  });

  const handleAddVideoSource = () => {
    setVideoSources([
      ...videoSources,
      {
        server_name: `Server ${videoSources.length + 1}`,
        version: "free",
        source_type: "iframe",
        url: "",
        is_default: videoSources.length === 0,
      },
    ]);
  };

  const handleRemoveVideoSource = (index: number) => {
    setVideoSources(videoSources.filter((_, i) => i !== index));
  };

  const handleVideoSourceChange = (index: number, field: keyof VideoSource, value: any) => {
    const updated = [...videoSources];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "source_type" && value === "mp4" && !updated[index].quality_urls) {
      updated[index].quality_urls = { "480p": "", "720p": "", "1080p": "" };
    }
    
    setVideoSources(updated);
  };

  const handleDefaultChange = (index: number) => {
    const updated = videoSources.map((source, i) => ({
      ...source,
      is_default: i === index,
    }));
    setVideoSources(updated);
  };

  const handleSave = () => {
    saveMovieMutation.mutate();
  };

  const handleSaveVideoSources = () => {
    if (isNewMovie) {
      toast.error("Please save the movie first before adding video sources");
      return;
    }
    saveVideoSourcesMutation.mutate(videoSources);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/movies")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isNewMovie ? 'Add New Movie' : editedMovie.title || 'Edit Movie'}
              </h1>
              <p className="text-muted-foreground">
                {isNewMovie ? 'Create a new movie' : 'Edit movie information'}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saveMovieMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMovieMutation.isPending ? "Saving..." : "Save Movie"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Movie Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editedMovie.title}
                  onChange={(e) => setEditedMovie({ ...editedMovie, title: e.target.value })}
                  placeholder="Movie title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_year">Release Year</Label>
                <Input
                  id="release_year"
                  value={editedMovie.release_year}
                  onChange={(e) => setEditedMovie({ ...editedMovie, release_year: e.target.value })}
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overview">Overview</Label>
              <Textarea
                id="overview"
                value={editedMovie.overview}
                onChange={(e) => setEditedMovie({ ...editedMovie, overview: e.target.value })}
                placeholder="Movie description..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poster_path">Poster URL</Label>
                <Input
                  id="poster_path"
                  value={editedMovie.poster_path}
                  onChange={(e) => setEditedMovie({ ...editedMovie, poster_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backdrop_path">Backdrop URL</Label>
                <Input
                  id="backdrop_path"
                  value={editedMovie.backdrop_path}
                  onChange={(e) => setEditedMovie({ ...editedMovie, backdrop_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  value={editedMovie.genre}
                  onChange={(e) => setEditedMovie({ ...editedMovie, genre: e.target.value })}
                  placeholder="Action, Drama, Comedy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cast_members">Cast Members</Label>
                <Textarea
                  id="cast_members"
                  value={editedMovie.cast_members || ''}
                  onChange={(e) => setEditedMovie({ ...editedMovie, cast_members: e.target.value })}
                  placeholder="Cast member names, comma separated"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_type">Access Type</Label>
              <Select
                value={editedMovie.access_type}
                onValueChange={(value) => setEditedMovie({ ...editedMovie, access_type: value })}
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

            {editedMovie.access_type === "purchase" && (
              <div className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editedMovie.price}
                    onChange={(e) => setEditedMovie({ ...editedMovie, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={editedMovie.currency}
                    onChange={(e) => setEditedMovie({ ...editedMovie, currency: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_period">Period (days)</Label>
                  <Input
                    id="purchase_period"
                    type="number"
                    value={editedMovie.purchase_period}
                    onChange={(e) => setEditedMovie({ ...editedMovie, purchase_period: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_devices">Max Devices</Label>
                  <Input
                    id="max_devices"
                    type="number"
                    value={editedMovie.max_devices}
                    onChange={(e) => setEditedMovie({ ...editedMovie, max_devices: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="trailer_url">Trailer URL</Label>
              <Input
                id="trailer_url"
                placeholder="https://www.youtube.com/watch?v=... or self-hosted URL"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a YouTube URL or self-hosted video URL
              </p>
            </div>

            {/* Content Info Boxes */}
            <ContentInfoBoxes
              contentType="movie"
              collectionId={editedMovie.collection_id}
              onCollectionChange={(value) => setEditedMovie({ ...editedMovie, collection_id: value })}
              lastContentUpdate={editedMovie.last_content_update}
              onLastContentUpdateChange={(value) => setEditedMovie({ ...editedMovie, last_content_update: value })}
            />
          </CardContent>
        </Card>

        {!isNewMovie && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Video Sources</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleAddVideoSource} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
                <Button 
                  onClick={handleSaveVideoSources}
                  size="sm"
                  disabled={saveVideoSourcesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveVideoSourcesMutation.isPending ? "Saving..." : "Save Sources"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videoSources.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    No video sources added yet. Click "Add Source" to add one.
                  </div>
                ) : (
                  videoSources.map((source, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="grid gap-4 md:grid-cols-5">
                        <div className="space-y-2">
                          <Label>Server Name</Label>
                          <Input
                            value={source.server_name || ''}
                            onChange={(e) => handleVideoSourceChange(index, "server_name", e.target.value)}
                            placeholder="Server 1"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={source.source_type}
                            onValueChange={(value) => handleVideoSourceChange(index, "source_type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="iframe">Iframe</SelectItem>
                              <SelectItem value="mp4">MP4</SelectItem>
                              <SelectItem value="hls">HLS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Version</Label>
                          <Select
                            value={source.version || 'free'}
                            onValueChange={(value) => handleVideoSourceChange(index, "version", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Language</Label>
                          <Input
                            value={source.language || ''}
                            onChange={(e) => handleVideoSourceChange(index, "language", e.target.value)}
                            placeholder="English"
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-2">
                            <Label>Default</Label>
                            <div className="flex items-center h-10">
                              <input
                                type="checkbox"
                                checked={source.is_default || false}
                                onChange={() => handleDefaultChange(index)}
                                className="w-5 h-5"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVideoSource(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          value={source.url}
                          onChange={(e) => handleVideoSourceChange(index, "url", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMoviesEdit;
