import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  Settings,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Eye,
  Filter,
  Calendar,
  Film,
  Users,
  Video,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  configuration: any;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_reference?: string;
  created_at: string;
  completed_at?: string;
  profiles?: {
    username?: string;
  };
}

interface PaymentStats {
  totalRevenue: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}

const AdminPaymentSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

      fetchData();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchGateways(),
        fetchTransactions(),
        fetchStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGateways = async () => {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gateways:', error);
      toast.error('Failed to load payment gateways');
    } else {
      setGateways(data || []);
    }
  };

  const fetchTransactions = async () => {
    let query = supabase
      .from('payment_transactions')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterDateFrom) {
      query = query.gte('created_at', new Date(filterDateFrom).toISOString());
    }

    if (filterDateTo) {
      query = query.lte('created_at', new Date(filterDateTo).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } else {
      setTransactions(data || []);
    }
  };

  const fetchStats = async () => {
    // Total revenue
    const { data: revenueData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Transaction counts by status
    const { count: completedCount } = await supabase
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: pendingCount } = await supabase
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: failedCount } = await supabase
      .from('payment_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());

    const todayRevenue = todayData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // This week's revenue
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', weekAgo.toISOString());

    const weekRevenue = weekData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // This month's revenue
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const { data: monthData } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', monthAgo.toISOString());

    const monthRevenue = monthData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    setStats({
      totalRevenue,
      completedTransactions: completedCount || 0,
      pendingTransactions: pendingCount || 0,
      failedTransactions: failedCount || 0,
      todayRevenue,
      weekRevenue,
      monthRevenue,
    });
  };

  const toggleGateway = async (gatewayId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('payment_gateways')
      .update({ is_active: !isActive })
      .eq('id', gatewayId);

    if (error) {
      toast.error('Failed to update gateway status');
    } else {
      toast.success(`Gateway ${!isActive ? 'enabled' : 'disabled'}`);
      fetchGateways();
    }
  };

  const exportTransactions = () => {
    const csv = [
      ['ID', 'Date', 'User', 'Amount', 'Currency', 'Status', 'Payment Method', 'Reference'],
      ...transactions.map(t => [
        t.id,
        new Date(t.created_at).toLocaleString(),
        t.profiles?.username || 'Unknown',
        t.amount,
        t.currency,
        t.status,
        t.payment_method,
        t.payment_reference || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString()}.csv`;
    a.click();
    toast.success('Transactions exported successfully');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(search) ||
        t.payment_reference?.toLowerCase().includes(search) ||
        t.profiles?.username?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} hideJoinMember />
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading payment settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} hideJoinMember />
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-admin-sidebar border-r border-border/50 transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-2 space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <BarChart3 className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Dashboard</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/content' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/content')}
          >
            <Film className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Content Management</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/users' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/users')}
          >
            <Users className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Users</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/shorts' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/shorts')}
          >
            <Video className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Shorts</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/payment-settings' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/payment-settings')}
          >
            <Settings className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Payment Settings</span>}
          </Button>
        </div>
      </aside>
      
      <main className={`p-6 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Payment Settings</h1>
              <p className="text-muted-foreground">Configure payment gateways and manage transactions</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50 bg-white dark:bg-admin-card hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">${stats?.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-white dark:bg-admin-card hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">${stats?.todayRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-white dark:bg-admin-card hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats?.completedTransactions}</div>
                <p className="text-xs text-muted-foreground mt-1">Successful transactions</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-white dark:bg-admin-card hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{stats?.pendingTransactions}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting completion</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="gateways" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            {/* Payment Gateways Tab */}
            <TabsContent value="gateways" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configured Payment Gateways</CardTitle>
                  <CardDescription>Manage your payment processing providers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gateways.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payment gateways configured
                    </div>
                  ) : (
                    gateways.map(gateway => (
                      <div key={gateway.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{gateway.name}</h3>
                            <Badge variant={gateway.is_active ? 'default' : 'secondary'}>
                              {gateway.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Type: {gateway.type}</p>
                          {gateway.type === 'khqr' && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>• Bakong KHQR Payment Gateway</p>
                              <p>• Supports KHR and USD payments</p>
                              <p>• QR code generation and webhook verification</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={gateway.is_active ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => toggleGateway(gateway.id, gateway.is_active)}
                          >
                            {gateway.is_active ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  <Card className="bg-accent/50">
                    <CardHeader>
                      <CardTitle className="text-base">KHQR Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Merchant Account</Label>
                        <p className="font-mono bg-background p-2 rounded mt-1">••••••••</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Merchant ID</Label>
                        <p className="font-mono bg-background p-2 rounded mt-1">••••••••</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">API Status</Label>
                        <Badge variant="default" className="mt-1">Connected</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Secrets are securely stored in Supabase environment variables
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>View and manage all payment transactions</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={fetchTransactions}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportTransactions}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <Label>Search</Label>
                      <Input
                        placeholder="ID, reference, user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>From Date</Label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>To Date</Label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={fetchTransactions}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>

                  {/* Transactions Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="text-sm">
                                {new Date(transaction.created_at).toLocaleDateString()}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {new Date(transaction.created_at).toLocaleTimeString()}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">
                                {transaction.profiles?.username || 'Unknown'}
                              </TableCell>
                              <TableCell className="font-bold">
                                {transaction.amount} {transaction.currency}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{transaction.payment_method}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {transaction.payment_reference || 'N/A'}
                              </TableCell>
                              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Overview</CardTitle>
                    <CardDescription>Payment performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Today</span>
                        <span className="text-lg font-bold text-primary">${stats?.todayRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">This Week</span>
                        <span className="text-lg font-bold">${stats?.weekRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">This Month</span>
                        <span className="text-lg font-bold">${stats?.monthRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm font-medium">All Time</span>
                        <span className="text-xl font-bold text-primary">${stats?.totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Summary</CardTitle>
                    <CardDescription>Status breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Completed</span>
                        </div>
                        <span className="text-lg font-bold">{stats?.completedTransactions}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-yellow-500" />
                          <span className="font-medium">Pending</span>
                        </div>
                        <span className="text-lg font-bold">{stats?.pendingTransactions}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          <span className="font-medium">Failed</span>
                        </div>
                        <span className="text-lg font-bold">{stats?.failedTransactions}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPaymentSettings;
