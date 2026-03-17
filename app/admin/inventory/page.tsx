"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Package,
  Search,
  AlertTriangle,
  Save,
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
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface InventoryItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  status: string;
  variants: {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
  }[];
}

export default function InventoryPage() {
  const t = useTranslations("admin.inventory");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/products?admin=true&limit=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const products = data.products || data;
      setItems(
        products.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          quantity: p.quantity ?? 0,
          lowStockThreshold: p.lowStockThreshold ?? 5,
          trackInventory: p.trackInventory ?? true,
          status: p.status,
          variants: (p.variants as Record<string, unknown>[] || []).map(
            (v: Record<string, unknown>) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              quantity: v.quantity ?? 0,
            })
          ),
        }))
      );
    } catch {
      toast.error(t("failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  function setAdjustment(key: string, value: number) {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveAdjustments() {
    setSaving(true);
    try {
      const entries = Object.entries(adjustments).filter(([, v]) => v !== 0);
      if (entries.length === 0) {
        toast.info(t("noAdjustments"));
        setSaving(false);
        return;
      }

      for (const [key, adj] of entries) {
        const [type, id] = key.split(":");
        const isVariant = type === "variant";
        const url = isVariant
          ? `/api/products/inventory?variantId=${id}`
          : `/api/products/inventory?productId=${id}`;

        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adjustment: adj }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save");
        }
      }

      toast.success(t("adjustmentsSaved", { count: entries.length }));
      setAdjustments({});
      setLoading(true);
      await fetchInventory();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("failedSave"));
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "LOW_STOCK") {
        const isLow = item.trackInventory && item.quantity <= item.lowStockThreshold;
        const hasLowVariant = item.variants.some(
          (v) => v.quantity <= item.lowStockThreshold
        );
        if (!isLow && !hasLowVariant) return false;
      }
      if (filter === "OUT_OF_STOCK") {
        const isOut = item.trackInventory && item.quantity === 0;
        const hasOutVariant = item.variants.some((v) => v.quantity === 0);
        if (!isOut && !hasOutVariant) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.sku?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [items, filter, search]);

  const lowStockCount = items.filter(
    (i) => i.trackInventory && i.quantity > 0 && i.quantity <= i.lowStockThreshold
  ).length;
  const outOfStockCount = items.filter(
    (i) => i.trackInventory && i.quantity === 0
  ).length;
  const hasAdjustments = Object.values(adjustments).some((v) => v !== 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-32 mt-2" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-24 mt-1" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[30%]" /><Skeleton className="h-4 w-[10%]" /><Skeleton className="h-4 w-[10%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /></div>))}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle", { count: items.length })}</p>
        </div>
        {hasAdjustments && (
          <Button onClick={handleSaveAdjustments} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t("saveAdjustments")}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-xs text-muted-foreground">{t("totalProducts")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground">{t("lowStock")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                <p className="text-xs text-muted-foreground">{t("outOfStock")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchInventory")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allItems")}</SelectItem>
                <SelectItem value="LOW_STOCK">{t("lowStock")}</SelectItem>
                <SelectItem value="OUT_OF_STOCK">{t("outOfStock")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("sku")}</TableHead>
                <TableHead className="text-center">{t("current")}</TableHead>
                <TableHead className="text-center">{t("adjust")}</TableHead>
                <TableHead className="text-center">{t("newQty")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const hasVariants = item.variants.length > 0;
                const adjKey = `product:${item.id}`;
                const adj = adjustments[adjKey] || 0;

                return (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <Link
                        href={`/admin/products/${item.slug}`}
                        className="font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      {hasVariants && (
                        <p className="text-xs text-muted-foreground">{t("variants", { count: item.variants.length })}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {item.sku || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {!hasVariants ? (
                        <span className={item.quantity === 0 ? "text-red-600 font-semibold" : item.quantity <= item.lowStockThreshold ? "text-yellow-600 font-semibold" : ""}>
                          {item.quantity}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!hasVariants && item.trackInventory ? (
                        <Input
                          type="number"
                          value={adj}
                          onChange={(e) => setAdjustment(adjKey, parseInt(e.target.value) || 0)}
                          className="w-20 h-8 mx-auto text-center"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!hasVariants && item.trackInventory ? (
                        <span className={item.quantity + adj < 0 ? "text-red-600" : ""}>
                          {item.quantity + adj}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {!item.trackInventory ? (
                        <Badge variant="outline">{t("notTracked")}</Badge>
                      ) : item.quantity === 0 ? (
                        <Badge variant="destructive">{t("outOfStock")}</Badge>
                      ) : item.quantity <= item.lowStockThreshold ? (
                        <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">{t("lowStock")}</Badge>
                      ) : (
                        <Badge variant="default">{t("inStock")}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    {t("noProducts")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
