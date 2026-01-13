import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AnimesTable } from '@/components/admin/AnimesTable';
import { AnimeImportDialog } from '@/components/admin/AnimeImportDialog';

export default function AdminAnimesMovies() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anime Movies</h1>
            <p className="text-muted-foreground">Manage your anime movie content</p>
          </div>
          <div className="flex gap-2">
            <AnimeImportDialog />
            <Button onClick={() => window.location.href = '/admin/animes/movies/new'}>
              <Plus className="h-4 w-4 mr-2" />
              Add Anime Movie
            </Button>
          </div>
        </div>

        <AnimesTable contentType="movie" />
      </div>
    </AdminLayout>
  );
}
