import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface CouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: any;
}

export function CouponDialog({ open, onOpenChange, coupon }: CouponDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{coupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Coupon Code</Label>
            <Input placeholder="SUMMER2024" />
          </div>
          <div>
            <Label>Discount (%)</Label>
            <Input type="number" placeholder="20" />
          </div>
          <Button className="w-full">Save Coupon</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
