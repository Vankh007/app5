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
import { ContentInfoBoxes } from "@/components/admin/ContentInfoBoxes";
import { PricingPreview } from "@/components/admin/PricingPreview";
import { SeasonDialog } from "@/components/admin/SeasonDialog";
import { EpisodeAddDialog } from "@/components/admin/EpisodeAddDialog";
import { ImportEpisodeSourcesDialog } from "@/components/admin/ImportEpisodeSourcesDialog";
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

const AdminAnimeEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedAnime, setEditedAnime] = useState<any>(null);
  const [trailerUrl, setTrailerUrl] = useState("");
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [addEpisodeDialogOpen, setAddEpisodeDialogOpen] = useState(false);
  const [currentSeasonForNewEpisode, setCurrentSeasonForNewEpisode] = useState<string | null>(null);
  const [deleteSeasonId, setDeleteSeasonId] = useState<string | null>(null);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [csvImportSeasonId, setCsvImportSeasonId] = useState<string | null>(null);

  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("id", id)
        .eq("content_type", "anime")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const animeId = anime?.id;

  useEffect(() => {
    if (isEditingInfo && anime && !editedAnime) {
      setEditedAnime({
        title: anime.title || "",
        poster_path: anime.poster_path || "",
        backdrop_path: anime.backdrop_path || "",
        genre: anime.genre || "",
        cast_members: anime.cast_members || "",
        overview: anime.overview || "",
        access_type: anime.access_type || "free",
        price: anime.price || 0,
        currency: anime.currency || "USD",
        purchase_period: anime.purchase_period || 1,
        max_devices: anime.max_devices || 3,
        exclude_from_plan: anime.exclude_from_plan || false,
        recent_episode: (anime as any).recent_episode || "",
        collection_id: anime.collection_id || null,
        last_content_update: (anime as any).last_content_update ? new Date((anime as any).last_content_update) : null,
      });
    }
  }, [isEditingInfo, anime, editedAnime]);

  const { data: trailer } = useQuery({
    queryKey: ["anime-trailer", animeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trailers")
        .select("*")
        .eq("content_id", animeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!animeId,
  });

  useEffect(() => {
    if (isEditingInfo && trailer && !trailerUrl) {
      if (trailer.youtube_id) {
        setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.youtube_id}`);
      } else if (trailer.self_hosted_url) {
        setTrailerUrl(trailer.self_hosted_url);
      }
    }
  }, [isEditingInfo, trailer, trailerUrl]);

  const updateAnimeMutation = useMutation({
    mutationFn: async (updates: any) => {
      const dataToSave = {
        ...updates,
        last_content_update: updates.last_content_update 
          ? updates.last_content_update.toISOString() 
          : null,
      };
      
      const { error } = await supabase
        .from("content")
        .update(dataToSave)
        .eq("id", animeId);

      if (error) throw error;

      if (trailerUrl) {
        const youtubeMatch = trailerUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        const youtubeId = youtubeMatch ? youtubeMatch[1] : null;

        if (trailer) {
          await supabase
            .from("trailers")
            .update({
              youtube_id: youtubeId,
              self_hosted_url: youtubeId ? null : trailerUrl,
            })
            .eq("id", trailer.id);
        } else {
          await supabase
            .from("trailers")
            .insert({
              content_id: animeId,
              youtube_id: youtubeId,
              self_hosted_url: youtubeId ? null : trailerUrl,
            });
        }
      }
    },
    onSuccess: () => {
      toast.success("Anime information updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["anime", id] });
      queryClient.invalidateQueries({ queryKey: ["anime-trailer", animeId] });
      setIsEditingInfo(false);
      setEditedAnime(null);
      setTrailerUrl("");
    },
    onError: (error: Error) => {
      toast.error("Failed to update anime: " + error.message);
    },
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ["anime-seasons", animeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("show_id", animeId)
        .order("season_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!animeId,
  });

  const { data: episodesBySeason = {} } = useQuery({
    queryKey: ["anime-episodes", animeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("show_id", animeId)
        .order("episode_number", { ascending: true });

      if (error) throw error;

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
    enabled: !!animeId,
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

  const handleSaveAnimeInfo = () => {
    if (!editedAnime) return;
    updateAnimeMutation.mutate(editedAnime);
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditedAnime(null);
    setTrailerUrl("");
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
            <h1 className="text-3xl font-bold tracking-tight">
              {isLoading ? "Loading..." : anime?.title}
            </h1>
            <p className="text-muted-foreground">Manage anime seasons and episodes</p>
          </div>
        </div>

        {!isLoading && anime && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Anime Information</CardTitle>
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
                    onClick={handleSaveAnimeInfo} 
                    size="sm"
                    disabled={updateAnimeMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateAnimeMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingInfo && editedAnime ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Anime title"
                      value={editedAnime.title}
                      onChange={(e) =>
                        setEditedAnime({ ...editedAnime, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="poster_path">Poster URL</Label>
                      <Input
                        id="poster_path"
                        value={editedAnime.poster_path}
                        onChange={(e) =>
                          setEditedAnime({ ...editedAnime, poster_path: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backdrop_path">Backdrop URL</Label>
                      <Input
                        id="backdrop_path"
                        value={editedAnime.backdrop_path}
                        onChange={(e) =>
                          setEditedAnime({ ...editedAnime, backdrop_path: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="genre">Genre</Label>
                      <Input
                        id="genre"
                        value={editedAnime.genre}
                        onChange={(e) =>
                          setEditedAnime({ ...editedAnime, genre: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cast_members">Cast Members</Label>
                      <Textarea
                        id="cast_members"
                        value={editedAnime.cast_members || ''}
                        onChange={(e) =>
                          setEditedAnime({ ...editedAnime, cast_members: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access_type">Access Type</Label>
                    <Select
                      value={editedAnime.access_type}
                      onValueChange={(value) =>
                        setEditedAnime({ ...editedAnime, access_type: value })
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
                      value={editedAnime.overview}
                      onChange={(e) =>
                        setEditedAnime({ ...editedAnime, overview: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trailer_url">Trailer URL</Label>
                    <Input
                      id="trailer_url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={trailerUrl}
                      onChange={(e) => setTrailerUrl(e.target.value)}
                    />
                  </div>

                  {/* Content Info Boxes */}
                  <ContentInfoBoxes
                    contentType="anime"
                    recentEpisode={editedAnime?.recent_episode || ""}
                    onRecentEpisodeChange={(value) => setEditedAnime({ ...editedAnime, recent_episode: value })}
                    collectionId={editedAnime?.collection_id}
                    onCollectionChange={(value) => setEditedAnime({ ...editedAnime, collection_id: value })}
                    lastContentUpdate={editedAnime?.last_content_update}
                    onLastContentUpdateChange={(value) => setEditedAnime({ ...editedAnime, last_content_update: value })}
                  />

                  {editedAnime.access_type === "purchase" && (
                    <PricingPreview 
                      accessType={editedAnime.access_type || 'free'}
                      price={editedAnime.price || 0}
                      currency={editedAnime.currency || 'USD'}
                      rentalPeriod={editedAnime.purchase_period || 7}
                      excludeFromPlan={editedAnime.exclude_from_plan || false}
                      backdropUrl={editedAnime.backdrop_path}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-8 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Poster</p>
                      <div className="rounded-lg overflow-hidden border bg-muted aspect-[2/3] max-w-[200px]">
                        <img
                          src={anime.poster_path || "/placeholder.svg"}
                          alt={anime.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Genre</p>
                        <p className="font-medium">{anime.genre || "N/A"}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-lg">
                            {anime.popularity ? anime.popularity.toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Version</p>
                        <Badge className="bg-cyan-500 hover:bg-cyan-600">
                          {anime.access_type?.toUpperCase() || "FREE"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Release Year</p>
                        <p className="font-medium">
                          {anime.release_year || anime.release_date?.split("-")[0] || "N/A"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Seasons</p>
                        <p className="font-medium">{anime.seasons || seasons.length}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                        <p className="font-medium">{anime.status || "published"}</p>
                      </div>
                    </div>
                  </div>

                  {anime.backdrop_path && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Banner</p>
                      <div className="rounded-lg overflow-hidden border bg-muted aspect-video max-w-2xl">
                        <img
                          src={anime.backdrop_path}
                          alt={`${anime.title} banner`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seasons Section */}
        {animeId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Seasons & Episodes</CardTitle>
              <Button 
                onClick={() => {
                  setEditingSeason(null);
                  setSeasonDialogOpen(true);
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Season
              </Button>
            </CardHeader>
            <CardContent>
              {seasons.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  No seasons added yet. Click "Add Season" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {seasons.map((season) => (
                    <Collapsible
                      key={season.id}
                      open={expandedSeasons.has(season.id)}
                      onOpenChange={() => toggleSeason(season.id)}
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="flex-1 justify-start gap-2">
                            {expandedSeasons.has(season.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{season.title}</span>
                            <Badge variant="secondary" className="ml-2">
                              {episodesBySeason[season.id]?.length || 0} episodes
                            </Badge>
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentSeasonForNewEpisode(season.id);
                              setAddEpisodeDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
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
                            size="sm"
                            onClick={() => {
                              setEditingSeason(season);
                              setSeasonDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteSeasonId(season.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="mt-2 ml-6">
                          {episodesBySeason[season.id]?.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>EP</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Air Date</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {episodesBySeason[season.id]?.map((episode) => (
                                  <TableRow key={episode.id}>
                                    <TableCell>{episode.episode_number}</TableCell>
                                    <TableCell>{episode.title}</TableCell>
                                    <TableCell>{episode.air_date || "N/A"}</TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => 
                                          navigate(`/admin/animes/${id}/${season.season_number}/${episode.episode_number}/edit`)
                                        }
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteEpisodeId(episode.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground border rounded-lg">
                              No episodes in this season yet.
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <SeasonDialog
        open={seasonDialogOpen}
        onOpenChange={setSeasonDialogOpen}
        seriesId={animeId || ""}
        season={editingSeason}
      />

      <EpisodeAddDialog
        open={addEpisodeDialogOpen}
        onOpenChange={setAddEpisodeDialogOpen}
        seriesId={animeId || ""}
        seasonId={currentSeasonForNewEpisode || ""}
        nextEpisodeNumber={(episodesBySeason[currentSeasonForNewEpisode || ""]?.length || 0) + 1}
      />

      <AlertDialog open={!!deleteSeasonId} onOpenChange={() => setDeleteSeasonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this season and all its episodes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteSeasonId) return;
                await supabase.from("episodes").delete().eq("season_id", deleteSeasonId);
                await supabase.from("seasons").delete().eq("id", deleteSeasonId);
                queryClient.invalidateQueries({ queryKey: ["anime-seasons", animeId] });
                queryClient.invalidateQueries({ queryKey: ["anime-episodes", animeId] });
                setDeleteSeasonId(null);
                toast.success("Season deleted successfully!");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteEpisodeId} onOpenChange={() => setDeleteEpisodeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this episode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteEpisodeId) return;
                await supabase.from("video_sources").delete().eq("episode_id", deleteEpisodeId);
                await supabase.from("episodes").delete().eq("id", deleteEpisodeId);
                queryClient.invalidateQueries({ queryKey: ["anime-episodes", animeId] });
                setDeleteEpisodeId(null);
                toast.success("Episode deleted successfully!");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {csvImportSeasonId && (
        <ImportEpisodeSourcesDialog
          seasonId={csvImportSeasonId}
          isOpen={!!csvImportSeasonId}
          onOpenChange={(open) => {
            if (!open) setCsvImportSeasonId(null);
          }}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["anime-episodes", animeId] });
            setCsvImportSeasonId(null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminAnimeEdit;
