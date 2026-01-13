import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Search,
  Pencil,
  Power,
  PowerOff,
  Plus,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentGateway {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  configuration: any;
  created_at: string;
}

// Mock data for demonstration - includes Bakong
const automaticGateways = [
  { id: '1', name: 'Bakong', supported_currency: 5, enabled_currency: 2, is_active: true },
  { id: '2', name: 'ABA PayWay', supported_currency: 3, enabled_currency: 1, is_active: true },
  { id: '3', name: 'ACLEDA Xpay', supported_currency: 2, enabled_currency: 1, is_active: true },
  { id: '4', name: 'Wing', supported_currency: 2, enabled_currency: 1, is_active: true },
  { id: '5', name: 'Pi Pay', supported_currency: 1, enabled_currency: 0, is_active: false },
  { id: '6', name: 'Stripe', supported_currency: 135, enabled_currency: 3, is_active: true },
  { id: '7', name: 'PayPal', supported_currency: 25, enabled_currency: 1, is_active: true },
  { id: '8', name: 'Coinbase Commerce', supported_currency: 166, enabled_currency: 2, is_active: true },
  { id: '9', name: 'Binance Pay', supported_currency: 50, enabled_currency: 0, is_active: false },
  { id: '10', name: 'Flutterwave', supported_currency: 25, enabled_currency: 1, is_active: true },
];

const manualGateways = [
  { id: '1', name: 'Bank Transfer (ABA)', is_active: true },
  { id: '2', name: 'Bank Transfer (ACLEDA)', is_active: true },
  { id: '3', name: 'Cash on Delivery', is_active: false },
  { id: '4', name: 'Mobile Money', is_active: true },
];

export default function AdminPaymentGateways() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'automatic');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const toggleGateway = (gatewayId: string, gatewayName: string, isActive: boolean) => {
    toast.success(`${gatewayName} ${isActive ? 'disabled' : 'enabled'} successfully`);
  };

  const filteredAutomaticGateways = automaticGateways.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredManualGateways = manualGateways.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Gateways</h1>
            <p className="text-muted-foreground">Configure automatic and manual payment gateways</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="automatic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="h-4 w-4 mr-2" />
              Automatic Gateway
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wallet className="h-4 w-4 mr-2" />
              Manual Gateway
            </TabsTrigger>
          </TabsList>

          {/* Automatic Gateways Tab */}
          <TabsContent value="automatic" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Automatic Gateways</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
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
                      {filteredAutomaticGateways.map((gateway, index) => (
                        <TableRow key={gateway.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <TableCell className="font-medium">{gateway.name}</TableCell>
                          <TableCell className="text-center">{gateway.supported_currency}</TableCell>
                          <TableCell className="text-center">{gateway.enabled_currency}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={gateway.is_active ? 'default' : 'secondary'}
                              className={gateway.is_active 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                              }
                            >
                              {gateway.is_active ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/admin/settings/gateway/automatic/${gateway.id}`)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant={gateway.is_active ? 'destructive' : 'default'}
                                size="sm"
                                onClick={() => toggleGateway(gateway.id, gateway.name, gateway.is_active)}
                              >
                                {gateway.is_active ? (
                                  <>
                                    <PowerOff className="h-3 w-3 mr-1" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-3 w-3 mr-1" />
                                    Enable
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Gateways Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manual Gateways</CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="text-primary-foreground font-semibold">Gateway</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Status</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredManualGateways.map((gateway, index) => (
                        <TableRow key={gateway.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <TableCell className="font-medium">{gateway.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={gateway.is_active ? 'default' : 'secondary'}
                              className={gateway.is_active 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' 
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                              }
                            >
                              {gateway.is_active ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/admin/settings/gateway/manual/${gateway.id}`)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                variant={gateway.is_active ? 'destructive' : 'default'}
                                size="sm"
                                onClick={() => toggleGateway(gateway.id, gateway.name, gateway.is_active)}
                              >
                                {gateway.is_active ? (
                                  <>
                                    <PowerOff className="h-3 w-3 mr-1" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-3 w-3 mr-1" />
                                    Enable
                                  </>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
