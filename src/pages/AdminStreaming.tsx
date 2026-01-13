import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function AdminStreaming() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Live Streaming</h1>
            <p className="text-muted-foreground">Manage live streaming channels</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Streaming Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Streaming functionality will be available once the streaming_channels table is set up.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
