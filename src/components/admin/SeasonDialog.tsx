import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Season {
  id?: string;
  title: string;
  season_number: number;
  overview?: string;
  poster_path?: string;
}

interface SeasonDialogProps {
  season?: Season | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
}

export function SeasonDialog({ season, open, onOpenChange, seriesId }: SeasonDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Season>({
    title: "",
    season_number: 1,
    overview: "",
    poster_path: "",
  });

  useEffect(() => {
    if (season) {
      setFormData({
        title: season.title || "",
        season_number: season.season_number || 1,
        overview: season.overview || "",
        poster_path: season.poster_path || "",
      });
    } else {
      setFormData({
        title: "",
        season_number: 1,
        overview: "",
        poster_path: "",
      });
    }
  }, [season, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (season?.id) {
        // Update existing season
        const { error } = await supabase
          .from("seasons")
          .update({
            title: formData.title,
            season_number: formData.season_number,
            overview: formData.overview || null,
            poster_path: formData.poster_path || null,
          })
          .eq("id", season.id);
        
        if (error) throw error;
      } else {
        // Create new season
        const { error } = await supabase
          .from("seasons")
          .insert({
            show_id: seriesId,
            title: formData.title,
            season_number: formData.season_number,
            overview: formData.overview || null,
            poster_path: formData.poster_path || null,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(season?.id ? "Season updated successfully!" : "Season created successfully!");
      queryClient.invalidateQueries({ queryKey: ["seasons", seriesId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to save season: " + error.message);
    },
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error("Season title is required");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{season?.id ? "Edit Season" : "Add New Season"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="season_title">Season Title *</Label>
              <Input
                id="season_title"
                placeholder="Season 1"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="season_number">Season Number *</Label>
              <Input
                id="season_number"
                type="number"
                min="1"
                value={formData.season_number}
                onChange={(e) => setFormData({ ...formData, season_number: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poster_path">Poster URL</Label>
            <Input
              id="poster_path"
              placeholder="https://image.tmdb.org/t/p/w500/..."
              value={formData.poster_path}
              onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overview">Overview</Label>
            <Textarea
              id="overview"
              placeholder="Season description..."
              value={formData.overview}
              onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : season?.id ? "Update Season" : "Create Season"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
