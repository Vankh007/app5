import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket } from 'lucide-react';

export default function AdminCoupons() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
            <p className="text-muted-foreground">Manage discount coupons</p>
          </div>
          <Button>
            <Ticket className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coupon Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Coupon management will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
