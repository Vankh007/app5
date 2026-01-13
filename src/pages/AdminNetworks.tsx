import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworksTable } from '@/components/admin/NetworksTable';

export default function AdminNetworks() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Networks</h1>
          <p className="text-muted-foreground">Manage TV networks and studios</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Network Management</CardTitle>
          </CardHeader>
          <CardContent>
            <NetworksTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
