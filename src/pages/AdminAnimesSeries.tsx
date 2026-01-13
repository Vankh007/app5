import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AnimesTable } from '@/components/admin/AnimesTable';
import { AnimeImportDialog } from '@/components/admin/AnimeImportDialog';

export default function AdminAnimesSeries() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anime Series</h1>
            <p className="text-muted-foreground">Manage your anime series content</p>
          </div>
          <div className="flex gap-2">
            <AnimeImportDialog />
            <Button onClick={() => window.location.href = '/admin/animes/series/new'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Anime Series
            </Button>
          </div>
        </div>

        <AnimesTable contentType="series" />
      </div>
    </AdminLayout>
  );
}
