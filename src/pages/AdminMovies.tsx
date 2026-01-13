import { useState } from "react";
import { Film, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { MoviesTable } from "@/components/admin/MoviesTable";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { Button } from "@/components/ui/button";

const Movies = () => {
  const navigate = useNavigate();
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Movies</h1>
            <p className="text-muted-foreground">Manage your movie content</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setBulkImportOpen(true)}>
              <Film className="h-4 w-4 mr-2" />
              Bulk Import Movies
            </Button>
            <Button onClick={() => navigate('/admin/movies/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Movie
            </Button>
          </div>
        </div>
        
        <MoviesTable />
        
        <BulkImportDialog 
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          type="movies"
        />
      </div>
    </AdminLayout>
  );
};

export default Movies;
