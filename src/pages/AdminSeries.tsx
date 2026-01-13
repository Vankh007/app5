import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Plus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SeriesTable } from "@/components/admin/SeriesTable";
import { BulkImportDialog } from "@/components/admin/BulkImportDialog";
import { Button } from "@/components/ui/button";

const Series = () => {
  const navigate = useNavigate();
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Series</h1>
            <p className="text-muted-foreground">Manage your series content</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setBulkImportOpen(true)}>
              <Radio className="h-4 w-4 mr-2" />
              Bulk Import TV Shows
            </Button>
            <Button onClick={() => navigate('/admin/series/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Serie
            </Button>
          </div>
        </div>
        
        <SeriesTable />
        
        <BulkImportDialog 
          open={bulkImportOpen}
          onOpenChange={setBulkImportOpen}
          type="series"
        />
      </div>
    </AdminLayout>
  );
};

export default Series;
