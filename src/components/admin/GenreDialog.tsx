import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface GenreFormData {
  name: string;
  tmdb_id: number | null;
}

interface Genre {
  id: string;
  name: string;
  tmdb_id: number | null;
}

interface GenreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genre: Genre | null;
}

export function GenreDialog({ open, onOpenChange, genre }: GenreDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GenreFormData>();

  useEffect(() => {
    if (genre) {
      reset({
        name: genre.name,
        tmdb_id: genre.tmdb_id,
      });
    } else {
      reset({
        name: "",
        tmdb_id: null,
      });
    }
  }, [genre, reset]);

  const mutation = useMutation({
    mutationFn: async (data: GenreFormData) => {
      if (genre) {
        const { error } = await supabase
          .from("genres")
          .update(data)
          .eq("id", genre.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("genres").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["genres"] });
      toast.success(genre ? "Genre updated successfully" : "Genre created successfully");
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error("Failed to save genre: " + error.message);
    },
  });

  const onSubmit = (data: GenreFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{genre ? "Edit Genre" : "Add Genre"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="Action, Drama, Comedy..."
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tmdb_id">TMDB ID</Label>
            <Input
              id="tmdb_id"
              type="number"
              {...register("tmdb_id", { valueAsNumber: true })}
              placeholder="28, 18, 35..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
