import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface FeaturedItem {
  id: string;
  title: string;
  content_type: string;
  content_id: string | null;
  section: string;
  position: number;
  image_url: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  description: string | null;
  status: string | null;
  detail_endpoint: string | null;
  watch_endpoint: string | null;
  created_at: string;
  updated_at: string;
}

export function useFeaturedContent() {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['featured-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slider_settings')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as FeaturedItem[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('slider_settings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-content'] });
      toast.success('Featured item deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete featured item');
      console.error(error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeaturedItem> }) => {
      const { error } = await supabase
        .from('slider_settings')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-content'] });
      toast.success('Featured item updated');
    },
    onError: (error) => {
      toast.error('Failed to update featured item');
      console.error(error);
    }
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase
        .from('slider_settings')
        .update({ position })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-content'] });
      toast.success('Position updated');
    },
    onError: (error) => {
      toast.error('Failed to update position');
      console.error(error);
    }
  });

  return {
    items: items || [],
    isLoading,
    deleteItem: deleteMutation.mutate,
    updateItem: updateMutation.mutate,
    updatePosition: updatePositionMutation.mutate,
  };
}
