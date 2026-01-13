import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportsTable } from '@/components/admin/ReportsTable';
import { Button } from '@/components/ui/button';
import { BarChart3, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminReports() {
  const navigate = useNavigate();
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Manage user-submitted content reports</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/reports/analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/reports/reputation')}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Reputation
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Management</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportsTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
