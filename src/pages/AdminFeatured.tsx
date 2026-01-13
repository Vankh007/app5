import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeaturedTable } from '@/components/admin/FeaturedTable';
import { Star } from 'lucide-react';

export default function AdminFeatured() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Featured Content</h1>
            <p className="text-muted-foreground">Manage featured movies and series displayed on sliders</p>
          </div>
          <Button onClick={() => navigate('/admin/featured/new')}>
            <Star className="h-4 w-4 mr-2" />
            Add Featured
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Featured Items</CardTitle>
          </CardHeader>
          <CardContent>
            <FeaturedTable />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
