import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface ImportEpisodeSourcesDialogProps {
  seasonId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface CSVRow {
  episode: string;
  server_name: string;
  version: string;
  permission: string;
  url_iframe?: string;
  url_mp4_480p?: string;
  url_mp4_720p?: string;
  url_mp4_1080p?: string;
  Url_hls?: string;
  is_default?: string;
}

export function ImportEpisodeSourcesDialog({
  seasonId,
  isOpen,
  onOpenChange,
  onImportComplete,
}: ImportEpisodeSourcesDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = `episode,server_name,version,permission,url_iframe,url_mp4_480p,url_mp4_720p,url_mp4_1080p,Url_hls,is_default
1,Server 1,free,Web and Mobile,https://example.com/iframe,https://example.com/480p.mp4,https://example.com/720p.mp4,https://example.com/1080p.mp4,https://example.com/playlist.m3u8,TRUE
2,Server 1,free,Web and Mobile,,https://example.com/480p.mp4,https://example.com/720p.mp4,,,FALSE`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "episode_sources_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully.",
    });
  };

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      rows.push(row as CSVRow);
    }

    return rows;
  };

  const fetchEpisodeThumbnails = async (episodes: any[]) => {
    // Get series info to get TMDB ID
    const { data: series } = await supabase
      .from("content")
      .select("tmdb_id")
      .eq("id", episodes[0]?.show_id)
      .single();

    if (!series?.tmdb_id) return;

    // Get season info
    const { data: season } = await supabase
      .from("seasons")
      .select("season_number")
      .eq("id", seasonId)
      .single();

    if (!season) return;

    const TMDB_API_KEY = "f6afad0bfe788d445e5642d2bc3f9eca";
    const TMDB_BASE_URL = "https://api.themoviedb.org/3";

    for (const episode of episodes) {
      try {
        const response = await fetch(
          `${TMDB_BASE_URL}/tv/${series.tmdb_id}/season/${season.season_number}/episode/${episode.episode_number}?api_key=${TMDB_API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.still_path) {
            await supabase
              .from("episodes")
              .update({ still_path: `https://image.tmdb.org/t/p/w500${data.still_path}` })
              .eq("id", episode.id);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch thumbnail for episode ${episode.episode_number}:`, error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: "Error",
          description: "CSV file is empty or invalid.",
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      // Get all episodes for this season
      const { data: episodes, error: episodesError } = await supabase
        .from("episodes")
        .select("id, episode_number")
        .eq("season_id", seasonId);

      if (episodesError) throw episodesError;

      let successCount = 0;
      let errorCount = 0;

      // Group rows by episode number
      const episodeGroups = new Map<number, CSVRow[]>();
      for (const row of rows) {
        const episodeNumber = parseInt(row.episode);
        if (!episodeGroups.has(episodeNumber)) {
          episodeGroups.set(episodeNumber, []);
        }
        episodeGroups.get(episodeNumber)!.push(row);
      }

      const totalEpisodes = episodeGroups.size;
      let processedEpisodes = 0;

      // Process each episode
      for (const [episodeNumber, episodeRows] of episodeGroups.entries()) {
        setCurrentEpisode(episodeNumber);
        setImportProgress(Math.round((processedEpisodes / totalEpisodes) * 100));
        try {
          const episode = episodes?.find((e) => e.episode_number === episodeNumber);

          if (!episode) {
            console.warn(`Episode ${episodeNumber} not found`);
            errorCount += episodeRows.length;
            continue;
          }

          // Note: We no longer delete existing sources - just add new ones to support multiple servers

          // Create new video sources
          for (const row of episodeRows) {
            try {
              // Build quality URLs object
              const qualityUrls: any = {};
              if (row.url_mp4_480p) qualityUrls["480p"] = row.url_mp4_480p;
              if (row.url_mp4_720p) qualityUrls["720p"] = row.url_mp4_720p;
              if (row.url_mp4_1080p) qualityUrls["1080p"] = row.url_mp4_1080p;

              // Determine source type and main URL
              let sourceType = "mp4";
              let mainUrl = "";
              
              if (row.Url_hls) {
                sourceType = "hls";
                mainUrl = row.Url_hls;
              } else if (row.url_iframe) {
                sourceType = "iframe";
                mainUrl = row.url_iframe;
              } else if (row.url_mp4_1080p) {
                mainUrl = row.url_mp4_1080p;
              } else if (row.url_mp4_720p) {
                mainUrl = row.url_mp4_720p;
              } else if (row.url_mp4_480p) {
                mainUrl = row.url_mp4_480p;
              }

              // Map permission text to match database format (snake_case)
              let permission = "web_and_mobile";
              if (row.permission) {
                const permLower = row.permission.toLowerCase();
                if (permLower.includes("web") && permLower.includes("mobile")) {
                  permission = "web_and_mobile";
                } else if (permLower.includes("web")) {
                  permission = "web_only";
                } else if (permLower.includes("mobile")) {
                  permission = "mobile_only";
                }
              }

              // Map version to match database format
              const version = row.version?.toLowerCase() || "free";

              // Create video source entry
              const { error: insertError } = await supabase
                .from("video_sources")
                .insert({
                  episode_id: episode.id,
                  server_name: row.server_name || "Server 1",
                  version: version,
                  permission: permission,
                  source_type: sourceType as "iframe" | "mp4" | "hls",
                  url: mainUrl,
                  quality_urls: qualityUrls,
                  is_default: row.is_default?.toUpperCase() === "TRUE",
                });

              if (insertError) {
                console.error("Error inserting video source:", insertError);
                errorCount++;
              } else {
                successCount++;
              }
            } catch (error) {
              console.error("Error processing row:", error);
              errorCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing episode ${episodeNumber}:`, error);
          errorCount += episodeRows.length;
        }
        
        processedEpisodes++;
        setImportProgress(Math.round((processedEpisodes / totalEpisodes) * 100));
      }

      // Auto-fetch thumbnails for episodes
      await fetchEpisodeThumbnails(episodes);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} video sources. ${errorCount} failed.`,
      });

      if (successCount > 0) {
        onImportComplete();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast({
        title: "Import Failed",
        description: "Failed to import CSV file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setCurrentEpisode(null);
      // Reset file input
      event.target.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Episode Sources from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import video sources for episodes in this season.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">CSV Format Requirements:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  <strong>episode</strong>: Episode number (required)
                </li>
                <li>
                  <strong>server_name</strong>: Server display name (required)
                </li>
                <li>
                  <strong>version</strong>: free, premium, or purchase (required)
                </li>
                <li>
                  <strong>permission</strong>: Web and Mobile, Web only, or Mobile only (informational)
                </li>
                <li>
                  <strong>url_iframe</strong>: iFrame embed URL (optional)
                </li>
                <li>
                  <strong>url_mp4_480p</strong>: MP4 480p quality URL (optional)
                </li>
                <li>
                  <strong>url_mp4_720p</strong>: MP4 720p quality URL (optional)
                </li>
                <li>
                  <strong>url_mp4_1080p</strong>: MP4 1080p quality URL (optional)
                </li>
                <li>
                  <strong>Url_hls</strong>: HLS playlist URL (optional)
                </li>
                <li>
                  <strong>is_default</strong>: TRUE or FALSE (optional)
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          {isImporting && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Processing Episode {currentEpisode}...
                </span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="csv-upload"
            />
            <Button
              variant="default"
              disabled={isImporting}
              className="w-full"
              asChild
            >
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Upload CSV File"}
              </label>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
