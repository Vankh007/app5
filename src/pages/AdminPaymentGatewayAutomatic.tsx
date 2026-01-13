import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Search, Pencil, Power, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  configuration: {
    supported_currencies?: string[];
    enabled_currencies?: string[];
    api_key?: string;
    merchant_id?: string;
    bakong_token?: string;
    webhook_url?: string;
    [key: string]: any;
  };
  created_at: string;
}

// Default automatic gateways including Bakong
const defaultGateways = [
  { name: 'Bakong', type: 'bakong', supported_currencies: ['KHR', 'USD'], description: 'Cambodia National Bank Payment System' },
  { name: 'KHQR', type: 'khqr', supported_currencies: ['KHR', 'USD'], description: 'Khmer QR Payment Standard' },
  { name: 'Stripe', type: 'stripe', supported_currencies: ['USD', 'EUR', 'GBP'], description: 'Global payment processing' },
  { name: 'PayPal', type: 'paypal', supported_currencies: ['USD', 'EUR', 'GBP'], description: 'Online payment system' },
  { name: 'Coinbase Commerce', type: 'coinbase', supported_currencies: ['BTC', 'ETH', 'USDC'], description: 'Cryptocurrency payments' },
  { name: 'bKash', type: 'bkash', supported_currencies: ['BDT'], description: 'Bangladesh mobile payment' },
  { name: 'Flutterwave', type: 'flutterwave', supported_currencies: ['NGN', 'USD', 'GHS'], description: 'African payment gateway' },
  { name: 'Razorpay', type: 'razorpay', supported_currencies: ['INR'], description: 'India payment gateway' },
];

