"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string | Date | null;
  expiresAt: string | Date | null;
};

function DiscountForm({
  coupon,
  onClose,
}: {
  coupon?: Coupon;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(coupon?.code || "");
  const [type, setType] = useState(coupon?.type || "PERCENTAGE");
  const [value, setValue] = useState(coupon?.value ?? 10);
  const [minOrderAmount, setMinOrderAmount] = useState(coupon?.minOrderAmount ?? 0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(coupon?.maxDiscountAmount ?? 0);
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit ?? 0);
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [expiresAt, setExpiresAt] = useState(() => {
    if (coupon?.expiresAt) {
      const d = new Date(coupon.expiresAt);
      return d.toISOString().split("T")[0];
    }
    return "";
  });

  const isEdit = !!coupon;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Discount code is required");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        code: code.trim().toUpperCase(),
        type,
        value,
        isActive,
        minOrderAmount: minOrderAmount || null,
        maxDiscountAmount: maxDiscountAmount || null,
        usageLimit: usageLimit || null,
        expiresAt: expiresAt || null,
      };

      if (isEdit) body.id = coupon.id;

      const res = await fetch("/api/discounts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save discount");
        return;
      }

      toast.success(isEdit ? "Discount updated" : "Discount created");
      onClose();
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER20" className="font-mono uppercase" required />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {type !== "FREE_SHIPPING" && (
        <div className="space-y-2">
          <Label htmlFor="value">Value {type === "PERCENTAGE" ? "(%)" : "(SAR)"}</Label>
          <Input id="value" type="number" step="0.01" min="0" max={type === "PERCENTAGE" ? 100 : undefined} value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minOrder">Min Order (SAR)</Label>
          <Input id="minOrder" type="number" step="0.01" min="0" value={minOrderAmount} onChange={(e) => setMinOrderAmount(Number(e.target.value))} />
        </div>
        {type === "PERCENTAGE" && (
          <div className="space-y-2">
            <Label htmlFor="maxDiscount">Max Discount (SAR)</Label>
            <Input id="maxDiscount" type="number" step="0.01" min="0" value={maxDiscountAmount} onChange={(e) => setMaxDiscountAmount(Number(e.target.value))} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usageLimit">Usage Limit (0 = unlimited)</Label>
          <Input id="usageLimit" type="number" min="0" value={usageLimit} onChange={(e) => setUsageLimit(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expires At</Label>
          <Input id="expiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Active</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
      </DialogFooter>
    </form>
  );
}

export function DiscountCreateButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Discount
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Discount</DialogTitle>
          <DialogDescription>Add a new discount code for your store.</DialogDescription>
        </DialogHeader>
        <DiscountForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DiscountEditButton({ coupon }: { coupon: Coupon }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Discount</DialogTitle>
          <DialogDescription>Update discount code details.</DialogDescription>
        </DialogHeader>
        <DiscountForm coupon={coupon} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DiscountDeleteButton({ couponId, code }: { couponId: string; code: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete discount code "${code}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/discounts?id=${couponId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Discount deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete discount");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
