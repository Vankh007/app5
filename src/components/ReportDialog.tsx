import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flag } from "lucide-react";

const reportSchema = z.object({
  report_type: z.enum(["copyright", "broken_link", "wrong_content", "inappropriate", "spam", "other"], {
    required_error: "Please select a report type",
  }),
  description: z
    .string()
    .trim()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(1000, { message: "Description must be less than 1000 characters" }),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  episodeId?: string;
}

const reportTypes = [
  { value: "copyright", label: "Copyright Violation" },
  { value: "broken_link", label: "Broken/Dead Link" },
  { value: "wrong_content", label: "Wrong Content" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export function ReportDialog({ open, onOpenChange, contentId, episodeId }: ReportDialogProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to submit a report");
      }

      // Check if user is restricted
      const { data: reputation } = await supabase
        .from("user_reputation")
        .select("is_restricted, reputation_score")
        .eq("user_id", user.id)
        .maybeSingle();

      if (reputation?.is_restricted) {
        throw new Error("Your reporting privileges have been temporarily restricted due to low reputation score. Please contact support.");
      }

      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        content_id: contentId,
        episode_id: episodeId || null,
        report_type: data.report_type,
        description: data.description,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report submitted successfully. We'll review it shortly.");
      reset();
      setSelectedType("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.message.includes("logged in")) {
        toast.error("Please log in to submit a report");
      } else {
        toast.error("Failed to submit report: " + error.message);
      }
    },
  });

  const onSubmit = (data: ReportFormData) => {
    mutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setSelectedType("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us maintain quality by reporting issues with this content.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report_type">Report Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value);
                setValue("report_type", value as any);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.report_type && (
              <p className="text-sm text-destructive">{errors.report_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Please provide details about the issue..."
              rows={5}
              className="resize-none"
              maxLength={1000}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Min 10 characters, max 1000 characters
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
