import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export const useSubscription = () => {
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [remainingDays, setRemainingDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setHasActiveSubscription(false);
        setRemainingDays(0);
        setLoading(false);
        return;
      }

      try {
        // Check user_memberships table (where purchase_membership_with_wallet stores memberships)
        const { data } = await supabase
          .from('user_memberships')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .maybeSingle();

        if (data && data.expires_at) {
          setHasActiveSubscription(true);
          const endDate = new Date(data.expires_at);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setRemainingDays(Math.max(0, diffDays));
        } else {
          setHasActiveSubscription(false);
          setRemainingDays(0);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  return { hasActiveSubscription, remainingDays, loading };
};
