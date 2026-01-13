import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EpisodeAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId: string;
  seriesId: string;
  nextEpisodeNumber: number;
}

export function EpisodeAddDialog({ open, onOpenChange, seasonId, seriesId, nextEpisodeNumber }: EpisodeAddDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    episode_number: nextEpisodeNumber,
    overview: "",
    duration: "",
    still_path: "",
    access_type: "free",
    price: 0,
    currency: "USD",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("episodes")
        .insert({
          show_id: seriesId,
          season_id: seasonId,
          title: formData.title,
          episode_number: formData.episode_number,
          overview: formData.overview || null,
          duration: formData.duration ? parseInt(formData.duration) : null,
          still_path: formData.still_path || null,
          access_type: formData.access_type as "free" | "membership" | "purchase",
          price: formData.access_type === "purchase" ? formData.price : 0,
          currency: formData.currency,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Episode created successfully!");
      queryClient.invalidateQueries({ queryKey: ["episodes", seriesId] });
      onOpenChange(false);
      // Reset form
      setFormData({
        title: "",
        episode_number: nextEpisodeNumber + 1,
        overview: "",
        duration: "",
        still_path: "",
        access_type: "free",
        price: 0,
        currency: "USD",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to create episode: " + error.message);
    },
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error("Episode title is required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Episode</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="episode_title">Episode Title *</Label>
              <Input
                id="episode_title"
                placeholder="Episode 1"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="episode_number">Episode Number *</Label>
              <Input
                id="episode_number"
                type="number"
                min="1"
                value={formData.episode_number}
                onChange={(e) => setFormData({ ...formData, episode_number: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="45"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_type">Access Type</Label>
              <Select
                value={formData.access_type}
                onValueChange={(value) => setFormData({ ...formData, access_type: value })}
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
          </div>

          {formData.access_type === "purchase" && (
            <div className="grid gap-4 md:grid-cols-2 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="still_path">Still/Thumbnail URL</Label>
            <Input
              id="still_path"
              placeholder="https://image.tmdb.org/t/p/w500/..."
              value={formData.still_path}
              onChange={(e) => setFormData({ ...formData, still_path: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overview">Overview</Label>
            <Textarea
              id="overview"
              placeholder="Episode description..."
              value={formData.overview}
              onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Episode"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
