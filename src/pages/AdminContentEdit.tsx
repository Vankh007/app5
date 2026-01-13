import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Save, X, Plus, Trash2, Upload } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminContentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [editingEpisode, setEditingEpisode] = useState<any>(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("show_id", id)
        .order("season_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id && content?.content_type === "series",
  });

  const { data: episodesBySeason = {} } = useQuery({
    queryKey: ["episodes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("show_id", id)
        .order("episode_number", { ascending: true });

      if (error) throw error;

      const grouped: Record<string, any[]> = {};
      (data || []).forEach((episode) => {
        const seasonId = episode.season_id || "no-season";
        if (!grouped[seasonId]) {
          grouped[seasonId] = [];
        }
        grouped[seasonId].push(episode);
      });

      return grouped;
    },
    enabled: !!id && content?.content_type === "series",
  });

  useEffect(() => {
    if (isEditingInfo && content && !editedContent) {
      setEditedContent({
        poster_path: content.poster_path || "",
        backdrop_path: content.backdrop_path || "",
        genre: content.genre || "",
        overview: content.overview || "",
        access_type: content.access_type || "free",
        price: content.price || 0,
        currency: content.currency || "USD",
        exclude_from_plan: content.exclude_from_plan || false,
        release_date: content.release_date || "",
        tmdb_id: content.tmdb_id || null,
      });
    }
  }, [isEditingInfo, content, editedContent]);

  const updateContentMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("content")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Content updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["content", id] });
      setIsEditingInfo(false);
      setEditedContent(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to update content: " + error.message);
    },
  });

  const handleSaveContentInfo = () => {
    if (!editedContent) return;
    updateContentMutation.mutate(editedContent);
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditedContent(null);
  };

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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!content) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <p>Content not found</p>
        </div>
      </AdminLayout>
    );
  }

  const isMovie = content.content_type === "movie";
  const isSeries = content.content_type === "series";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/content")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {content.title}
              </h1>
              <p className="text-muted-foreground">
                {isMovie ? "Movie" : "Series"} Editor
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isMovie ? "Movie" : "Series"} Information</CardTitle>
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
                  onClick={handleSaveContentInfo}
                  size="sm"
                  disabled={updateContentMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateContentMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditingInfo && editedContent ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="poster_path">Poster URL</Label>
                    <Input
                      id="poster_path"
                      placeholder="https://image.tmdb.org/t/p/w500/..."
                      value={editedContent.poster_path}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, poster_path: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backdrop_path">Backdrop URL</Label>
                    <Input
                      id="backdrop_path"
                      placeholder="https://image.tmdb.org/t/p/original/..."
                      value={editedContent.backdrop_path}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, backdrop_path: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="genre">Genre</Label>
                    <Input
                      id="genre"
                      placeholder="Action, Drama, etc."
                      value={editedContent.genre}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, genre: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="release_date">Release Date</Label>
                    <Input
                      id="release_date"
                      type="date"
                      value={editedContent.release_date}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, release_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tmdb_id">TMDB ID</Label>
                    <Input
                      id="tmdb_id"
                      type="number"
                      value={editedContent.tmdb_id || ""}
                      onChange={(e) =>
                        setEditedContent({ ...editedContent, tmdb_id: parseInt(e.target.value) || null })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overview">Overview</Label>
                  <Textarea
                    id="overview"
                    placeholder="Content description..."
                    value={editedContent.overview}
                    onChange={(e) =>
                      setEditedContent({ ...editedContent, overview: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="access_type">Access Type</Label>
                    <Select
                      value={editedContent.access_type}
                      onValueChange={(value) =>
                        setEditedContent({ ...editedContent, access_type: value })
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

                  {editedContent.access_type === "purchase" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={editedContent.price}
                          onChange={(e) =>
                            setEditedContent({ ...editedContent, price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={editedContent.currency}
                          onValueChange={(value) =>
                            setEditedContent({ ...editedContent, currency: value })
                          }
                        >
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="KHR">KHR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <img
                    src={content.poster_path || "/placeholder.svg"}
                    alt={content.title}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Genre</p>
                    <p className="font-medium">{content.genre || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Release Date</p>
                    <p className="font-medium">{content.release_date || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Access Type</p>
                    <Badge>{content.access_type?.toUpperCase() || "FREE"}</Badge>
                  </div>
                  {content.access_type === "purchase" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        {content.currency} {content.price}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Overview</p>
                    <p className="text-sm">{content.overview || "No description available"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isSeries && (
          <Card>
            <CardHeader>
              <CardTitle>Seasons & Episodes</CardTitle>
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
                        <Badge variant="outline">Season {season.season_number}</Badge>
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
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminContentEdit;
