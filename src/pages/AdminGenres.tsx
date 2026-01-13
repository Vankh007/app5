import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GenresTable } from '@/components/admin/GenresTable';

export default function AdminGenres() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Genres</h1>
          <p className="text-muted-foreground">Manage content genres and categories</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Genre Management</CardTitle>
          </CardHeader>
          <CardContent>
            <GenresTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
