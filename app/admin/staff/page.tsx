"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Shield,
  Loader2,
  UserPlus,
  Trash2,
  Search,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const ALL_PERMISSIONS = [
  { key: "products", label: "Products", description: "Manage products, categories, and inventory" },
  { key: "orders", label: "Orders", description: "View and manage orders, fulfillments, refunds, and returns" },
  { key: "customers", label: "Customers", description: "View and manage customer accounts" },
  { key: "discounts", label: "Discounts", description: "Manage discounts, coupons, and auto-discounts" },
  { key: "content", label: "Content", description: "Manage pages and email templates" },
  { key: "settings", label: "Settings", description: "Manage store settings and shipping zones" },
  { key: "analytics", label: "Analytics", description: "View dashboard and analytics" },
  { key: "import_export", label: "Import / Export", description: "Import and export data" },
];

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  createdAt: string;
  permissions: string[];
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function StaffPage() {
  const { data: session } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add staff dialog
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);

  // Edit permissions dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error();
      setStaff(await res.json());
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Filter out existing staff/admin
      const customers = (data.customers || data).filter(
        (u: SearchUser) => u.role === "CUSTOMER"
      );
      setSearchResults(customers);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handlePromote() {
    if (!selectedUser) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          permissions: selectedPermissions,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selectedUser.name || selectedUser.email} promoted to staff`);
      setAddOpen(false);
      setSelectedUser(null);
      setSelectedPermissions([]);
      setSearchQuery("");
      setSearchResults([]);
      fetchStaff();
    } catch {
      toast.error("Failed to promote user");
    } finally {
      setPromoting(false);
    }
  }

  async function handleSavePermissions() {
    if (!editingStaff) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingStaff.id,
          permissions: editPermissions,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Permissions updated");
      setEditOpen(false);
      fetchStaff();
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemoveStaff(userId: string, name: string | null) {
    if (!confirm(`Remove ${name || "this user"} from staff?`)) return;
    try {
      const res = await fetch(`/api/staff?userId=${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Staff member removed");
      fetchStaff();
    } catch {
      toast.error("Failed to remove staff");
    }
  }

  function togglePermission(permissions: string[], setPerms: (p: string[]) => void, key: string) {
    setPerms(
      permissions.includes(key)
        ? permissions.filter((p) => p !== key)
        : [...permissions, key]
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff members and their permissions
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Staff list */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members ({staff.length})</CardTitle>
          <CardDescription>
            Staff members can access the admin panel with limited permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No staff members yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a customer as staff to give them admin panel access
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{member.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.permissions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No permissions</span>
                        ) : member.permissions.length === ALL_PERMISSIONS.length ? (
                          <Badge variant="default" className="text-xs">All Permissions</Badge>
                        ) : (
                          member.permissions.map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {ALL_PERMISSIONS.find((ap) => ap.key === p)?.label || p}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingStaff(member);
                            setEditPermissions([...member.permissions]);
                            setEditOpen(true);
                          }}
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveStaff(member.id, member.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>

          {!selectedUser ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers by name or email..."
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={searching} variant="outline" size="icon">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left"
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                        {user.name?.[0] || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No customers found
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold">
                  {selectedUser.name?.[0] || "?"}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedUser.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2 border rounded-lg p-3">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm.key} className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={selectedPermissions.includes(perm.key)}
                        onCheckedChange={() =>
                          togglePermission(selectedPermissions, setSelectedPermissions, perm.key)
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddOpen(false);
              setSelectedUser(null);
              setSelectedPermissions([]);
              setSearchQuery("");
              setSearchResults([]);
            }}>
              Cancel
            </Button>
            {selectedUser && (
              <Button onClick={handlePromote} disabled={promoting}>
                {promoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add as Staff
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions — {editingStaff?.name || editingStaff?.email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 border rounded-lg p-3">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm.key} className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={editPermissions.includes(perm.key)}
                  onCheckedChange={() =>
                    togglePermission(editPermissions, setEditPermissions, perm.key)
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{perm.label}</p>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditPermissions(ALL_PERMISSIONS.map((p) => p.key))}
            >
              <Check className="mr-1 h-3.5 w-3.5" /> Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditPermissions([])}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Clear All
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
