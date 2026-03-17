"use client";

import { useTranslations } from "next-intl";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  { value: "BOGO", icon: "🎁" },
  { value: "BUY_X_GET_Y", icon: "🛒" },
  { value: "SPEND_X_GET_Y", icon: "💰" },
  { value: "PERCENTAGE_OFF", icon: "%" },
  { value: "FIXED_OFF", icon: "💵" },
];

const REWARD_TYPES = [
  { value: "PERCENTAGE" },
  { value: "FIXED_AMOUNT" },
  { value: "FREE_ITEM" },
];

export default function AutoDiscountsPage() {
  const t = useTranslations("admin.autoDiscounts");
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
      toast.error(t("toasts.loadFailed"));
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
    if (!form.name.trim()) { toast.error(t("toasts.nameRequired")); return; }

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

      toast.success(editingDiscount ? t("toasts.updated") : t("toasts.created"));
      setDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toasts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: AutoDiscount) => {
    if (!confirm(t("deleteConfirm", { name: d.name }))) return;
    try {
      const res = await fetch(`/api/auto-discounts?id=${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("toasts.deleted"));
      fetchDiscounts();
    } catch {
      toast.error(t("toasts.deleteFailed"));
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
      toast.success(`${t(`statusBadges.${newStatus === "ACTIVE" ? "active" : "disabled"}`)}`);
      fetchDiscounts();
    } catch {
      toast.error(t("toasts.statusFailed"));
    }
  };

  const typeInfo = (type: string) => DISCOUNT_TYPES.find(dt => dt.value === type);

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge>{t("statusBadges.active")}</Badge>;
      case "SCHEDULED": return <Badge variant="outline" className="border-blue-500 text-blue-500">{t("statusBadges.scheduled")}</Badge>;
      case "EXPIRED": return <Badge variant="secondary">{t("statusBadges.expired")}</Badge>;
      case "DISABLED": return <Badge variant="secondary">{t("statusBadges.disabled")}</Badge>;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80 mt-2" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Card><CardContent className="pt-6"><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[25%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[15%]" /></div>))}</div></CardContent></Card>
      </div>
    );
  }

  const activeCount = discounts.filter(d => d.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t("createDiscount")}
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
                <p className="text-xs text-muted-foreground">{t("totalDiscounts")}</p>
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
                <p className="text-xs text-muted-foreground">{t("activeNow")}</p>
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
                <p className="text-xs text-muted-foreground">{t("totalUses")}</p>
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
                <TableHead>{t("tableHead.discount")}</TableHead>
                <TableHead>{t("tableHead.type")}</TableHead>
                <TableHead>{t("tableHead.description")}</TableHead>
                <TableHead>{t("tableHead.usage")}</TableHead>
                <TableHead>{t("tableHead.status")}</TableHead>
                <TableHead className="w-24">{t("tableHead.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{t("priority")}: {d.priority}{d.combinesWith ? ` · ${t("stackable")}` : ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeInfo(d.type)?.icon} {t(`discountTypes.${d.type}`)}
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
                    <p className="text-muted-foreground">{t("noAutoDiscountsEmpty")}</p>
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
            <DialogTitle>{editingDiscount ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Name & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("dialog.discountName")}</Label>
                <Input placeholder={t("dialog.discountNamePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("dialog.type")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map(dt => (
                      <SelectItem key={dt.value} value={dt.value}>{dt.icon} {t(`discountTypes.${dt.value}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> {t("dialog.conditions")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(form.type === "BOGO" || form.type === "BUY_X_GET_Y" || form.type === "PERCENTAGE_OFF") && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t("dialog.minQuantity")}</Label>
                    <Input type="number" min="1" placeholder="e.g., 2" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} />
                  </div>
                )}
                {(form.type === "SPEND_X_GET_Y" || form.type === "FIXED_OFF" || form.type === "PERCENTAGE_OFF") && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t("dialog.minOrderAmount")}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="e.g., 200" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Reward */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Tag className="h-4 w-4" /> {t("dialog.reward")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.discountType")}</Label>
                  <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map(rt => (
                        <SelectItem key={rt.value} value={rt.value}>{t(`rewardTypes.${rt.value}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.discountType !== "FREE_ITEM" && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t("dialog.discountValue")}</Label>
                    <Input type="number" min="0" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} />
                  </div>
                )}
                {(form.type === "BOGO" || form.type === "BUY_X_GET_Y") && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t("dialog.freeDiscountedQty")}</Label>
                    <Input type="number" min="1" placeholder="e.g., 1" value={form.getQuantity} onChange={(e) => setForm({ ...form, getQuantity: e.target.value })} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Limits & Scheduling */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> {t("dialog.limitsSchedule")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.maxTotalUses")}</Label>
                  <Input type="number" min="1" placeholder={t("dialog.unlimited")} value={form.maxUsesTotal} onChange={(e) => setForm({ ...form, maxUsesTotal: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.maxUsesPerCustomer")}</Label>
                  <Input type="number" min="1" placeholder={t("dialog.unlimited")} value={form.maxUsesPerCustomer} onChange={(e) => setForm({ ...form, maxUsesPerCustomer: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.startsAt")}</Label>
                  <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.expiresAt")}</Label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Advanced */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> {t("dialog.advanced")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.priorityLabel")}</Label>
                  <Input type="number" min="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("dialog.statusLabel")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{t("statusBadges.active")}</SelectItem>
                      <SelectItem value="SCHEDULED">{t("statusBadges.scheduled")}</SelectItem>
                      <SelectItem value="DISABLED">{t("statusBadges.disabled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.combinesWith} onCheckedChange={(v) => setForm({ ...form, combinesWith: v })} />
                <Label className="text-sm">{t("dialog.combineWithOthers")}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("dialog.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDiscount ? t("dialog.updateDiscount") : t("dialog.createDiscount")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
