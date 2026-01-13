import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export default function AdminNotifications() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">Send and manage notifications</p>
          </div>
          <Button>
            <Bell className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Center</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Notification management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
