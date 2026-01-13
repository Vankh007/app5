import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionPlansTable } from "@/components/admin/SubscriptionPlansTable";
import { CouponsTable } from "@/components/admin/CouponsTable";
import { UserSubscriptionsTable } from "@/components/admin/UserSubscriptionsTable";
import { SubscriptionPlanDialog } from "@/components/admin/SubscriptionPlanDialog";
import { CouponDialog } from "@/components/admin/CouponDialog";

export default function Subscriptions() {
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions & Coupons</h1>
          <p className="text-muted-foreground">Manage subscription plans, user subscriptions, and coupon codes</p>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-between items-center">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Plans</CardTitle>
                  <CardDescription>Create and manage subscription tiers</CardDescription>
                </CardHeader>
              </Card>
              <Button onClick={() => { setSelectedPlan(null); setIsPlanDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Plan
              </Button>
            </div>
            <SubscriptionPlansTable 
              onEdit={(plan) => { setSelectedPlan(plan); setIsPlanDialogOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="coupons" className="space-y-4">
            <div className="flex justify-between items-center">
              <Card>
                <CardHeader>
                  <CardTitle>Coupon Codes</CardTitle>
                  <CardDescription>Create discount codes for users</CardDescription>
                </CardHeader>
              </Card>
              <Button onClick={() => { setSelectedCoupon(null); setIsCouponDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Coupon
              </Button>
            </div>
            <CouponsTable 
              onEdit={(coupon) => { setSelectedCoupon(coupon); setIsCouponDialogOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Active User Subscriptions</CardTitle>
                <CardDescription>View and manage user subscription status</CardDescription>
              </CardHeader>
              <CardContent>
                <UserSubscriptionsTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SubscriptionPlanDialog
          open={isPlanDialogOpen}
          onOpenChange={setIsPlanDialogOpen}
          plan={selectedPlan}
        />

        <CouponDialog
          open={isCouponDialogOpen}
          onOpenChange={setIsCouponDialogOpen}
          coupon={selectedCoupon}
        />
      </div>
    </AdminLayout>
  );
}
