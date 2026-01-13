import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Shield, Pencil, UserPlus, User, Mail } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { AddUserDialog } from "@/components/admin/AddUserDialog";

interface UserWithRole {
  id: string;
  email: string | null;
  username: string | null;
  wallet_balance: number;
  updated_at: string;
  created_at: string;
  profile_image: string | null;
  role: string;
}

const Users = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<UserWithRole[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Use the admin function to get users with emails
      const { data: usersData, error: usersError } = await supabase
        .rpc("get_users_for_admin");

      if (usersError) throw usersError;

      // Get roles for all users
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      return usersData?.map((user: any) => {
        const userRole = rolesData?.find((r) => r.user_id === user.id);

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          wallet_balance: user.wallet_balance || 0,
          updated_at: user.updated_at || "",
          created_at: user.created_at || "",
          profile_image: user.profile_image,
          role: userRole?.role || "user",
        };
      }) || [];
    },
  });

  const filteredUsers = users.filter((user) =>
    user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingUser(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and memberships
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, username, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="outline" className="px-3 py-1">
                {filteredUsers.length} users
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {user.profile_image ? (
                              <img
                                src={user.profile_image}
                                alt={user.username || "User"}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {user.username || "Anonymous"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {user.id.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.email || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : user.role === "moderator" ? "secondary" : "outline"}
                          >
                            {user.role === "admin" && (
                              <Shield className="h-3 w-3 mr-1" />
                            )}
                            {user.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${user.wallet_balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.created_at ? format(new Date(user.created_at), "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <UserEditDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        user={editingUser}
      />

      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </AdminLayout>
  );
};

export default Users;
