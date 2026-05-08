"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  CreditCard,
  Truck,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Copy,
  ExternalLink,
  RotateCcw,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/helpers";

interface Order {
  id: string;
  orderNumber: string;
  email: string;
  phone: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  source: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  zatcaStatus: string;
  zatcaReportedAt: string | null;
  zatcaInvoiceHash: string | null;
  user: { id: string; name: string | null; email: string } | null;
  items: OrderItem[];
  shippingAddress: OrderAddress | null;
  billingAddress: OrderAddress | null;
  transactions: Transaction[];
  timeline: TimelineEntry[];
}

interface OrderItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  totalPrice: number;
  variantName: string | null;
  product: { id: string; slug: string } | null;
}

interface OrderAddress {
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  createdAt: string;
}

interface TimelineEntry {
  id: string;
  title: string;
  message: string | null;
  type: string;
  createdAt: string;
}

interface Refund {
  id: string;
  amount: number;
  reason: string | null;
  status: string;
  type: string;
  restockItems: boolean;
  zatcaStatus: string;
  zatcaCreditNoteNumber: string | null;
  createdAt: string;
  items: { id: string; orderItemId: string; quantity: number; amount: number }[];
}

interface RefundResponse {
  refund?: Refund;
  order?: {
    id: string;
    status: string;
    paymentStatus: string;
    refundReason: string | null;
  };
}

