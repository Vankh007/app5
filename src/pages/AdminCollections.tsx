import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CollectionsTable } from '@/components/admin/CollectionsTable';
import { CollectionDialog } from '@/components/admin/CollectionDialog';

export default function AdminCollections() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);

  const handleEdit = (collection: any) => {
    setSelectedCollection(collection);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCollection(null);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedCollection(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
            <p className="text-muted-foreground">Manage content collections</p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Collection
          </Button>
        </div>

        <CollectionsTable onEdit={handleEdit} />

        <CollectionDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          collection={selectedCollection}
        />
      </div>
    </AdminLayout>
  );
}
