import { useEffect, useState } from "react";
import { Users as UsersIcon, MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Skeleton } from "../ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";
import { adminListUsers, adminUpdateUser } from "../../lib/api"; 

/**
 * ADMIN USERS SCREEN
 * 
 * API Endpoints:
 * 
 * 1. List All Users: GET /admin/users
 *    Headers: Authorization: Bearer <access_token>
 *    Note: Requires admin role
 *    Response:
 *    [
 *      {
 *        "id": 1,
 *        "email": "user@example.com",
 *        "email_verified": true,
 *        "is_admin": false,
 *        "is_active": true,
 *        "created_at": "2024-01-01T00:00:00Z"
 *      }
 *    ]
 * 
 * 2. Update User Flags: PATCH /admin/users/{user_id}
 *    Headers: Authorization: Bearer <access_token>
 *    Query Parameters (optional, use true/false):
 *      ?make_admin=true        - Grant/revoke admin role
 *      &verify_email=true      - Verify/unverify email
 *      &deactivate=true        - Activate/deactivate user
 *    
 *    Example: PATCH /admin/users/5?make_admin=true&verify_email=true
 * 
 * Error Handling:
 * - 401: Unauthorized
 * - 403: Forbidden (not admin)
 * - 404: User not found
 * - 500: Server error
 */

interface User {
  id: number;
  email: string;
  email_verified: boolean;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

// Data will be loaded from API

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    is_admin: false,
    email_verified: false,
    is_active: true,
  });

  const openEditDrawer = (user: User) => {
    setSelectedUser(user);
    setFormData({
      is_admin: user.is_admin,
      email_verified: user.email_verified,
      is_active: user.is_active,
    });
    setDrawerOpen(true);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await adminListUsers();
        setUsers(data as any);
      } catch (err: any) {
        const msg = err?.data?.detail || err?.message || "Failed to load users";
        toast.error(String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const changes: any = {};
      if (formData.is_admin !== selectedUser.is_admin) {
        changes.make_admin = formData.is_admin;
      }
      if (formData.email_verified !== selectedUser.email_verified) {
        changes.verify_email = formData.email_verified;
      }
      if (formData.is_active !== selectedUser.is_active) {
        // API expects 'deactivate' meaning set is_active = not deactivate
        changes.deactivate = !formData.is_active;
      }
      const updated = await adminUpdateUser(selectedUser.id, changes);
      setUsers(users.map((u) => (u.id === selectedUser.id ? (updated as any) : u)));
      setDrawerOpen(false);
      setSelectedUser(null);
      toast.success("User updated successfully");
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || "Failed to update user";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 lg:pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UsersIcon className="w-8 h-8 text-primary" />
          <h1 className="text-text-900">User Management</h1>
        </div>
        <p className="text-text-600">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      {/* Users Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Email Verified</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && users.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.email_verified ? "default" : "secondary"}
                      className={
                        user.email_verified
                          ? "bg-success-500/10 text-success-500 hover:bg-success-500/20"
                          : "bg-warning-500/10 text-warning-500 hover:bg-warning-500/20"
                      }
                    >
                      {user.email_verified ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_admin ? "default" : "secondary"}>
                      {user.is_admin ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.is_active ? "default" : "secondary"}
                      className={
                        user.is_active
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-muted text-text-600"
                      }
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDrawer(user)}>
                          Edit Flags
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Users List - Mobile */}
      <div className="md:hidden space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-text-900">{user.email}</p>
                <p className="text-sm text-text-600">ID: {user.id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDrawer(user)}
              >
                Edit
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge
                variant={user.email_verified ? "default" : "secondary"}
                className={
                  user.email_verified
                    ? "bg-success-500/10 text-success-500"
                    : "bg-warning-500/10 text-warning-500"
                }
              >
                {user.email_verified ? "Verified" : "Unverified"}
              </Badge>
              <Badge variant={user.is_admin ? "default" : "secondary"}>
                {user.is_admin ? "Admin" : "User"}
              </Badge>
              <Badge
                variant={user.is_active ? "default" : "secondary"}
                className={
                  user.is_active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-text-600"
                }
              >
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-xs text-text-600">
              Created: {formatDate(user.created_at)}
            </p>
          </Card>
        ))}
      </div>

      {/* Edit User Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit User Flags</SheetTitle>
            <SheetDescription>
              Update user permissions and status for{" "}
              <strong>{selectedUser?.email}</strong>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Admin Role */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Admin Role</Label>
                <p className="text-sm text-text-600">
                  Grant or revoke admin privileges
                </p>
              </div>
              <Switch
                checked={formData.is_admin}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_admin: checked })
                }
              />
            </div>

            {/* Email Verified */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Verified</Label>
                <p className="text-sm text-text-600">
                  Manually verify user's email
                </p>
              </div>
              <Switch
                checked={formData.email_verified}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, email_verified: checked })
                }
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-text-600">
                  Activate or deactivate user account
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary-600"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>

          {/* API Documentation */}
          <div className="mt-6 p-4 bg-muted rounded-lg text-xs text-text-600">
            <p className="font-medium mb-1">API Endpoint:</p>
            <code className="block break-all">
              PATCH /admin/users/{"{user_id}"}?make_admin=...&verify_email=...&deactivate=...
            </code>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
