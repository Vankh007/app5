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

interface LanguageFormData {
  name: string;
  english_name: string | null;
  iso_639_1: string | null;
}

interface Language {
  id: string;
  name: string;
  english_name: string | null;
  iso_639_1: string | null;
}

interface LanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language | null;
}

export function LanguageDialog({ open, onOpenChange, language }: LanguageDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LanguageFormData>();

  useEffect(() => {
    if (language) {
      reset({
        name: language.name,
        english_name: language.english_name,
        iso_639_1: language.iso_639_1,
      });
    } else {
      reset({
        name: "",
        english_name: null,
        iso_639_1: null,
      });
    }
  }, [language, reset]);

  const mutation = useMutation({
    mutationFn: async (data: LanguageFormData) => {
      if (language) {
        const { error } = await supabase
          .from("languages")
          .update(data)
          .eq("id", language.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("languages").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languages"] });
      toast.success(language ? "Language updated successfully" : "Language created successfully");
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error("Failed to save language: " + error.message);
    },
  });

  const onSubmit = (data: LanguageFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{language ? "Edit Language" : "Add Language"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="ខ្មែរ, English, Español..."
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="english_name">English Name</Label>
            <Input
              id="english_name"
              {...register("english_name")}
              placeholder="Khmer, English, Spanish..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iso_639_1">ISO 639-1 Code</Label>
            <Input
              id="iso_639_1"
              {...register("iso_639_1")}
              placeholder="km, en, es..."
              maxLength={2}
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
