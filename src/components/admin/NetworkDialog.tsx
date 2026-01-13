import { useEffect, useState } from "react";
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
import { Upload, X } from "lucide-react";

interface NetworkFormData {
  name: string;
  logo_url: string;
}

interface Network {
  id: string;
  name: string;
  logo_url?: string;
}

interface NetworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: Network | null;
}

export function NetworkDialog({ open, onOpenChange, network }: NetworkDialogProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<NetworkFormData>();

  const logoUrl = watch("logo_url");

  useEffect(() => {
    if (network) {
      reset({
        name: network.name,
        logo_url: network.logo_url || "",
      });
      setPreviewUrl(network.logo_url || "");
    } else {
      reset({
        name: "",
        logo_url: "",
      });
      setPreviewUrl("");
    }
  }, [network, reset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `network-${Date.now()}.${fileExt}`;
      const filePath = `networks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Thumbnails')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Thumbnails')
        .getPublicUrl(filePath);

      setValue("logo_url", publicUrl);
      setPreviewUrl(publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const clearLogo = () => {
    setValue("logo_url", "");
    setPreviewUrl("");
  };

  const mutation = useMutation({
    mutationFn: async (data: NetworkFormData) => {
      if (network) {
        const { error } = await supabase
          .from("networks")
          .update(data)
          .eq("id", network.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("networks").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networks"] });
      toast.success(network ? "Network updated successfully" : "Network created successfully");
      onOpenChange(false);
      reset();
      setPreviewUrl("");
    },
    onError: (error: any) => {
      toast.error("Failed to save network: " + error.message);
    },
  });

  const onSubmit = (data: NetworkFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{network ? "Edit Network" : "Add Network"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required" })}
              placeholder="Netflix, HBO, Disney+..."
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex flex-col gap-3">
              {previewUrl ? (
                <div className="relative w-24 h-24 border rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={previewUrl} 
                    alt="Network logo" 
                    className="w-full h-full object-contain p-2"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={clearLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
              {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>
            <Input
              type="hidden"
              {...register("logo_url")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || uploading}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}