"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Zap,
  Tag,
  Loader2,
  Calendar,
  Users,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

interface AutoDiscount {
  id: string;
  name: string;
  type: string;
  status: string;
  priority: number;
  combinesWith: boolean;
  minQuantity?: number | null;
  minOrderAmount?: number | null;
  buyProductIds: string[];
  buyCategoryIds: string[];
  customerIds: string[];
  discountType: string;
  discountValue: number;
  getQuantity?: number | null;
  getProductIds: string[];
  getCategoryIds: string[];
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  usedCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

const DISCOUNT_TYPES = [
  { value: "BOGO", label: "Buy One Get One (BOGO)", icon: "🎁" },
  { value: "BUY_X_GET_Y", label: "Buy X Get Y", icon: "🛒" },
  { value: "SPEND_X_GET_Y", label: "Spend X Get Y", icon: "💰" },
  { value: "PERCENTAGE_OFF", label: "Percentage Off", icon: "%" },
  { value: "FIXED_OFF", label: "Fixed Amount Off", icon: "💵" },
];

const REWARD_TYPES = [
  { value: "PERCENTAGE", label: "Percentage %" },
  { value: "FIXED_AMOUNT", label: "Fixed Amount (SAR)" },
  { value: "FREE_ITEM", label: "Free Item" },
];

export default function AutoDiscountsPage() {
  const [discounts, setDiscounts] = useState<AutoDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<AutoDiscount | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    type: "BOGO" as string,
    status: "ACTIVE" as string,
    priority: 0,
    combinesWith: false,
    minQuantity: "" as string | number,
    minOrderAmount: "" as string | number,
    discountType: "FREE_ITEM" as string,
    discountValue: 0,
    getQuantity: "" as string | number,
    maxUsesTotal: "" as string | number,
    maxUsesPerCustomer: "" as string | number,
    startsAt: "",
    expiresAt: "",
  });

  const fetchDiscounts = useCallback(async () => {
    try {
      const res = await fetch("/api/auto-discounts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load auto discounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

  const resetForm = () => {
    setForm({
      name: "", type: "BOGO", status: "ACTIVE", priority: 0, combinesWith: false,
      minQuantity: "", minOrderAmount: "", discountType: "FREE_ITEM", discountValue: 0,
      getQuantity: "", maxUsesTotal: "", maxUsesPerCustomer: "", startsAt: "", expiresAt: "",
    });
    setEditingDiscount(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (d: AutoDiscount) => {
    setEditingDiscount(d);
    setForm({
      name: d.name,
      type: d.type,
      status: d.status,
      priority: d.priority,
      combinesWith: d.combinesWith,
      minQuantity: d.minQuantity ?? "",
      minOrderAmount: d.minOrderAmount ?? "",
      discountType: d.discountType,
      discountValue: d.discountValue,
      getQuantity: d.getQuantity ?? "",
      maxUsesTotal: d.maxUsesTotal ?? "",
      maxUsesPerCustomer: d.maxUsesPerCustomer ?? "",
      startsAt: d.startsAt ? new Date(d.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    setSaving(true);
    try {
      const body = {
        ...(editingDiscount ? { id: editingDiscount.id } : {}),
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        priority: form.priority,
        combinesWith: form.combinesWith,
        minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        discountType: form.discountType,
        discountValue: form.discountValue,
        getQuantity: form.getQuantity ? Number(form.getQuantity) : null,
        maxUsesTotal: form.maxUsesTotal ? Number(form.maxUsesTotal) : null,
        maxUsesPerCustomer: form.maxUsesPerCustomer ? Number(form.maxUsesPerCustomer) : null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      };

      const res = await fetch("/api/auto-discounts", {
        method: editingDiscount ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(editingDiscount ? "Auto discount updated" : "Auto discount created");
      setDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: AutoDiscount) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    try {
      const res = await fetch(`/api/auto-discounts?id=${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Auto discount deleted");
      fetchDiscounts();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggleStatus = async (d: AutoDiscount) => {
    const newStatus = d.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await fetch("/api/auto-discounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Discount ${newStatus === "ACTIVE" ? "enabled" : "disabled"}`);
      fetchDiscounts();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const typeInfo = (type: string) => DISCOUNT_TYPES.find(t => t.value === type);

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge>Active</Badge>;
      case "SCHEDULED": return <Badge variant="outline" className="border-blue-500 text-blue-500">Scheduled</Badge>;
      case "EXPIRED": return <Badge variant="secondary">Expired</Badge>;
      case "DISABLED": return <Badge variant="secondary">Disabled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const discountDescription = (d: AutoDiscount) => {
    switch (d.type) {
      case "BOGO": return `Buy ${d.minQuantity || 2}, get ${d.getQuantity || 1} free`;
      case "BUY_X_GET_Y": return `Buy ${d.minQuantity || 1} items, get ${d.getQuantity || 1} at ${d.discountType === "FREE_ITEM" ? "free" : d.discountType === "PERCENTAGE" ? `${d.discountValue}% off` : `SAR ${d.discountValue} off`}`;
      case "SPEND_X_GET_Y": return `Spend SAR ${d.minOrderAmount || 0}+, get ${d.discountType === "PERCENTAGE" ? `${d.discountValue}%` : `SAR ${d.discountValue}`} off`;
      case "PERCENTAGE_OFF": return `${d.discountValue}% off${d.minOrderAmount ? ` on orders over SAR ${d.minOrderAmount}` : ""}`;
      case "FIXED_OFF": return `SAR ${d.discountValue} off${d.minOrderAmount ? ` on orders over SAR ${d.minOrderAmount}` : ""}`;
      default: return d.name;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = discounts.filter(d => d.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatic Discounts</h1>
          <p className="text-muted-foreground">BOGO, Buy X Get Y, and auto-applied promotions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Create Discount
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{discounts.length}</p>
                <p className="text-xs text-muted-foreground">Total Discounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{discounts.reduce((s, d) => s + d.usedCount, 0)}</p>
                <p className="text-xs text-muted-foreground">Total Uses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">Priority: {d.priority}{d.combinesWith ? " · Stackable" : ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeInfo(d.type)?.icon} {typeInfo(d.type)?.label || d.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {discountDescription(d)}
                  </TableCell>
                  <TableCell>
                    {d.usedCount}{d.maxUsesTotal ? ` / ${d.maxUsesTotal}` : ""}
                  </TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleStatus(d)}>
                        <Zap className={`h-4 w-4 ${d.status === "ACTIVE" ? "text-green-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {discounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Zap className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground">No automatic discounts yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDiscount ? "Edit Auto Discount" : "Create Auto Discount"}</DialogTitle>
            <DialogDescription>
              Automatic discounts are applied at checkout without a code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Name & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Name</Label>
                <Input placeholder="e.g., Summer BOGO" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Conditions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(form.type === "BOGO" || form.type === "BUY_X_GET_Y" || form.type === "PERCENTAGE_OFF") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Minimum Quantity</Label>
                    <Input type="number" min="1" placeholder="e.g., 2" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
                  </div>
                )}
                {(form.type === "SPEND_X_GET_Y" || form.type === "FIXED_OFF" || form.type === "PERCENTAGE_OFF") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Minimum Order Amount (SAR)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="e.g., 200" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Reward */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Tag className="h-4 w-4" /> Reward</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Discount Type</Label>
                  <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.discountType !== "FREE_ITEM" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Discount Value</Label>
                    <Input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
                {(form.type === "BOGO" || form.type === "BUY_X_GET_Y") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Free/Discounted Qty</Label>
                    <Input type="number" min="1" placeholder="e.g., 1" value={form.getQuantity} onChange={(e) => setForm({ ...form, getQuantity: e.target.value })} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Limits & Scheduling */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Limits & Schedule</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Max Total Uses</Label>
                  <Input type="number" min="1" placeholder="Unlimited" value={form.maxUsesTotal} onChange={(e) => setForm({ ...form, maxUsesTotal: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Max Uses Per Customer</Label>
                  <Input type="number" min="1" placeholder="Unlimited" value={form.maxUsesPerCustomer} onChange={(e) => setForm({ ...form, maxUsesPerCustomer: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Starts At</Label>
                  <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Expires At</Label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Advanced */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Advanced</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Priority (higher = applied first)</Label>
                  <Input type="number" min="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.combinesWith} onCheckedChange={(v) => setForm({ ...form, combinesWith: v })} />
                <Label className="text-sm">Can combine with other discounts</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDiscount ? "Update Discount" : "Create Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
