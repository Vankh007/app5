import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface VideoSource {
  server: string;
  version: "free" | "membership" | "purchase";
  permission: "web_and_mobile" | "web_only" | "mobile_only";
  type: "iframe" | "mp4" | "hls";
  url: string;
  quality?: string;
  mp4Urls?: {
    "480p"?: string;
    "720p"?: string;
    "1080p"?: string;
  };
  defaultQuality?: "480p" | "720p" | "1080p";
  isDefault: boolean;
}

const AdminEpisodeEdit = () => {
  const { tmdbId, season, episode: episodeNum } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [access, setAccess] = useState("free");
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Fetch series by TMDB ID
  const { data: series } = useQuery({
    queryKey: ["series-by-tmdb", tmdbId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("tmdb_id", Number(tmdbId))
        .eq("content_type", "series")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tmdbId,
  });

  // Fetch season
  const { data: seasonData } = useQuery({
    queryKey: ["season-by-number", series?.id, season],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("show_id", series!.id)
        .eq("season_number", Number(season))
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!series?.id && !!season,
  });

  // Fetch episode
  const { data: episodeData, isLoading: episodeLoading } = useQuery({
    queryKey: ["episode-by-number", seasonData?.id, episodeNum],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("season_id", seasonData!.id)
        .eq("episode_number", Number(episodeNum))
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!seasonData?.id && !!episodeNum,
  });

  // Fetch video sources when episode loads
  useEffect(() => {
    if (episodeData) {
      setAccess(episodeData.access_type || "free");
      setLoadingSources(true);
      
      supabase
        .from("video_sources")
        .select("*")
        .eq("episode_id", episodeData.id)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching video sources:", error);
            setVideoSources([]);
          } else {
            const mapped = (data || []).map((source) => ({
              server: source.server_name || "Server 1",
              version: (source.version || "free") as "free" | "membership" | "purchase",
              permission: (source.permission || "web_and_mobile") as "web_and_mobile" | "web_only" | "mobile_only",
              type: source.source_type as "iframe" | "mp4" | "hls",
              url: source.url || "",
              quality: source.quality || undefined,
              mp4Urls: (source.quality_urls || {}) as any,
              defaultQuality: source.quality as "480p" | "720p" | "1080p" | undefined,
              isDefault: source.is_default || false,
            }));
            setVideoSources(mapped);
          }
          setLoadingSources(false);
        });
    }
  }, [episodeData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!episodeData) return;

      // Update episode access
      const { error: episodeError } = await supabase
        .from("episodes")
        .update({
          access_type: access as "free" | "membership" | "purchase",
        })
        .eq("id", episodeData.id);

      if (episodeError) throw episodeError;

      // Delete existing video sources
      const { error: deleteError } = await supabase
        .from("video_sources")
        .delete()
        .eq("episode_id", episodeData.id);

      if (deleteError) throw deleteError;

      // Insert new video sources
      if (videoSources.length > 0) {
        const sourcesToInsert = videoSources.map((source) => {
          // For MP4 sources with quality_urls, use the first available quality URL as main URL if url is empty
          let mainUrl = source.url;
          if (!mainUrl && source.type === "mp4" && source.mp4Urls) {
            const qualityUrls = source.mp4Urls as Record<string, string>;
            const firstQualityUrl = Object.values(qualityUrls).find(url => url && url.trim() !== '');
            mainUrl = firstQualityUrl || '';
          }
          
          return {
            episode_id: episodeData.id,
            server_name: source.server,
            version: source.version,
            permission: source.permission,
            source_type: source.type,
            url: mainUrl || '',
            quality: source.type === "mp4" ? source.defaultQuality : source.quality,
            quality_urls: source.type === "mp4" ? source.mp4Urls : {},
            is_default: source.isDefault,
          };
        });

        const { error: insertError } = await supabase
          .from("video_sources")
          .insert(sourcesToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success("Episode updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["episodes"] });
      queryClient.invalidateQueries({ queryKey: ["video-sources"] });
      navigate(`/admin/series/${tmdbId}/edit`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update episode: " + error.message);
    },
  });

  const handleAddVideoSource = () => {
    setVideoSources([
      ...videoSources,
      {
        server: `Server ${videoSources.length + 1}`,
        version: "free",
        permission: "web_and_mobile",
        type: "iframe",
        url: "",
        isDefault: videoSources.length === 0,
      },
    ]);
  };

  const handleRemoveVideoSource = (index: number) => {
    setVideoSources(videoSources.filter((_, i) => i !== index));
  };

  const handleVideoSourceChange = (index: number, field: keyof VideoSource, value: any) => {
    const updated = [...videoSources];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "type" && value === "mp4" && !updated[index].mp4Urls) {
      updated[index].mp4Urls = { "480p": "", "720p": "", "1080p": "" };
      updated[index].defaultQuality = "720p";
    }
    
    setVideoSources(updated);
  };

  const handleMp4QualityChange = (index: number, quality: "480p" | "720p" | "1080p", url: string) => {
    const updated = [...videoSources];
    if (!updated[index].mp4Urls) {
      updated[index].mp4Urls = {};
    }
    updated[index].mp4Urls![quality] = url;
    setVideoSources(updated);
  };

  const handleDefaultChange = (index: number) => {
    const updated = videoSources.map((source, i) => ({
      ...source,
      isDefault: i === index,
    }));
    setVideoSources(updated);
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  if (episodeLoading || !episodeData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading episode...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/series/${tmdbId}/edit`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Edit Episode {episodeNum}: {episodeData.title}
              </h1>
              <p className="text-muted-foreground">
                {series?.title} - Season {season}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Episode Access Type */}
        <Card>
          <CardHeader>
            <CardTitle>Episode Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="access">Version (Access Type)</Label>
              <Select value={access} onValueChange={setAccess}>
                <SelectTrigger id="access">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Video Sources */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Video Sources</CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={handleAddVideoSource}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-[1.2fr,1fr,1.2fr,1fr,2fr,1fr,0.8fr,0.5fr] gap-2 p-3 bg-[hsl(142,76%,36%)] text-white rounded-lg font-medium text-sm">
                <div>Server Name</div>
                <div>Version</div>
                <div>Permission</div>
                <div>URL Type</div>
                <div>URL</div>
                <div>Quality</div>
                <div>Default</div>
                <div>Action</div>
              </div>

              {/* Table Rows or Empty State */}
              {loadingSources ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  Loading video sources...
                </div>
              ) : videoSources.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                  No video sources added yet. Click "Add Source" to add one.
                </div>
              ) : (
                videoSources.map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="grid grid-cols-[1.2fr,1fr,1.2fr,1fr,2fr,1fr,0.8fr,0.5fr] gap-2 p-3 border rounded-lg items-center">
                      {/* Server Name */}
                      <Input
                        value={source.server}
                        onChange={(e) => handleVideoSourceChange(index, "server", e.target.value)}
                        placeholder="Server 1"
                        className="h-9"
                      />

                      {/* Version */}
                      <Select
                        value={source.version}
                        onValueChange={(value) => handleVideoSourceChange(index, "version", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="membership">Membership</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Permission */}
                      <Select
                        value={source.permission}
                        onValueChange={(value) => handleVideoSourceChange(index, "permission", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="web_and_mobile">Web & Mobile</SelectItem>
                          <SelectItem value="web_only">Web only</SelectItem>
                          <SelectItem value="mobile_only">Mobile only</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* URL Type */}
                      <Select
                        value={source.type}
                        onValueChange={(value) => handleVideoSourceChange(index, "type", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iframe">Embed</SelectItem>
                          <SelectItem value="mp4">MP4</SelectItem>
                          <SelectItem value="hls">HLS</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Main URL */}
                      {source.type !== "mp4" ? (
                        <Input
                          value={source.url}
                          onChange={(e) => handleVideoSourceChange(index, "url", e.target.value)}
                          placeholder="https://player.example.com"
                          className="h-9"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">See below</div>
                      )}

                      {/* Quality Selector */}
                      <Select
                        value={source.type === "mp4" ? (source.defaultQuality || "720p") : (source.quality || "auto")}
                        onValueChange={(value) => {
                          if (source.type === "mp4") {
                            handleVideoSourceChange(index, "defaultQuality", value);
                          } else {
                            handleVideoSourceChange(index, "quality", value);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="480p">480p</SelectItem>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="4k">4K</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Default Checkbox */}
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={source.isDefault}
                          onChange={() => handleDefaultChange(index)}
                          className="w-5 h-5 accent-blue-500 cursor-pointer"
                        />
                      </div>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVideoSource(index)}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Additional Quality URLs for MP4 */}
                    {source.type === "mp4" && (
                      <div className="ml-4 p-4 border-l-4 border-blue-200 bg-muted/30 rounded space-y-3">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Additional Quality URLs:
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Label className="w-16 text-sm">480p:</Label>
                            <Input
                              value={source.mp4Urls?.["480p"] || ""}
                              onChange={(e) => handleMp4QualityChange(index, "480p", e.target.value)}
                              placeholder="https://1a-1791.com/video/480p.mp4"
                              className="flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="w-16 text-sm">720p:</Label>
                            <Input
                              value={source.mp4Urls?.["720p"] || ""}
                              onChange={(e) => handleMp4QualityChange(index, "720p", e.target.value)}
                              placeholder="https://1a-1791.com/video/720p.mp4"
                              className="flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="w-16 text-sm">1080p:</Label>
                            <Input
                              value={source.mp4Urls?.["1080p"] || ""}
                              onChange={(e) => handleMp4QualityChange(index, "1080p", e.target.value)}
                              placeholder="https://1a-1791.com/video/1080p.mp4"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/admin/series/${tmdbId}/edit`)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEpisodeEdit;
