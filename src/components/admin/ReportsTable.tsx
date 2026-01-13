import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, CheckCircle, XCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "./TableSkeleton";
import { ReportDetailsDialog } from "./ReportDetailsDialog";
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
  priority?: number;
  auto_flagged?: boolean;
  flag_reason?: string | null;
  content?: {
    title: string;
    poster_path?: string;
  };
  episode?: {
    title: string;
    still_path?: string;
  };
  user_reputation?: {
    reputation_score: number;
  };
}

const statusColors = {
  pending: "default",
  reviewing: "secondary",
  resolved: "outline",
  rejected: "destructive",
} as const;

const reportTypeLabels: Record<string, string> = {
  copyright: "Copyright",
  broken_link: "Broken Link",
  wrong_content: "Wrong Content",
  inappropriate: "Inappropriate",
  spam: "Spam",
  other: "Other",
};

export function ReportsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select(`
          *,
          content:content_id(title, poster_path),
          episode:episode_id(title, still_path)
        `)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Report[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          resolved_by: status === "resolved" || status === "rejected" ? user?.id : null,
          resolved_at: status === "resolved" || status === "rejected" ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      // Send email notification if status is resolved or rejected
      if (status === "resolved" || status === "rejected") {
        try {
          await supabase.functions.invoke("send-report-notification", {
            body: { reportId: id, status },
          });
        } catch (emailErr) {
          console.error("Failed to send email:", emailErr);
          // Continue even if email fails
        }
      }

      // Update analytics
      try {
        await supabase.functions.invoke("update-report-analytics");
      } catch (analyticsErr) {
        console.error("Failed to update analytics:", analyticsErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const filteredReports = reports.filter((report) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.description.toLowerCase().includes(searchLower) ||
      report.content?.title?.toLowerCase().includes(searchLower) ||
      report.episode?.title?.toLowerCase().includes(searchLower) ||
      report.report_type.toLowerCase().includes(searchLower)
    );
  });

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  const handleQuickResolve = (reportId: string) => {
    updateStatusMutation.mutate({ id: reportId, status: "resolved" });
  };

  const handleQuickReject = (reportId: string) => {
    updateStatusMutation.mutate({ id: reportId, status: "rejected" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reporter Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id} className={report.auto_flagged ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.auto_flagged && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant={report.priority && report.priority >= 8 ? "destructive" : "outline"}>
                          P{report.priority || 1}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {reportTypeLabels[report.report_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-center gap-3">
                        <img 
                          src={report.content?.poster_path || report.episode?.still_path || '/placeholder.svg'} 
                          alt={report.content?.title || report.episode?.title || "Content"}
                          className="w-12 h-16 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="truncate font-medium">
                            {report.content?.title || "N/A"}
                          </span>
                          {report.episode_id && report.episode?.title && (
                            <span className="text-xs text-muted-foreground truncate">
                              Episode: {report.episode.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="truncate text-sm text-muted-foreground">
                        {report.description}
                      </div>
                      {report.flag_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Auto-flagged: {report.flag_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">100</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[report.status as keyof typeof statusColors]}>
                        {report.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {report.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuickResolve(report.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuickReject(report.id)}
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ReportDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        report={selectedReport}
      />
    </div>
  );
}
