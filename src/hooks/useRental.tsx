import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export const useRental = (contentId?: string, contentType?: string) => {
  const { user } = useAuth();
  const [hasActiveRental, setHasActiveRental] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rentalMaxDevices, setRentalMaxDevices] = useState(3);

  useEffect(() => {
    const checkRental = async () => {
      if (!user || !contentId) {
        setHasActiveRental(false);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('user_content_purchases')
          .select('*')
          .eq('user_id', user.id)
          .eq('content_id', contentId)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .maybeSingle();

        setHasActiveRental(!!data);
        if (data?.max_devices) {
          setRentalMaxDevices(data.max_devices);
        }
      } catch (error) {
        console.error('Error checking rental:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRental();
  }, [user, contentId, contentType]);

  return { hasActiveRental, loading, rentalMaxDevices };
};
