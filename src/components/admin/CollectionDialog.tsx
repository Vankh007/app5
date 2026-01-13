import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface Collection {
  id: string;
  name: string;
  description?: string;
  backdrop_url?: string;
  display_order?: number;
  is_featured?: boolean;
}

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
}

export function CollectionDialog({ open, onOpenChange, collection }: CollectionDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!collection;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    backdrop_url: '',
    display_order: 0,
    is_featured: false,
  });

  useEffect(() => {
    if (collection) {
      setFormData({
        name: collection.name || '',
        description: collection.description || '',
        backdrop_url: collection.backdrop_url || '',
        display_order: collection.display_order || 0,
        is_featured: collection.is_featured || false,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        backdrop_url: '',
        display_order: 0,
        is_featured: false,
      });
    }
  }, [collection, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { error } = await supabase
          .from('collections')
          .update(formData)
          .eq('id', collection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('collections')
          .insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Collection updated successfully!' : 'Collection created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to save collection: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Collection name is required');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Collection' : 'Add New Collection'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter collection name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter collection description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backdrop_url">Backdrop URL</Label>
              <Input
                id="backdrop_url"
                value={formData.backdrop_url}
                onChange={(e) => setFormData({ ...formData, backdrop_url: e.target.value })}
                placeholder="https://..."
              />
              {formData.backdrop_url && (
                <img 
                  src={formData.backdrop_url} 
                  alt="Backdrop preview" 
                  className="w-full h-32 object-cover rounded-lg border mt-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_featured">Featured Collection</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                  <Label htmlFor="is_featured" className="text-sm text-muted-foreground cursor-pointer">
                    {formData.is_featured ? 'Featured' : 'Not featured'}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
