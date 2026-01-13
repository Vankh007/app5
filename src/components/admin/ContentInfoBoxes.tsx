import { useState, useEffect } from "react";
import { Calendar, Film, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ContentInfoBoxesProps {
  contentType: "movie" | "series" | "anime";
  recentEpisode?: string;
  onRecentEpisodeChange?: (value: string) => void;
  collectionId?: string | null;
  onCollectionChange?: (value: string | null) => void;
  lastContentUpdate?: Date | null;
  onLastContentUpdateChange?: (value: Date | null) => void;
}

export const ContentInfoBoxes = ({
  contentType,
  recentEpisode = "",
  onRecentEpisodeChange,
  collectionId,
  onCollectionChange,
  lastContentUpdate,
  onLastContentUpdateChange,
}: ContentInfoBoxesProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const showEpisodeBox = contentType === "series" || contentType === "anime";

  return (
    <div className="grid gap-4 md:grid-cols-3 mt-6">
      {/* Yellow Box - Episode (only for series/anime) */}
      {showEpisodeBox && (
        <div className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-500/10">
          <div className="flex items-center gap-2 mb-3">
            <Film className="h-4 w-4 text-yellow-500" />
            <Label className="text-sm font-medium text-yellow-500">
              Recent Episode
            </Label>
          </div>
          <Input
            placeholder="e.g., EP 12"
            value={recentEpisode}
            onChange={(e) => onRecentEpisodeChange?.(e.target.value)}
            className="border-yellow-500/30 focus:border-yellow-500"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Shows as ribbon on poster
          </p>
        </div>
      )}

      {/* Red Box - Collection */}
      <div className="p-4 rounded-lg border-2 border-red-500 bg-red-500/10">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-red-500" />
          <Label className="text-sm font-medium text-red-500">Collection</Label>
        </div>
        <Select
          value={collectionId || "none"}
          onValueChange={(value) =>
            onCollectionChange?.(value === "none" ? null : value)
          }
        >
          <SelectTrigger className="border-red-500/30 focus:border-red-500">
            <SelectValue placeholder="Select collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Collection</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={collection.id}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          Group content into collections
        </p>
      </div>

      {/* Green Box - Last Update Date */}
      <div className="p-4 rounded-lg border-2 border-green-500 bg-green-500/10">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-green-500" />
          <Label className="text-sm font-medium text-green-500">
            Last Update
          </Label>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal border-green-500/30 focus:border-green-500",
                !lastContentUpdate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {lastContentUpdate
                ? format(lastContentUpdate, "PPP")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={lastContentUpdate || undefined}
              onSelect={(date) => {
                onLastContentUpdateChange?.(date || null);
                setCalendarOpen(false);
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-2">
          Last content update date
        </p>
      </div>
    </div>
  );
};
