import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function AdminModerators() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moderators</h1>
            <p className="text-muted-foreground">Manage moderator accounts and permissions</p>
          </div>
          <Button>
            <Shield className="h-4 w-4 mr-2" />
            Add Moderator
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Moderator Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Moderator management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