const AdminPaymentGatewayAutomatic = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [formData, setFormData] = useState({
    api_key: '',
    merchant_id: '',
    bakong_token: '',
    webhook_url: '',
    enabled_currencies: [] as string[],
  });

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

      fetchGateways();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Merge with default gateways
      const existingTypes = new Set(data?.map(g => g.type) || []);
      const mergedGateways: PaymentGateway[] = [...(data || [])];

      // Add missing default gateways as inactive
      for (const defaultGw of defaultGateways) {
        if (!existingTypes.has(defaultGw.type)) {
          mergedGateways.push({
            id: `default-${defaultGw.type}`,
            name: defaultGw.name,
            type: defaultGw.type,
            is_active: false,
            configuration: {
              supported_currencies: defaultGw.supported_currencies,
              enabled_currencies: [],
            },
            created_at: new Date().toISOString(),
          });
        }
      }

      setGateways(mergedGateways);
    } catch (error) {
      console.error('Error fetching gateways:', error);
      toast.error('Failed to load payment gateways');
    } finally {
      setLoading(false);
    }
  };

  const toggleGateway = async (gateway: PaymentGateway) => {
    try {
      if (gateway.id.startsWith('default-')) {
        // Create new gateway record
        const { error } = await supabase
          .from('payment_gateways')
          .insert({
            name: gateway.name,
            type: gateway.type,
            is_active: true,
            configuration: gateway.configuration,
          });

        if (error) throw error;
        toast.success(`${gateway.name} enabled`);
      } else {
        // Toggle existing gateway
        const { error } = await supabase
          .from('payment_gateways')
          .update({ is_active: !gateway.is_active })
          .eq('id', gateway.id);

        if (error) throw error;
        toast.success(`${gateway.name} ${!gateway.is_active ? 'enabled' : 'disabled'}`);
      }

      fetchGateways();
    } catch (error) {
      console.error('Error toggling gateway:', error);
      toast.error('Failed to update gateway status');
    }
  };

  const openEditDialog = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    setFormData({
      api_key: gateway.configuration.api_key || '',
      merchant_id: gateway.configuration.merchant_id || '',
      bakong_token: gateway.configuration.bakong_token || '',
      webhook_url: gateway.configuration.webhook_url || '',
      enabled_currencies: gateway.configuration.enabled_currencies || [],
    });
    setEditDialogOpen(true);
  };

  const handleSaveGateway = async () => {
    if (!selectedGateway) return;

    try {
      const updatedConfig = {
        ...selectedGateway.configuration,
        api_key: formData.api_key,
        merchant_id: formData.merchant_id,
        bakong_token: formData.bakong_token,
        webhook_url: formData.webhook_url,
        enabled_currencies: formData.enabled_currencies,
      };

      if (selectedGateway.id.startsWith('default-')) {
        // Create new gateway
        const { error } = await supabase
          .from('payment_gateways')
          .insert({
            name: selectedGateway.name,
            type: selectedGateway.type,
            is_active: true,
            configuration: updatedConfig,
          });

        if (error) throw error;
      } else {
        // Update existing gateway
        const { error } = await supabase
          .from('payment_gateways')
          .update({ configuration: updatedConfig })
          .eq('id', selectedGateway.id);

        if (error) throw error;
      }

      toast.success('Gateway configuration saved');
      setEditDialogOpen(false);
      fetchGateways();
    } catch (error) {
      console.error('Error saving gateway:', error);
      toast.error('Failed to save gateway configuration');
    }
  };

  const filteredGateways = gateways.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSupportedCurrencyCount = (gateway: PaymentGateway) => {
    return gateway.configuration.supported_currencies?.length || 0;
  };

  const getEnabledCurrencyCount = (gateway: PaymentGateway) => {
    return gateway.configuration.enabled_currencies?.length || 0;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading gateways...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Payment Gateways</h1>
            <p className="text-muted-foreground">Configure automatic payment gateways including Bakong</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="automatic" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger 
              value="automatic" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Automatic Gateway
            </TabsTrigger>
            <TabsTrigger 
              value="manual"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              onClick={() => navigate('/admin/settings/gateway/manual')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manual Gateway
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automatic" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Automatic Gateways</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="text-primary-foreground font-semibold">Gateway</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Supported Currency</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Enabled Currency</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Status</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGateways.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No payment gateways found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGateways.map((gateway) => (
                          <TableRow key={gateway.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{gateway.name}</TableCell>
                            <TableCell className="text-center">{getSupportedCurrencyCount(gateway)}</TableCell>
                            <TableCell className="text-center">{getEnabledCurrencyCount(gateway)}</TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={gateway.is_active ? 'default' : 'secondary'}
                                className={gateway.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-destructive hover:bg-destructive/90'}
                              >
                                {gateway.is_active ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(gateway)}
                                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleGateway(gateway)}
                                  className={gateway.is_active 
                                    ? 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
                                    : 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
                                  }
                                >
                                  <Power className="h-4 w-4 mr-1" />
                                  {gateway.is_active ? 'Disable' : 'Enable'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Configure {selectedGateway?.name}</DialogTitle>
              <DialogDescription>
                Update the configuration for this payment gateway
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedGateway?.type === 'bakong' && (
                <div className="space-y-2">
                  <Label htmlFor="bakong_token">Bakong API Token</Label>
                  <Textarea
                    id="bakong_token"
                    placeholder="Enter your Bakong API token"
                    value={formData.bakong_token}
                    onChange={(e) => setFormData({ ...formData, bakong_token: e.target.value })}
                    rows={3}
                  />
                </div>
              )}

              {selectedGateway?.type !== 'bakong' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key</Label>
                    <Input
                      id="api_key"
                      type="password"
                      placeholder="Enter API key"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="merchant_id">Merchant ID</Label>
                    <Input
                      id="merchant_id"
                      placeholder="Enter merchant ID"
                      value={formData.merchant_id}
                      onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  placeholder="https://your-domain.com/webhook"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Enabled Currencies</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedGateway?.configuration.supported_currencies?.map((currency) => (
                    <Button
                      key={currency}
                      variant={formData.enabled_currencies.includes(currency) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const isEnabled = formData.enabled_currencies.includes(currency);
                        setFormData({
                          ...formData,
                          enabled_currencies: isEnabled
                            ? formData.enabled_currencies.filter(c => c !== currency)
                            : [...formData.enabled_currencies, currency],
                        });
                      }}
                    >
                      {currency}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGateway}>
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentGatewayAutomatic;
