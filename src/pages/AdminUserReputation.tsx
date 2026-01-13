import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { Input } from "@/components/ui/input";
import { Award, TrendingUp, TrendingDown, Shield, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminUserReputation() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: reputations, isLoading } = useQuery({
    queryKey: ["user-reputations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reputation")
        .select(`
          *,
          profiles:user_id (
            username,
            profile_image
          )
        `)
        .order("reputation_score", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getReputationBadge = (score: number) => {
    if (score >= 500) return { label: "Gold", color: "bg-yellow-500", icon: Award };
    if (score >= 300) return { label: "Silver", color: "bg-gray-400", icon: Award };
    if (score >= 150) return { label: "Bronze", color: "bg-orange-600", icon: Award };
    return { label: "Basic", color: "bg-gray-500", icon: Shield };
  };

  const filteredReputations = reputations?.filter((rep: any) => {
    const username = rep.profiles?.username || "";
    return username.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Reputation System</h1>
          <p className="text-muted-foreground">Monitor and manage user reporting behavior</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reputations?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gold Users</CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reputations?.filter((r: any) => r.reputation_score >= 500).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restricted</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reputations?.filter((r: any) => r.is_restricted).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reputations && reputations.length > 0
                  ? Math.round(reputations.reduce((sum: number, r: any) => sum + r.reputation_score, 0) / reputations.length)
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Reputation Leaderboard</CardTitle>
            <CardDescription>Users ranked by reporting quality</CardDescription>
            <Input
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Helpful Reports</TableHead>
                  <TableHead>Spam Reports</TableHead>
                  <TableHead>Total Reports</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredReputations && filteredReputations.length > 0 ? (
                  filteredReputations.map((rep: any, index: number) => {
                    const badge = getReputationBadge(rep.reputation_score);
                    const BadgeIcon = badge.icon;
                    
                    return (
                      <TableRow key={rep.id}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {rep.profiles?.profile_image ? (
                              <img
                                src={rep.profiles.profile_image}
                                alt={rep.profiles.username}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Shield className="h-4 w-4" />
                              </div>
                            )}
                            <span>{rep.profiles?.username || "User"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-bold">{rep.reputation_score}</span>
                            {rep.reputation_score >= 150 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : rep.reputation_score < 50 ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={badge.color}>
                            <BadgeIcon className="h-3 w-3 mr-1" />
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">{rep.helpful_reports}</TableCell>
                        <TableCell className="text-red-600 font-medium">{rep.spam_reports}</TableCell>
                        <TableCell>{rep.total_reports}</TableCell>
                        <TableCell>
                          {rep.is_restricted ? (
                            <Badge variant="destructive">Restricted</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {rep.last_report_at
                            ? format(new Date(rep.last_report_at), "MMM dd, yyyy")
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
