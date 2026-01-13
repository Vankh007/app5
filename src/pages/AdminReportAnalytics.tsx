import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, Flag } from "lucide-react";
import { format, subDays } from "date-fns";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function AdminReportAnalytics() {
  // Fetch analytics data for last 30 days
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["report-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from("report_analytics")
        .select("*")
        .gte("report_date", thirtyDaysAgo)
        .order("report_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current reports summary
  const { data: reportsSummary } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("status, priority, auto_flagged, report_type, created_at, resolved_at");

      if (error) throw error;

      const pending = data.filter(r => r.status === 'pending').length;
      const resolved = data.filter(r => r.status === 'resolved').length;
      const rejected = data.filter(r => r.status === 'rejected').length;
      const autoFlagged = data.filter(r => r.auto_flagged).length;
      const highPriority = data.filter(r => r.priority >= 8).length;

      // Calculate average response time for resolved reports
      const resolvedReports = data.filter(r => r.resolved_at);
      const avgResponseTime = resolvedReports.length > 0
        ? resolvedReports.reduce((sum, r) => {
            const created = new Date(r.created_at).getTime();
            const resolved = new Date(r.resolved_at).getTime();
            return sum + (resolved - created);
          }, 0) / resolvedReports.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      return {
        total: data.length,
        pending,
        resolved,
        rejected,
        autoFlagged,
        highPriority,
        avgResponseTime: avgResponseTime.toFixed(1),
      };
    },
  });

  // Prepare chart data
  const trendData = analyticsData?.map(d => ({
    date: format(new Date(d.report_date), 'MMM dd'),
    Total: d.total_reports,
    Resolved: d.resolved_reports,
    Pending: d.pending_reports,
  })) || [];

  const typeDistribution = analyticsData && analyticsData.length > 0 
    ? [
        { name: "Copyright", value: analyticsData.reduce((sum, d) => sum + d.copyright_reports, 0) },
        { name: "Broken Link", value: analyticsData.reduce((sum, d) => sum + d.broken_link_reports, 0) },
        { name: "Wrong Content", value: analyticsData.reduce((sum, d) => sum + d.wrong_content_reports, 0) },
        { name: "Inappropriate", value: analyticsData.reduce((sum, d) => sum + d.inappropriate_reports, 0) },
        { name: "Spam", value: analyticsData.reduce((sum, d) => sum + d.spam_reports, 0) },
        { name: "Other", value: analyticsData.reduce((sum, d) => sum + d.other_reports, 0) },
      ].filter(item => item.value > 0)
    : [];

  if (analyticsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Report Analytics</h1>
          <p className="text-muted-foreground">Monitor report trends, response times, and system performance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsSummary?.total || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsSummary?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsSummary?.avgResponseTime || '0'}h</div>
              <p className="text-xs text-muted-foreground">Average resolution time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Flagged</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportsSummary?.autoFlagged || 0}</div>
              <p className="text-xs text-muted-foreground">Critical reports</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Report Trends (30 Days)</CardTitle>
              <CardDescription>Daily report submissions and resolutions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Total" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Resolved" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="Pending" stroke="#eab308" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Report Types Distribution</CardTitle>
              <CardDescription>Breakdown by report category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Resolution Status</CardTitle>
            <CardDescription>Report outcomes over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Resolved" fill="#22c55e" />
                <Bar dataKey="Pending" fill="#eab308" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportsSummary?.resolved || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {reportsSummary?.total ? ((reportsSummary.resolved / reportsSummary.total) * 100).toFixed(1) : 0}% resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportsSummary?.rejected || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {reportsSummary?.total ? ((reportsSummary.rejected / reportsSummary.total) * 100).toFixed(1) : 0}% rejection rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                High Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reportsSummary?.highPriority || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Requires immediate attention</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
