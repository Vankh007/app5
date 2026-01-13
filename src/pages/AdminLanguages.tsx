import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguagesTable } from '@/components/admin/LanguagesTable';

export default function AdminLanguages() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Languages</h1>
          <p className="text-muted-foreground">Manage supported languages</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Language Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguagesTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
