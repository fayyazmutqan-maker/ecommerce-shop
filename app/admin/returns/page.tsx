"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDateTime, getStatusColor } from "@/lib/helpers";

interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  status: string;
  reason: string;
  customerNotes: string | null;
  adminNotes: string | null;
  action: string;
  trackingNumber: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    email: string;
    user?: { id: string; name: string | null; email: string } | null;
  };
  items: {
    id: string;
    quantity: number;
    reason: string | null;
    condition: string | null;
    orderItem: { id: string; name: string; sku: string | null; quantity: number; price: number };
  }[];
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  async function fetchReturns() {
    try {
      const res = await fetch("/api/returns");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReturns(data);
    } catch {
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  }

  function openDetail(r: ReturnRequest) {
    setSelected(r);
    setNewStatus(r.status);
    setAdminNotes(r.adminNotes || "");
    setDialogOpen(true);
  }

  async function handleUpdate() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/returns/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus !== selected.status ? newStatus : undefined,
          adminNotes: adminNotes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Return updated");
      setDialogOpen(false);
      setLoading(true);
      await fetchReturns();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update return");
    } finally {
      setSaving(false);
    }
  }

  const filtered = returns.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.returnNumber.toLowerCase().includes(q) ||
        r.order.orderNumber.toLowerCase().includes(q) ||
        r.order.email.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-48 mt-2" /></div>
        <Card><CardContent className="pt-6"><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[10%]" /></div>))}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Returns</h1>
        <p className="text-muted-foreground">{returns.length} total return requests</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search returns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <RotateCcw className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No return requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(r)}
                  >
                    <TableCell className="font-medium">{r.returnNumber}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${r.orderId}`}
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.order.user?.name || r.order.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                      {r.reason}
                    </TableCell>
                    <TableCell>{r.items.length}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return {selected?.returnNumber}</DialogTitle>
            <DialogDescription>
              Order: {selected?.order.orderNumber} — {selected?.order.email}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="text-sm">{selected.reason}</p>
              </div>
              {selected.customerNotes && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Customer Notes</Label>
                  <p className="text-sm">{selected.customerNotes}</p>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Items</Label>
                <div className="border rounded-md divide-y">
                  {selected.items.map((item) => (
                    <div key={item.id} className="p-2 text-sm flex justify-between">
                      <div>
                        <p className="font-medium">{item.orderItem.name}</p>
                        {item.condition && (
                          <p className="text-xs text-muted-foreground">Condition: {item.condition}</p>
                        )}
                        {item.reason && (
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["REQUESTED", "APPROVED", "RECEIVED", "COMPLETED", "REJECTED"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
