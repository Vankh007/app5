import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Film, 
  DollarSign, 
  TrendingUp, 
  Eye,
  Tv,
  MessageSquare,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalMovies: number;
  totalSeries: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalViews: number;
  totalWatchTime: number;
  totalComments: number;
  recentContent: any[];
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast.error('Access denied: Admin privileges required');
        navigate('/');
        return;
      }

      fetchDashboardData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        usersResult,
        moviesResult,
        seriesResult,
        revenueResult,
        subsResult,
        shortsResult,
        watchResult,
        commentsResult,
        recentContentResult
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('content').select('*', { count: 'exact', head: true }).eq('content_type', 'movie'),
        supabase.from('content').select('*', { count: 'exact', head: true }).eq('content_type', 'series'),
        supabase.from('payment_transactions').select('amount').eq('status', 'completed'),
        supabase.from('user_memberships').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('shorts').select('views'),
        supabase.from('watch_progress').select('progress_seconds'),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('content').select('id, title, content_type, access_type, genre, release_year, price, poster_path').order('created_at', { ascending: false }).limit(10)
      ]);

      const totalRevenue = revenueResult.data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const totalViews = shortsResult.data?.reduce((sum, short) => sum + (short.views || 0), 0) || 0;
      const totalWatchTime = Math.floor((watchResult.data?.reduce((sum, w) => sum + (w.progress_seconds || 0), 0) || 0) / 3600);

      setStats({
        totalUsers: usersResult.count || 0,
        totalMovies: moviesResult.count || 0,
        totalSeries: seriesResult.count || 0,
        totalRevenue,
        activeSubscriptions: subsResult.count || 0,
        totalViews,
        totalWatchTime,
        totalComments: commentsResult.count || 0,
        recentContent: recentContentResult.data || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your streaming platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Movies</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Film className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalMovies || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Movies in library</p>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Series</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Tv className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalSeries || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Series in library</p>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered users</p>
            </CardContent>
          </Card>

          <Card className="border-border hover:shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${stats?.totalRevenue.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground mt-1">Total earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats?.activeSubscriptions || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats?.totalViews || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Watch Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats?.totalWatchTime || 0}h</div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stats?.totalComments || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Content Table */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Content</CardTitle>
            </div>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate('/admin/movies')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Access</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Genre</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Year</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentContent.map((content: any) => (
                    <tr key={content.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex items-center gap-3">
                          {content.poster_path && (
                            <img 
                              src={content.poster_path} 
                              alt={content.title}
                              className="w-8 h-12 object-cover rounded"
                            />
                          )}
                          {content.title || 'Untitled'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs capitalize">
                          {content.content_type || 'Movie'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={content.access_type === 'free' ? 'default' : 'secondary'}
                          className={content.access_type === 'free' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'}
                        >
                          {content.access_type?.toUpperCase() || 'FREE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{content.genre || '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{content.release_year || '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {content.price ? `$${content.price}` : 'Free'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/content/${content.id}/edit`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentContent || stats.recentContent.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No content found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;