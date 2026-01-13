import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StreamingCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: any;
}

export function StreamingCategoryDialog({ open, onOpenChange, category }: StreamingCategoryDialogProps) {
  const [categoryName, setCategoryName] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (category) {
      setCategoryName(category.name);
    } else {
      setCategoryName('');
    }
  }, [category]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!categoryName.trim()) {
        throw new Error('Category name is required');
      }

      if (category) {
        // Update: rename all channels with old category to new category
        const { error } = await supabase
          .from('streaming_channels')
          .update({ category: categoryName })
          .eq('category', category.name);
        if (error) throw error;
      } else {
        // Create: just set the name, channels will be assigned later
        // For now, we just validate the name
        if (!categoryName.trim()) {
          throw new Error('Category name cannot be empty');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaming_categories'] });
      toast.success(category ? 'Category updated' : 'Category created');
      onOpenChange(false);
      setCategoryName('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save category');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Create Category'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category Name</Label>
            <Input
              placeholder="Enter category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
