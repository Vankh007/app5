import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export default function AdminHeadersUserAgents() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Headers & User Agents</h1>
            <p className="text-muted-foreground">Configure HTTP headers and user agents</p>
          </div>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Headers and user agent configuration will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
