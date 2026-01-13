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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface Report {
  id: string;
  user_id: string;
  content_id: string | null;
  episode_id: string | null;
  report_type: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  content?: {
    title: string;
  };
  episode?: {
    title: string;
  };
}

interface ReportDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
}

interface UpdateReportForm {
  status: string;
  admin_notes: string;
}

const reportTypeLabels: Record<string, string> = {
  copyright: "Copyright Violation",
  broken_link: "Broken/Dead Link",
  wrong_content: "Wrong Content",
  inappropriate: "Inappropriate Content",
  spam: "Spam",
  other: "Other",
};

export function ReportDetailsDialog({ open, onOpenChange, report }: ReportDetailsDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<UpdateReportForm>();

  const status = watch("status");

  useEffect(() => {
    if (report) {
      reset({
        status: report.status,
        admin_notes: report.admin_notes || "",
      });
    }
  }, [report, reset]);

  const mutation = useMutation({
    mutationFn: async (data: UpdateReportForm) => {
      if (!report) return;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("reports")
        .update({
          status: data.status,
          admin_notes: data.admin_notes,
          resolved_by: data.status === "resolved" || data.status === "rejected" ? user?.id : null,
          resolved_at: data.status === "resolved" || data.status === "rejected" ? new Date().toISOString() : null,
        })
        .eq("id", report.id);

      if (error) throw error;

      // Send email notification if status is resolved or rejected
      if (data.status === "resolved" || data.status === "rejected") {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-report-notification", {
            body: {
              reportId: report.id,
              status: data.status,
              adminNotes: data.admin_notes,
            },
          });

          if (emailError) {
            console.error("Failed to send email notification:", emailError);
            // Don't throw - email failure shouldn't prevent report update
          }
        } catch (emailErr) {
          console.error("Email notification error:", emailErr);
          // Continue even if email fails
        }

        // Update analytics
        try {
          await supabase.functions.invoke("update-report-analytics");
        } catch (analyticsErr) {
          console.error("Failed to update analytics:", analyticsErr);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report updated successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update report: " + error.message);
    },
  });

  const onSubmit = (data: UpdateReportForm) => {
    mutation.mutate(data);
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Report Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Report Type</Label>
              <p className="font-medium">{reportTypeLabels[report.report_type]}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date Submitted</Label>
              <p className="font-medium">
                {format(new Date(report.created_at), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Content</Label>
            <p className="font-medium">
              {report.content?.title || "N/A"}
            </p>
            {report.episode_id && report.episode?.title && (
              <p className="text-sm text-muted-foreground mt-1">
                Episode: {report.episode.title}
              </p>
            )}
          </div>

          <div>
            <Label className="text-muted-foreground">User Description</Label>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm whitespace-pre-wrap">{report.description}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status || "pending"}
                onValueChange={(value) => setValue("status", value, { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_notes">Admin Notes</Label>
              <Textarea
                id="admin_notes"
                {...register("admin_notes")}
                placeholder="Add internal notes about this report..."
                rows={4}
                className="resize-none"
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
                {mutation.isPending ? "Updating..." : "Update Report"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
