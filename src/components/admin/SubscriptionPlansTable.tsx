import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: number;
  duration_unit: string;
  device_limit: number;
  show_ads: boolean;
  is_active: boolean;
  app_purchase_code: string | null;
  created_at: string;
}

interface SubscriptionPlansTableProps {
  onEdit: (plan: MembershipPlan) => void;
}

export function SubscriptionPlansTable({ onEdit }: SubscriptionPlansTableProps) {
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('price', { ascending: true });
      if (error) throw error;
      return data as MembershipPlan[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('membership_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete plan');
    },
  });

  const formatDuration = (duration: number, unit: string) => {
    return `${duration} ${unit}${duration > 1 ? '' : ''}`;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading plans...</div>;
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Name</th>
            <th className="p-3 text-left text-sm font-medium">Price</th>
            <th className="p-3 text-left text-sm font-medium">Duration</th>
            <th className="p-3 text-left text-sm font-medium">Devices</th>
            <th className="p-3 text-left text-sm font-medium">Ads</th>
            <th className="p-3 text-left text-sm font-medium">Status</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!plans || plans.length === 0 ? (
            <tr className="border-b">
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                No subscription plans yet
              </td>
            </tr>
          ) : (
            plans.map((plan) => (
              <tr key={plan.id} className="border-b">
                <td className="p-3 font-medium">{plan.name}</td>
                <td className="p-3">{plan.currency} {plan.price.toFixed(2)}</td>
                <td className="p-3">{formatDuration(plan.duration, plan.duration_unit)}</td>
                <td className="p-3">{plan.device_limit}</td>
                <td className="p-3">
                  <Badge variant={plan.show_ads ? 'secondary' : 'default'}>
                    {plan.show_ads ? 'Yes' : 'No'}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(plan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteMutation.mutate(plan.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
