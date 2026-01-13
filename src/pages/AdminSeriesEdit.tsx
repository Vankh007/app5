import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Save, X, Upload, Star, Plus, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportEpisodeSourcesDialog } from "@/components/admin/ImportEpisodeSourcesDialog";
import { PricingPreview } from "@/components/admin/PricingPreview";
import { SeasonDialog } from "@/components/admin/SeasonDialog";
import { ContentInfoBoxes } from "@/components/admin/ContentInfoBoxes";
import { EpisodeAddDialog } from "@/components/admin/EpisodeAddDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SeriesEdit = () => {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [tmdbIdInput, setTmdbIdInput] = useState("");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedSeries, setEditedSeries] = useState<any>(null);
  const [csvImportSeasonId, setCsvImportSeasonId] = useState<string | null>(null);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [addEpisodeDialogOpen, setAddEpisodeDialogOpen] = useState(false);
  const [currentSeasonForNewEpisode, setCurrentSeasonForNewEpisode] = useState<string | null>(null);
  const [deleteSeasonId, setDeleteSeasonId] = useState<string | null>(null);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);

  const { data: series, isLoading } = useQuery({
    queryKey: ["series-by-tmdb", tmdbId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("tmdb_id", Number(tmdbId))
        .eq("content_type", "series")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tmdbId,
  });

  // Get the series ID for related queries
  const seriesId = series?.id;

  // Pre-populate TMDB ID input when series data loads
  useEffect(() => {
    if (series?.tmdb_id && !tmdbIdInput) {
      setTmdbIdInput(String(series.tmdb_id));
    }
  }, [series, tmdbIdInput]);

  // Initialize edited series when entering edit mode
  useEffect(() => {
    if (isEditingInfo && series && !editedSeries) {
      setEditedSeries({
        title: series.title || "",
        poster_path: series.poster_path || "",
        backdrop_path: series.backdrop_path || "",
        genre: series.genre || "",
        cast_members: series.cast_members || "",
        overview: series.overview || "",
        access_type: series.access_type || "free",
        price: series.price || 0,
        currency: series.currency || "USD",
        purchase_period: series.purchase_period || 1,
        max_devices: series.max_devices || 3,
        exclude_from_plan: series.exclude_from_plan || false,
        recent_episode: (series as any).recent_episode || "",
        collection_id: series.collection_id || null,
        last_content_update: (series as any).last_content_update ? new Date((series as any).last_content_update) : null,
      });
    }
  }, [isEditingInfo, series, editedSeries]);

  const { data: trailer } = useQuery({
    queryKey: ["series-trailer", seriesId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trailers")
        .select("*")
        .eq("content_id", seriesId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!seriesId,
  });

  const updateSeriesMutation = useMutation({
    mutationFn: async (updates: any) => {
      // Prepare data with proper date formatting
      const dataToSave = {
        ...updates,
        last_content_update: updates.last_content_update 
          ? updates.last_content_update.toISOString() 
          : null,
      };
      
      const { error } = await supabase
        .from("content")
        .update(dataToSave)
        .eq("id", seriesId);

      if (error) throw error;

      // Sync episodes with series settings automatically
      const episodeUpdates: any = {};
      
      if (updates.access_type && updates.access_type !== series?.access_type) {
        episodeUpdates.access_type = updates.access_type;
      }
      if (updates.price !== undefined && updates.price !== series?.price) {
        episodeUpdates.price = updates.price;
      }
      if (updates.currency && updates.currency !== series?.currency) {
        episodeUpdates.currency = updates.currency;
      }
      if (updates.purchase_period !== undefined && updates.purchase_period !== series?.purchase_period) {
        // Note: episodes don't have purchase_period, but we track it for consistency
      }

      // Only update episodes if there are changes to sync
      if (Object.keys(episodeUpdates).length > 0) {
        const { error: episodesError } = await supabase
          .from("episodes")
          .update(episodeUpdates)
          .eq("show_id", seriesId);

        if (episodesError) {
          console.error("Failed to update episodes:", episodesError);
          toast.error("Series updated but failed to sync episodes");
        }
      }

      // Handle trailer update if trailerUrl is provided
      if (trailerUrl) {
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
              content_id: seriesId,
              youtube_id: youtubeId,
              self_hosted_url: youtubeId ? null : trailerUrl,
            });
        }
      }
    },
    onSuccess: () => {
      toast.success("Series information updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["series-by-tmdb", tmdbId] });
      queryClient.invalidateQueries({ queryKey: ["series-trailer", seriesId] });
      queryClient.invalidateQueries({ queryKey: ["episodes", seriesId] });
      setIsEditingInfo(false);
      setEditedSeries(null);
      setTrailerUrl("");
    },
    onError: (error: Error) => {
      console.error("Series update error:", error);
      toast.error("Failed to update series: " + error.message);
    },
  });

  const handleSaveSeriesInfo = () => {
    if (!editedSeries) return;
    updateSeriesMutation.mutate(editedSeries);
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditedSeries(null);
    setTrailerUrl("");
  };

  // Initialize trailer URL when entering edit mode
  useEffect(() => {
    if (isEditingInfo && trailer && !trailerUrl) {
      if (trailer.youtube_id) {
        setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.youtube_id}`);
      } else if (trailer.self_hosted_url) {
        setTrailerUrl(trailer.self_hosted_url);
      }
    }
  }, [isEditingInfo, trailer, trailerUrl]);

  // Sync all episodes to series access type
  const syncAllEpisodesMutation = useMutation({
    mutationFn: async () => {
      if (!series) return;

      const { error } = await supabase
        .from("episodes")
        .update({
          access_type: series.access_type || "free",
          price: series.price || 0,
          currency: series.currency || "USD",
        })
        .eq("show_id", seriesId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All episodes synced to series settings!");
      queryClient.invalidateQueries({ queryKey: ["episodes", seriesId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync episodes: " + error.message);
    },
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons", seriesId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("show_id", seriesId)
        .order("season_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!seriesId,
  });

  const { data: episodesBySeason = {} } = useQuery({
    queryKey: ["episodes", seriesId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("show_id", seriesId)
        .order("episode_number", { ascending: true });

      if (error) throw error;

      // Group episodes by season_id
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((episode) => {
        const seasonId = episode.season_id || 'no-season';
        if (!grouped[seasonId]) {
          grouped[seasonId] = [];
        }
        grouped[seasonId].push(episode);
      });

      return grouped;
    },
    enabled: !!seriesId,
  });

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seasonId)) {
        newSet.delete(seasonId);
      } else {
        newSet.add(seasonId);
      }
      return newSet;
    });
  };

  const deleteSeasonMutation = useMutation({
    mutationFn: async (seasonId: string) => {
      // First delete all episodes in this season
      const { error: episodesError } = await supabase
        .from("episodes")
        .delete()
        .eq("season_id", seasonId);

      if (episodesError) throw episodesError;

      // Then delete the season
      const { error: seasonError } = await supabase
        .from("seasons")
        .delete()
        .eq("id", seasonId);

      if (seasonError) throw seasonError;
    },
    onSuccess: () => {
      toast.success("Season deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["seasons", seriesId] });
      queryClient.invalidateQueries({ queryKey: ["episodes", seriesId] });
      setDeleteSeasonId(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to delete season: " + error.message);
    },
  });

  const deleteEpisodeMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      // First delete all video sources for this episode
      const { error: sourcesError } = await supabase
        .from("video_sources")
        .delete()
        .eq("episode_id", episodeId);

      if (sourcesError) throw sourcesError;

      // Then delete the episode
      const { error: episodeError } = await supabase
        .from("episodes")
        .delete()
        .eq("id", episodeId);

      if (episodeError) throw episodeError;
    },
    onSuccess: () => {
      toast.success("Episode deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["episodes", seriesId] });
      setDeleteEpisodeId(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to delete episode: " + error.message);
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/series")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isLoading ? "Loading..." : (series?.title || "Series Not Found")}
            </h1>
            <p className="text-muted-foreground">Manage seasons and episodes</p>
          </div>
        </div>

        {!isLoading && !series && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">
                Series with TMDB ID "{tmdbId}" was not found in the database.
              </p>
              <p className="text-muted-foreground mt-2">
                Please import it first using the bulk import feature.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/admin/series")}
              >
                Back to Series
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && series && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Series Information</CardTitle>
              {!isEditingInfo ? (
                <Button onClick={() => setIsEditingInfo(true)} variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Info
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveSeriesInfo} 
                    size="sm"
                    disabled={updateSeriesMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateSeriesMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingInfo && editedSeries ? (
                // Edit Mode
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Series title"
                      value={editedSeries.title}
                      onChange={(e) =>
                        setEditedSeries({ ...editedSeries, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="poster_path">Poster URL</Label>
                      <Input
                        id="poster_path"
                        placeholder="https://image.tmdb.org/t/p/w500/..."
                        value={editedSeries.poster_path}
                        onChange={(e) =>
                          setEditedSeries({ ...editedSeries, poster_path: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backdrop_path">Backdrop URL</Label>
                      <Input
                        id="backdrop_path"
                        placeholder="https://image.tmdb.org/t/p/original/..."
                        value={editedSeries.backdrop_path}
                        onChange={(e) =>
                          setEditedSeries({ ...editedSeries, backdrop_path: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="genre">Genre</Label>
                      <Input
                        id="genre"
                        placeholder="Action, Drama, etc."
                        value={editedSeries.genre}
                        onChange={(e) =>
                          setEditedSeries({ ...editedSeries, genre: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cast_members">Cast Members</Label>
                      <Textarea
                        id="cast_members"
                        placeholder="Cast member names, comma separated"
                        value={editedSeries.cast_members || ''}
                        onChange={(e) =>
                          setEditedSeries({ ...editedSeries, cast_members: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access_type">Access Type</Label>
                    <Select
                      value={editedSeries.access_type}
                      onValueChange={(value) =>
                        setEditedSeries({ ...editedSeries, access_type: value })
                      }
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

                  <div className="space-y-2">
                    <Label htmlFor="overview">Overview</Label>
                    <Textarea
                      id="overview"
                      placeholder="Series description..."
                      value={editedSeries.overview}
                      onChange={(e) =>
                        setEditedSeries({ ...editedSeries, overview: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  {editedSeries.access_type === "purchase" && (
                    <div className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label htmlFor="price">Rent Price</Label>
                        <Input
                          id="price"
                          type="number"
                          value={editedSeries.price}
                          onChange={(e) =>
                            setEditedSeries({ ...editedSeries, price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={editedSeries.currency}
                          onChange={(e) =>
                            setEditedSeries({ ...editedSeries, currency: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="purchase_period">Rental Period (Days)</Label>
                        <Input
                          id="purchase_period"
                          type="number"
                          value={editedSeries.purchase_period}
                          onChange={(e) =>
                            setEditedSeries({ ...editedSeries, purchase_period: parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_devices">Max Devices</Label>
                        <Input
                          id="max_devices"
                          type="number"
                          value={editedSeries.max_devices}
                          onChange={(e) =>
                            setEditedSeries({ ...editedSeries, max_devices: parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-4">
                        <Label htmlFor="exclude_from_plan">Exclude from plan</Label>
                        <Select
                          value={editedSeries.exclude_from_plan ? "yes" : "no"}
                          onValueChange={(value) =>
                            setEditedSeries({ ...editedSeries, exclude_from_plan: value === "yes" })
                          }
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

                  {/* Trailer URL Field */}
                  <div className="space-y-2">
                    <Label htmlFor="trailer_url">Trailer URL</Label>
                    <Input
                      id="trailer_url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={trailerUrl}
                      onChange={(e) => setTrailerUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a YouTube URL or self-hosted video URL
                    </p>
                  </div>

                  {/* Content Info Boxes */}
                  <ContentInfoBoxes
                    contentType="series"
                    recentEpisode={editedSeries?.recent_episode || ""}
                    onRecentEpisodeChange={(value) => setEditedSeries({ ...editedSeries, recent_episode: value })}
                    collectionId={editedSeries?.collection_id}
                    onCollectionChange={(value) => setEditedSeries({ ...editedSeries, collection_id: value })}
                    lastContentUpdate={editedSeries?.last_content_update}
                    onLastContentUpdateChange={(value) => setEditedSeries({ ...editedSeries, last_content_update: value })}
                  />

                  {/* Pricing Preview */}
                  {isEditingInfo && editedSeries && (
                    <PricingPreview 
                      accessType={editedSeries.access_type || 'free'}
                      price={editedSeries.price || 0}
                      currency={editedSeries.currency || 'USD'}
                      rentalPeriod={editedSeries.purchase_period || 7}
                      excludeFromPlan={editedSeries.exclude_from_plan || false}
                      backdropUrl={editedSeries.backdrop_path}
                    />
                  )}
                </div>
              ) : (
                // View Mode - New Layout
                <div className="space-y-6">
                  <div className="grid gap-8 md:grid-cols-3">
                    {/* Poster Column */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Poster</p>
                      <div className="rounded-lg overflow-hidden border bg-muted aspect-[2/3] max-w-[200px]">
                        <img
                          src={series.poster_path || "/placeholder.svg"}
                          alt={series.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Middle Column */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Genre</p>
                        <p className="font-medium">{series.genre || "N/A"}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-lg">
                            {series.popularity ? series.popularity.toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Version</p>
                        <Badge className="bg-cyan-500 hover:bg-cyan-600">
                          {series.access_type?.toUpperCase() || "FREE"}
                        </Badge>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Release Year</p>
                        <p className="font-medium">
                          {series.release_year || series.release_date?.split("-")[0] || "N/A"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Seasons</p>
                        <p className="font-medium">{series.seasons || seasons.length}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                        <p className="font-medium">{series.status || "published"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Options - if access_type is purchase */}
                  {series.access_type === "purchase" && (
                    <div className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Rent Price</p>
                        <p className="font-medium">{series.price || 0} {series.currency || "USD"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Rental Period</p>
                        <p className="font-medium">{series.purchase_period || 1} days</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Max Devices</p>
                        <p className="font-medium">{series.max_devices || 3}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Exclude from plan</p>
                        <Badge variant={series.exclude_from_plan ? "destructive" : "secondary"}>
                          {series.exclude_from_plan ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Trailer */}
                  {trailer && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Trailer URL</p>
                      <div className="p-3 border rounded-lg bg-muted/50">
                        <p className="text-sm break-all">
                          {trailer.youtube_id 
                            ? `https://www.youtube.com/watch?v=${trailer.youtube_id}`
                            : trailer.self_hosted_url || "N/A"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Banner */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Banner</p>
                    <div className="rounded-lg overflow-hidden border bg-muted aspect-[21/9] max-h-[300px]">
                      <img
                        src={series.backdrop_path || "/placeholder.svg"}
                        alt={`${series.title} banner`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Seasons & Episodes</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSeason(null);
                  setSeasonDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Season
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncAllEpisodesMutation.mutate()}
                disabled={syncAllEpisodesMutation.isPending}
              >
                {syncAllEpisodesMutation.isPending ? "Syncing..." : "Sync All Episodes to Series"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {seasons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No seasons found for this series
              </p>
            ) : (
              seasons.map((season) => (
                <Collapsible
                  key={season.id}
                  open={expandedSeasons.has(season.id)}
                  onOpenChange={() => toggleSeason(season.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer">
                      <div className="flex items-center gap-4">
                        {expandedSeasons.has(season.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <h3 className="font-semibold">{season.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {episodesBySeason[season.id]?.length || 0} episodes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {episodesBySeason[season.id]?.length || 0} episodes
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSeasonForNewEpisode(season.id);
                            setAddEpisodeDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Episode
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCsvImportSeasonId(season.id);
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import CSV
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSeasonId(season.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Badge variant="outline">Season {season.season_number}</Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Episode</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {episodesBySeason[season.id]?.map((episode) => (
                            <TableRow key={episode.id}>
                              <TableCell>{episode.episode_number}</TableCell>
                              <TableCell className="font-medium">{episode.title}</TableCell>
                              <TableCell>{episode.duration || "N/A"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {episode.access_type?.toUpperCase() || "FREE"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Find the season number for this episode
                                      const episodeSeason = seasons.find(s => s.id === episode.season_id);
                                      const seasonNum = episodeSeason?.season_number || 1;
                                      navigate(`/admin/series/${tmdbId}/${seasonNum}/${episode.episode_number}/edit`);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteEpisodeId(episode.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {csvImportSeasonId && (
        <ImportEpisodeSourcesDialog
          seasonId={csvImportSeasonId}
          isOpen={!!csvImportSeasonId}
          onOpenChange={(open) => {
            if (!open) setCsvImportSeasonId(null);
          }}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["episodes", seriesId] });
            toast.success("Episode sources imported successfully!");
          }}
        />
      )}

      {seasonDialogOpen && (
        <SeasonDialog
          season={editingSeason}
          open={seasonDialogOpen}
          onOpenChange={(open) => {
            setSeasonDialogOpen(open);
            if (!open) setEditingSeason(null);
          }}
          seriesId={seriesId || ""}
        />
      )}

      {addEpisodeDialogOpen && currentSeasonForNewEpisode && (
        <EpisodeAddDialog
          open={addEpisodeDialogOpen}
          onOpenChange={setAddEpisodeDialogOpen}
          seasonId={currentSeasonForNewEpisode}
          seriesId={seriesId || ""}
          nextEpisodeNumber={
            (episodesBySeason[currentSeasonForNewEpisode]?.length || 0) + 1
          }
        />
      )}

      <AlertDialog open={!!deleteSeasonId} onOpenChange={(open) => !open && setDeleteSeasonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this season? This will also delete all episodes in this season. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSeasonId && deleteSeasonMutation.mutate(deleteSeasonId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteEpisodeId} onOpenChange={(open) => !open && setDeleteEpisodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this episode? This will also delete all video sources for this episode. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEpisodeId && deleteEpisodeMutation.mutate(deleteEpisodeId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default SeriesEdit;