interface Fulfillment {
  id: string;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  notes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: { id: string; orderItemId: string; quantity: number; orderItem: { name: string; sku: string | null } }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const t = useTranslations("admin.orderDetail");
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Refund state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundType, setRefundType] = useState<"FULL" | "PARTIAL">("PARTIAL");
  const [refundReason, setRefundReason] = useState("");
  const [refundRestock, setRefundRestock] = useState(true);
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundItems, setRefundItems] = useState<Record<string, { selected: boolean; quantity: number; amount: number }>>({});
  const [orderRefunds, setOrderRefunds] = useState<Refund[]>([]);

  // Fulfillment state
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillProcessing, setFulfillProcessing] = useState(false);
  const [fulfillTrackingNumber, setFulfillTrackingNumber] = useState("");
  const [fulfillTrackingUrl, setFulfillTrackingUrl] = useState("");
  const [fulfillCarrier, setFulfillCarrier] = useState("");
  const [fulfillNotes, setFulfillNotes] = useState("");
  const [fulfillItems, setFulfillItems] = useState<Record<string, { selected: boolean; quantity: number; max: number }>>({});
  const [orderFulfillments, setOrderFulfillments] = useState<Fulfillment[]>([]);

  // ZATCA state
  const [zatcaRetrying, setZatcaRetrying] = useState(false);

  const fetchOrder = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      setOrder(data);
      setStatus(data.status);
      setPaymentStatus(data.paymentStatus);
      setFulfillmentStatus(data.fulfillmentStatus);
      setTrackingNumber(data.trackingNumber || "");
      setNotes(data.notes || "");

      // Fetch refunds for this order
      const refundsRes = await fetch(`/api/refunds?orderId=${orderId}`, { cache: "no-store" });
      if (refundsRes.ok) {
        const refundsData = await refundsRes.json();
        setOrderRefunds(refundsData);
      }

      // Fetch fulfillments
      const fulfillRes = await fetch(`/api/fulfillments?orderId=${orderId}`, { cache: "no-store" });
      if (fulfillRes.ok) {
        const fulfillData = await fulfillRes.json();
        setOrderFulfillments(fulfillData);

        // Calculate remaining fulfillable quantities
        const fulfilledQty = new Map<string, number>();
        for (const f of fulfillData) {
          if (f.status === "CANCELLED") continue;
          for (const fi of f.items) {
            fulfilledQty.set(fi.orderItemId, (fulfilledQty.get(fi.orderItemId) || 0) + fi.quantity);
          }
        }
        const fItems: Record<string, { selected: boolean; quantity: number; max: number }> = {};
        for (const item of data.items) {
          const remaining = item.quantity - (fulfilledQty.get(item.id) || 0);
          if (remaining > 0) {
            fItems[item.id] = { selected: true, quantity: remaining, max: remaining };
          }
        }
        setFulfillItems(fItems);
      }

      // Initialize refund items
      const items: Record<string, { selected: boolean; quantity: number; amount: number }> = {};
      for (const item of data.items) {
        items[item.id] = { selected: false, quantity: item.quantity, amount: item.totalPrice };
      }
      setRefundItems(items);
    } catch {
      toast.error(t("toasts.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function handleSave() {
    if (isFullyRefunded) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
          fulfillmentStatus,
          trackingNumber: trackingNumber || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      const updated = await res.json();
      setOrder(updated);
      toast.success(t("toasts.updateSuccess"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("toasts.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t("toasts.copiedToClipboard"));
  }

  async function handleRefund() {
    if (!order) return;
    setRefundProcessing(true);
    try {
      const selectedItems = refundType === "PARTIAL"
        ? Object.entries(refundItems)
            .filter(([, v]) => v.selected)
            .map(([orderItemId, v]) => ({
              orderItemId,
              quantity: v.quantity,
              amount: v.amount,
            }))
        : undefined;

      if (refundType === "PARTIAL" && (!selectedItems || selectedItems.length === 0)) {
        toast.error(t("toasts.selectRefundItem"));
        setRefundProcessing(false);
        return;
      }

      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          type: refundType,
          reason: refundReason || undefined,
          restockItems: refundRestock,
          items: selectedItems,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process refund");
      }

      const result = await res.json() as RefundResponse;
      if (result.order) {
        setOrder((current) => current ? {
          ...current,
          status: result.order!.status,
          paymentStatus: result.order!.paymentStatus,
        } : current);
        setStatus(result.order.status);
        setPaymentStatus(result.order.paymentStatus);
      }
      if (result.refund) {
        setOrderRefunds((current) => [
          result.refund!,
          ...current.filter((refund) => refund.id !== result.refund!.id),
        ]);
      }

      toast.success(refundType === "FULL" ? t("toasts.fullRefundSuccess") : t("toasts.partialRefundSuccess"));
      setRefundOpen(false);
      setRefundReason("");
      setRefundType("PARTIAL");
      await fetchOrder();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("toasts.refundFailed"));
    } finally {
      setRefundProcessing(false);
    }
  }

  const totalRefunded = orderRefunds
    .filter((r) => r.status === "COMPLETED" || r.status === "APPROVED")
    .reduce((sum, r) => sum + r.amount, 0);

  const isFullyRefunded = order?.status === "REFUNDED" || order?.paymentStatus === "REFUNDED";
  const maxRefundable = order ? order.totalAmount - totalRefunded : 0;
  const canRefund = order && !isFullyRefunded && maxRefundable > 0;

  const selectedRefundTotal = refundType === "FULL"
    ? maxRefundable
    : Object.entries(refundItems)
        .filter(([, v]) => v.selected)
        .reduce((sum, [, v]) => sum + v.amount, 0);

  const hasUnfulfilled = Object.keys(fulfillItems).length > 0;

  async function handleFulfill() {
    if (!order || isFullyRefunded) return;
    setFulfillProcessing(true);
    try {
      const items = Object.entries(fulfillItems)
        .filter(([, v]) => v.selected && v.quantity > 0)
        .map(([orderItemId, v]) => ({ orderItemId, quantity: v.quantity }));

      if (items.length === 0) {
        toast.error(t("toasts.selectFulfillItem"));
        setFulfillProcessing(false);
        return;
      }

      const res = await fetch("/api/fulfillments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          trackingNumber: fulfillTrackingNumber || undefined,
          trackingUrl: fulfillTrackingUrl || undefined,
          carrier: fulfillCarrier || undefined,
          notes: fulfillNotes || undefined,
          items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create fulfillment");
      }

      toast.success(t("toasts.fulfillmentCreated"));
      setFulfillOpen(false);
      setFulfillTrackingNumber("");
      setFulfillTrackingUrl("");
      setFulfillCarrier("");
      setFulfillNotes("");
      setLoading(true);
      await fetchOrder();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("toasts.fulfillmentFailed"));
    } finally {
      setFulfillProcessing(false);
    }
  }

  async function handleZatcaRetry() {
    if (!order) return;
    setZatcaRetrying(true);
    try {
      const res = await fetch("/api/zatca/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ZATCA retry failed");
      if (data.success) {
        toast.success(t("toasts.zatcaInvoiceSuccess"));
      } else {
        toast.error(data.errors?.[0] || t("toasts.zatcaRetryFailed"));
      }
      await fetchOrder();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("toasts.zatcaRetryFailed"));
    } finally {
      setZatcaRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">{t("orderNotFound")}</p>
        <Button asChild variant="outline">
          <Link href="/admin/orders">{t("backToOrders")}</Link>
        </Button>
      </div>
    );
  }

  const hasChanges =
    status !== order.status ||
    paymentStatus !== order.paymentStatus ||
    fulfillmentStatus !== order.fulfillmentStatus ||
    trackingNumber !== (order.trackingNumber || "") ||
    notes !== (order.notes || "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
              {order.source === "POS" && (
                <Badge variant="outline">POS</Badge>
              )}
              {order.zatcaStatus && order.zatcaStatus !== "NOT_APPLICABLE" && (
                <Badge variant={
                  order.zatcaStatus === "REPORTED" || order.zatcaStatus === "CLEARED" ? "default"
                  : order.zatcaStatus === "FAILED" ? "destructive"
                  : "secondary"
                }>
                  ZATCA: {order.zatcaStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/orders/${orderId}/invoice`, "_blank")}
          >
            <FileText className="mr-2 h-4 w-4" />
            {t("invoice")}
          </Button>
          {(order.zatcaStatus === "FAILED" || order.zatcaStatus === "PENDING") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleZatcaRetry}
              disabled={zatcaRetrying}
            >
              {zatcaRetrying ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("retrying")}</>
              ) : (
                <><RotateCcw className="mr-2 h-4 w-4" /> {t("retryZatca")}</>
              )}
            </Button>
          )}
          {(hasUnfulfilled || isFullyRefunded) && (
            <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isFullyRefunded}>
                  <Truck className="mr-2 h-4 w-4" />
                  {t("fulfill")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("fulfillDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("fulfillDialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">{t("fulfillDialog.itemsToFulfill")}</Label>
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {order?.items.map((item) => {
                        const fi = fulfillItems[item.id];
                        if (!fi) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-3">
                            <Checkbox
                              checked={fi.selected}
                              onCheckedChange={(checked) =>
                                setFulfillItems((prev) => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], selected: !!checked },
                                }))
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                            </div>
                            {fi.selected && (
                              <Input
                                type="number"
                                min={1}
                                max={fi.max}
                                value={fi.quantity}
                                onChange={(e) =>
                                  setFulfillItems((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.min(Math.max(1, parseInt(e.target.value) || 1), fi.max),
                                    },
                                  }))
                                }
                                className="w-16 h-8"
                              />
                            )}
                            {!fi.selected && <span className="text-xs text-muted-foreground">{t("fulfillments.remaining", { count: fi.max })}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("fulfillDialog.carrier")}</Label>
                      <Input
                        value={fulfillCarrier}
                        onChange={(e) => setFulfillCarrier(e.target.value)}
                        placeholder={t("fulfillDialog.carrierPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("fulfillDialog.trackingNumber")}</Label>
                      <Input
                        value={fulfillTrackingNumber}
                        onChange={(e) => setFulfillTrackingNumber(e.target.value)}
                        placeholder={t("fulfillDialog.trackingNumberPlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("fulfillDialog.trackingUrl")}</Label>
                    <Input
                      value={fulfillTrackingUrl}
                      onChange={(e) => setFulfillTrackingUrl(e.target.value)}
                      placeholder={t("fulfillDialog.trackingUrlPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("fulfillDialog.notes")}</Label>
                    <Textarea
                      value={fulfillNotes}
                      onChange={(e) => setFulfillNotes(e.target.value)}
                      placeholder={t("fulfillDialog.notesPlaceholder")}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFulfillOpen(false)}>{t("cancel")}</Button>
                  <Button onClick={handleFulfill} disabled={fulfillProcessing}>
                    {fulfillProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("fulfillDialog.create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {canRefund && (
            <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("refund")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("refundDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("refundDialog.description", { orderNumber: order?.orderNumber, maxAmount: formatCurrency(maxRefundable) })}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("refundDialog.refundType")}</Label>
                    <Select value={refundType} onValueChange={(v) => setRefundType(v as "FULL" | "PARTIAL")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL">{t("refundDialog.fullRefund", { amount: formatCurrency(maxRefundable) })}</SelectItem>
                        <SelectItem value="PARTIAL">{t("refundDialog.partialRefund")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {refundType === "PARTIAL" && order && (
                    <div className="space-y-2">
                      <Label>{t("refundDialog.selectItems")}</Label>
                      <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                        {order.items.map((item) => {
                          const ri = refundItems[item.id];
                          return (
                            <div key={item.id} className="flex items-center gap-3 p-3">
                              <Checkbox
                                checked={ri?.selected || false}
                                onCheckedChange={(checked) =>
                                  setRefundItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], selected: !!checked },
                                  }))
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                {item.variantName && (
                                  <p className="text-xs text-muted-foreground">{item.variantName}</p>
                                )}
                              </div>
                              {ri?.selected && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={item.quantity}
                                    value={ri.quantity}
                                    onChange={(e) => {
                                      const qty = Math.min(Math.max(1, parseInt(e.target.value) || 1), item.quantity);
                                      const unitPrice = item.totalPrice / item.quantity;
                                      setRefundItems((prev) => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], quantity: qty, amount: parseFloat((unitPrice * qty).toFixed(2)) },
                                      }));
                                    }}
                                    className="w-16 h-8"
                                  />
                                  <span className="text-sm font-medium whitespace-nowrap text-right">
                                    {formatCurrency(ri.amount)}
                                  </span>
                                </div>
                              )}
                              {!ri?.selected && (
                                <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                                  {item.quantity} × {formatCurrency(item.price)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>{t("refundDialog.reason")}</Label>
                    <Textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder={t("refundDialog.reasonPlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="restock"
                      checked={refundRestock}
                      onCheckedChange={(checked) => setRefundRestock(!!checked)}
                    />
                    <Label htmlFor="restock" className="text-sm font-normal">
                      {t("refundDialog.restockItems")}
                    </Label>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>{t("refundDialog.refundTotal")}</span>
                    <span>{formatCurrency(selectedRefundTotal)}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRefundOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRefund}
                    disabled={refundProcessing || selectedRefundTotal <= 0}
                  >
                    {refundProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("refundDialog.processRefund")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges || isFullyRefunded}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("saveChanges")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("items.count", { count: order.items.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("items.product")}</TableHead>
                    <TableHead className="text-center">{t("items.qty")}</TableHead>
                    <TableHead className="text-right">{t("items.price")}</TableHead>
                    <TableHead className="text-right">{t("items.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.product ? (
                              <Link
                                href={`/products/${item.product.slug}`}
                                className="hover:underline"
                                target="_blank"
                              >
                                {item.name}
                                <ExternalLink className="inline ml-1 h-3 w-3" />
                              </Link>
                            ) : (
                              item.name
                            )}
                          </p>
                          {item.variantName && (
                            <p className="text-xs text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">
                              {t("items.sku", { sku: item.sku })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("priceSummary.subtotal")}</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t("priceSummary.discount")}</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("priceSummary.shipping")}</span>
                  <span>
                    {order.shippingAmount > 0
                      ? formatCurrency(order.shippingAmount)
                      : t("free")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("priceSummary.tax")}</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>{t("priceSummary.total")}</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>{t("management.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("management.orderStatus")}</Label>
                  <Select value={status} onValueChange={setStatus} disabled={isFullyRefunded}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"].map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {t(`orderStatuses.${s}`)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("management.paymentStatus")}</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus} disabled={isFullyRefunded}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {t(`paymentStatuses.${s}`)}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("management.fulfillmentStatus")}</Label>
                  <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus} disabled={isFullyRefunded}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "UNFULFILLED",
                        "PARTIALLY_FULFILLED",
                        "FULFILLED",
                        "SHIPPED",
                        "DELIVERED",
                      ].map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`fulfillmentStatuses.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("management.trackingNumber")}</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={t("management.trackingNumberPlaceholder")}
                  disabled={isFullyRefunded}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("management.internalNotes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("management.internalNotesPlaceholder")}
                  rows={3}
                  disabled={isFullyRefunded}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("timeline.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("timeline.noEvents")}
                </p>
              ) : (
                <div className="space-y-4">
                  {order.timeline.map((event, i) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            event.type === "STATUS_CHANGE"
                              ? "bg-blue-500"
                              : event.type === "PAYMENT"
                                ? "bg-green-500"
                                : event.type === "FULFILLMENT"
                                  ? "bg-purple-500"
                                  : "bg-muted-foreground"
                          }`}
                        />
                        {i < order.timeline.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.message && (
                          <p className="text-xs text-muted-foreground">
                            {event.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions */}
          {order.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {t("transactions.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("transactions.type")}</TableHead>
                      <TableHead>{t("transactions.method")}</TableHead>
                      <TableHead>{t("transactions.status")}</TableHead>
                      <TableHead>{t("transactions.reference")}</TableHead>
                      <TableHead className="text-right">{t("transactions.amount")}</TableHead>
                      <TableHead>{t("transactions.date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant="outline">{tx.type}</Badge>
                        </TableCell>
                        <TableCell>{tx.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(tx.status)}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Refund History */}
          {orderRefunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t("refunds.count", { count: orderRefunds.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("refunds.type")}</TableHead>
                      <TableHead>{t("refunds.status")}</TableHead>
                      <TableHead>{t("refunds.zatca")}</TableHead>
                      <TableHead className="text-right">{t("refunds.amount")}</TableHead>
                      <TableHead>{t("refunds.reason")}</TableHead>
                      <TableHead>{t("refunds.date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderRefunds.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>
                          <Badge variant="outline">{refund.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(refund.status)}>
                            {refund.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {refund.zatcaStatus && refund.zatcaStatus !== "NOT_APPLICABLE" ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant={
                                refund.zatcaStatus === "REPORTED" ? "default"
                                : refund.zatcaStatus === "FAILED" ? "destructive"
                                : "secondary"
                              }>
                                {refund.zatcaStatus}
                              </Badge>
                              {refund.zatcaStatus === "FAILED" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch("/api/zatca/retry", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ refundId: refund.id }),
                                      });
                                      const data = await res.json();
                                      if (data.success) toast.success(t("toasts.zatcaCreditNoteSuccess"));
                                      else toast.error(data.errors?.[0] || t("toasts.zatcaCreditNoteFailed"));
                                      await fetchOrder();
                                    } catch {
                                      toast.error(t("toasts.zatcaCreditNoteFailed"));
                                    }
                                  }}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(refund.amount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-50 truncate">
                          {refund.reason || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(refund.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalRefunded > 0 && (
                  <div className="flex justify-between font-medium mt-4 pt-4 border-t text-sm">
                    <span>{t("refunds.totalRefunded")}</span>
                    <span className="text-destructive">{formatCurrency(totalRefunded)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fulfillment History */}
          {orderFulfillments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  {t("fulfillments.count", { count: orderFulfillments.length })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderFulfillments.map((f) => (
                  <div key={f.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={f.status === "DELIVERED" ? "default" : f.status === "CANCELLED" ? "destructive" : "secondary"}>
                        {f.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(f.createdAt)}</span>
                    </div>
                    {f.carrier && (
                      <p className="text-sm"><span className="text-muted-foreground">{t("fulfillments.carrier")}</span> {f.carrier}</p>
                    )}
                    {f.trackingNumber && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t("fulfillments.tracking")}</span>{" "}
                        {f.trackingUrl ? (
                          <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {f.trackingNumber} <ExternalLink className="inline h-3 w-3" />
                          </a>
                        ) : (
                          f.trackingNumber
                        )}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {f.items.map((fi) => (
                        <span key={fi.id} className="mr-3">{fi.orderItem.name} ×{fi.quantity}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("customer.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {order.user?.name || t("customer.guest")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{order.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(order.email)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {order.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.phone}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {order.paymentMethod ? t("customer.payment", { method: order.paymentMethod.toUpperCase() }) : t("customer.paymentNA")}
                {order.shippingMethod && ` • ${t("customer.shipping", { method: order.shippingMethod })}`}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  {t("shippingAddress.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">
                  {order.shippingAddress.firstName}{" "}
                  {order.shippingAddress.lastName}
                </p>
                {order.shippingAddress.company && (
                  <p>{order.shippingAddress.company}</p>
                )}
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && (
                  <p>{order.shippingAddress.address2}</p>
                )}
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.state
                    ? `, ${order.shippingAddress.state}`
                    : ""}
                </p>
                <p>
                  {order.shippingAddress.postalCode},{" "}
                  {order.shippingAddress.country}
                </p>
                {order.shippingAddress.phone && (
                  <p className="flex items-center gap-1 pt-1">
                    <Phone className="h-3 w-3" />
                    {order.shippingAddress.phone}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Billing Address */}
          {order.billingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("billingAddress.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">
                  {order.billingAddress.firstName}{" "}
                  {order.billingAddress.lastName}
                </p>
                <p>{order.billingAddress.address1}</p>
                <p>
                  {order.billingAddress.city}
                  {order.billingAddress.state
                    ? `, ${order.billingAddress.state}`
                    : ""}
                </p>
                <p>
                  {order.billingAddress.postalCode},{" "}
                  {order.billingAddress.country}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Cancel Reason */}
          {order.cancelReason && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">
                  {t("cancellation.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.cancelReason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
