import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAuth } from '@/hooks/useAuth';
import MaintenancePage from '@/pages/MaintenancePage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceWrapperProps {
  children: ReactNode;
}

// Routes that should be accessible even during maintenance
const EXCLUDED_ROUTES = ['/admin/login', '/admin'];

export function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const { isMaintenanceEnabled, isLoading: isLoadingMaintenance } = useMaintenanceMode();
  const { user } = useAuth();
  const location = useLocation();

  // Check if current route is excluded from maintenance
  const isExcludedRoute = EXCLUDED_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith('/admin')
  );

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['user-is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user?.id && isMaintenanceEnabled,
  });

  // Show loading state briefly while checking maintenance status
  if (isLoadingMaintenance) {
    return null;
  }

  // Allow access to admin routes even during maintenance
  if (isExcludedRoute) {
    return <>{children}</>;
  }

  // If maintenance is enabled and user is not admin, show maintenance page
  if (isMaintenanceEnabled && !isAdmin) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
