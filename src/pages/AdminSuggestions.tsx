import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

export default function AdminSuggestions() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suggestions</h1>
            <p className="text-muted-foreground">Review user suggestions and feedback</p>
          </div>
          <Button>
            <Lightbulb className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              User suggestion management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
