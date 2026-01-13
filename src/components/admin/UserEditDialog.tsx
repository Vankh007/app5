import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Crown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserFormData {
  username: string;
  wallet_balance: number;
  role: "admin" | "moderator" | "user";
}

interface User {
  id: string;
  username: string | null;
  wallet_balance: number;
  updated_at?: string;
  profile_image?: string | null;
  role?: string;
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

interface Membership {
  id: string;
  user_id: string;
  membership_type: string;
  status: string | null;
  started_at: string;
  expires_at: string | null;
}

export function UserEditDialog({ open, onOpenChange, user }: UserEditDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<UserFormData>();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [membershipType, setMembershipType] = useState("");
  const [membershipDays, setMembershipDays] = useState("30");

  const role = watch("role");

  // Fetch user's current role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data?.role || "user";
    },
    enabled: !!user?.id && open,
  });

  // Fetch user's membership
  const { data: membership, refetch: refetchMembership } = useQuery({
    queryKey: ["user-membership", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Membership | null;
    },
    enabled: !!user?.id && open,
  });

  // Fetch membership plans
  const { data: membershipPlans = [] } = useQuery({
    queryKey: ["membership-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (user) {
      reset({
        username: user.username || "",
        wallet_balance: user.wallet_balance,
        role: (userRole as any) || "user",
      });
    } else {
      reset({
        username: "",
        wallet_balance: 0,
        role: "user",
      });
    }
  }, [user, userRole, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (!user) return;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          wallet_balance: data.wallet_balance,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update role
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: data.role,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-role", user?.id] });
      toast.success("User updated successfully");
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error("Failed to update user: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      // Delete user role first
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      
      // Delete user membership
      await supabase.from("user_memberships").delete().eq("user_id", user.id);
      
      // Delete profile
      const { error } = await supabase.from("profiles").delete().eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
      onOpenChange(false);
      setShowDeleteAlert(false);
    },
    onError: (error: any) => {
      toast.error("Failed to delete user: " + error.message);
    },
  });

  const membershipMutation = useMutation({
    mutationFn: async ({ type, days }: { type: string; days: number }) => {
      if (!user) return;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      if (membership) {
        // Update existing membership
        const { error } = await supabase
          .from("user_memberships")
          .update({
            membership_type: type,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq("id", membership.id);

        if (error) throw error;
      } else {
        // Create new membership
        const { error } = await supabase
          .from("user_memberships")
          .insert({
            user_id: user.id,
            membership_type: type,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchMembership();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Membership updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update membership: " + error.message);
    },
  });

  const cancelMembershipMutation = useMutation({
    mutationFn: async () => {
      if (!membership) return;

      const { error } = await supabase
        .from("user_memberships")
        .update({ status: "cancelled" })
        .eq("id", membership.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchMembership();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Membership cancelled");
    },
    onError: (error: any) => {
      toast.error("Failed to cancel membership: " + error.message);
    },
  });

  const onSubmit = (data: UserFormData) => {
    updateMutation.mutate(data);
  };

  const handleMembershipUpdate = () => {
    if (!membershipType) {
      toast.error("Please select a membership type");
      return;
    }
    membershipMutation.mutate({ type: membershipType, days: parseInt(membershipDays) });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit User
              {user?.role === "admin" && <Crown className="h-4 w-4 text-yellow-500" />}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile & Role</TabsTrigger>
              <TabsTrigger value="membership">Membership</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={user?.id || ""}
                    disabled
                    className="bg-muted font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...register("username")}
                    placeholder="Enter username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet_balance">Wallet Balance ($)</Label>
                  <Input
                    id="wallet_balance"
                    type="number"
                    step="0.01"
                    {...register("wallet_balance", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setValue("role", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between gap-2 pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteAlert(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="membership" className="space-y-4 mt-4">
              {membership && membership.status === "active" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Current Membership</span>
                      <Badge variant="default" className="bg-green-600">
                        {membership.membership_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Started: {format(new Date(membership.started_at), "MMM dd, yyyy")}</p>
                      {membership.expires_at && (
                        <p>Expires: {format(new Date(membership.expires_at), "MMM dd, yyyy")}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => cancelMembershipMutation.mutate()}
                    disabled={cancelMembershipMutation.isPending}
                  >
                    Cancel Membership
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-lg border bg-muted/50 text-center">
                  <p className="text-muted-foreground">No active membership</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Set/Update Membership</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Membership Type</Label>
                    <Select value={membershipType} onValueChange={setMembershipType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select membership" />
                      </SelectTrigger>
                      <SelectContent>
                        {membershipPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.name}>
                            {plan.name} - ${plan.price}/{plan.duration} {plan.duration_unit}
                          </SelectItem>
                        ))}
                        <SelectItem value="Premium">Premium (Custom)</SelectItem>
                        <SelectItem value="VIP">VIP (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Select value={membershipDays} onValueChange={setMembershipDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">365 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleMembershipUpdate}
                    disabled={membershipMutation.isPending}
                  >
                    {membershipMutation.isPending ? "Updating..." : "Update Membership"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All user data including their profile, membership, and roles will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
