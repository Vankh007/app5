import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

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
}

interface SubscriptionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MembershipPlan | null;
}

export function SubscriptionPlanDialog({ open, onOpenChange, plan }: SubscriptionPlanDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    currency: 'USD',
    duration: 30,
    duration_unit: 'days',
    device_limit: 3,
    show_ads: false,
    is_active: true,
    app_purchase_code: '',
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        duration: plan.duration,
        duration_unit: plan.duration_unit,
        device_limit: plan.device_limit,
        show_ads: plan.show_ads,
        is_active: plan.is_active,
        app_purchase_code: plan.app_purchase_code || '',
      });
    } else {
      setFormData({
        name: '',
        price: 0,
        currency: 'USD',
        duration: 30,
        duration_unit: 'days',
        device_limit: 3,
        show_ads: false,
        is_active: true,
        app_purchase_code: '',
      });
    }
  }, [plan, open]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        app_purchase_code: data.app_purchase_code || null,
      };

      if (plan) {
        const { error } = await supabase
          .from('membership_plans')
          .update(payload)
          .eq('id', plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('membership_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      toast.success(plan ? 'Plan updated successfully' : 'Plan created successfully');
      onOpenChange(false);
    },
    onError: () => {
      toast.error(plan ? 'Failed to update plan' : 'Failed to create plan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Plan Name</Label>
            <Input 
              placeholder="e.g., Premium Monthly" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price</Label>
              <Input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="0.00" 
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="KHR">KHR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration</Label>
              <Input 
                type="number" 
                min="1"
                placeholder="30" 
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label>Duration Unit</Label>
              <Select value={formData.duration_unit} onValueChange={(v) => setFormData({ ...formData, duration_unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Device Limit</Label>
            <Input 
              type="number" 
              min="1"
              placeholder="3" 
              value={formData.device_limit}
              onChange={(e) => setFormData({ ...formData, device_limit: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div>
            <Label>App Purchase Code (optional)</Label>
            <Input 
              placeholder="For in-app purchases" 
              value={formData.app_purchase_code}
              onChange={(e) => setFormData({ ...formData, app_purchase_code: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Show Ads</Label>
            <Switch 
              checked={formData.show_ads}
              onCheckedChange={(checked) => setFormData({ ...formData, show_ads: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch 
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Plan'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
