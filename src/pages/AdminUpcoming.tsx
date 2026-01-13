import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UpcomingTable } from '@/components/admin/UpcomingTable';

export default function AdminUpcoming() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upcoming Releases</h1>
            <p className="text-muted-foreground">Manage upcoming content schedule</p>
          </div>
          <Button onClick={() => navigate('/admin/upcoming/add')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Upcoming
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
