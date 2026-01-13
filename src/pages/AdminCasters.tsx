import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CastersTable } from '@/components/admin/CastersTable';

export default function AdminCasters() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cast Members</h1>
            <p className="text-muted-foreground">
              Cast members are automatically imported when you bulk import content from TMDB
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cast Members</CardTitle>
          </CardHeader>
          <CardContent>
            <CastersTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
