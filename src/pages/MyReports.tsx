import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserReputationBadge } from "@/components/admin/UserReputationBadge";
import { Award, TrendingUp, TrendingDown, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

const reportTypeLabels: Record<string, string> = {
  copyright: "Copyright Violation",
  broken_link: "Broken/Dead Link",
  wrong_content: "Wrong Content",
  inappropriate: "Inappropriate Content",
  spam: "Spam",
  other: "Other",
};

const statusColors = {
  pending: "default",
  reviewing: "secondary",
  resolved: "outline",
  rejected: "destructive",
} as const;

export default function MyReports() {
  // Fetch user reputation
  const { data: reputation } = useQuery({
    queryKey: ["my-reputation"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_reputation")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data || {
        reputation_score: 100,
        helpful_reports: 0,
        spam_reports: 0,
        total_reports: 0,
      };
    },
  });

  // Fetch user's reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ["my-reports"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          content:content_id (
            title
          ),
          episode:episode_id (
            title,
            episode_number
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Reports</h1>
          <p className="text-muted-foreground">Track your submitted reports and reputation</p>
        </div>

        {/* Reputation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Your Reporting Reputation
            </CardTitle>
            <CardDescription>
              {reputation?.is_restricted 
                ? "Your reporting privileges are currently restricted. Please submit quality reports to improve your score."
                : "Keep submitting helpful reports to earn badges and improve your reputation!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Reputation Score</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{reputation?.reputation_score || 100}</span>
                  {reputation && reputation.reputation_score >= 150 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : reputation && reputation.reputation_score < 50 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : null}
                </div>
                {reputation && (
                  <UserReputationBadge score={reputation.reputation_score} />
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <div className="text-3xl font-bold">{reputation?.total_reports || 0}</div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Helpful Reports
                </p>
                <div className="text-3xl font-bold text-green-600">{reputation?.helpful_reports || 0}</div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Spam Reports
                </p>
                <div className="text-3xl font-bold text-red-600">{reputation?.spam_reports || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Submitted Reports</CardTitle>
            <CardDescription>History of all reports you've submitted</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : reports && reports.length > 0 ? (
                  reports.map((report: any) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {reportTypeLabels[report.report_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate">
                          {report.content?.title || report.episode?.title || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate text-sm text-muted-foreground">
                          {report.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[report.status as keyof typeof statusColors]}>
                          {report.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {report.status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {report.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {report.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        {report.admin_notes ? (
                          <div className="text-sm text-muted-foreground truncate">
                            {report.admin_notes}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      You haven't submitted any reports yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
