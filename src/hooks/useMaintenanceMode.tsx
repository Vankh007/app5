import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  allowed_ips: string[];
}

export function useMaintenanceMode() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'maintenance_mode')
        .single();
      
      if (error) throw error;
      return data?.setting_value as unknown as MaintenanceSettings;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<MaintenanceSettings>) => {
      const currentSettings = settings || { enabled: false, message: '', allowed_ips: [] };
      const updatedSettings = { ...currentSettings, ...newSettings };
      
      const { error } = await supabase
        .from('site_settings')
        .update({ setting_value: updatedSettings })
        .eq('setting_key', 'maintenance_mode');
      
      if (error) throw error;
      return updatedSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['maintenance-mode'], data);
      toast.success(data.enabled ? 'Maintenance mode enabled' : 'Site is now live');
    },
    onError: (error) => {
      toast.error('Failed to update maintenance mode');
      console.error(error);
    },
  });

  return {
    settings,
    isLoading,
    isMaintenanceEnabled: settings?.enabled ?? false,
    maintenanceMessage: settings?.message ?? '',
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
