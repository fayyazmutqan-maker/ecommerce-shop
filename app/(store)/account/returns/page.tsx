"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/helpers";
import { AccountSidebarClient } from "@/components/store/account-sidebar-client";

interface OrderItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  totalPrice: number;
  variantName: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface ReturnRequest {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  action: string;
  createdAt: string;
  items: { id: string; quantity: number; orderItem: { name: string } }[];
}

export default function ReturnsPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [reason, setReason] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [action, setAction] = useState<"REFUND" | "EXCHANGE" | "STORE_CREDIT">("REFUND");
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number; reason: string; condition: string }>>({});

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    try {
      // Fetch customer orders that are eligible for return
      const ordersRes = await fetch("/api/orders");
      if (!ordersRes.ok) throw new Error();
      const ordersData = await ordersRes.json();
      const eligible = (ordersData.orders || ordersData).filter(
        (o: Order) => ["DELIVERED", "SHIPPED", "PROCESSING"].includes(o.status)
      );
      setOrders(eligible);

      // Fetch existing returns
      const returnsRes = await fetch("/api/returns");
      if (returnsRes.ok) {
        setReturns(await returnsRes.json());
      }

      // Auto-select order from URL param
      if (orderId) {
        const found = eligible.find((o: Order) => o.id === orderId);
        if (found) {
          selectOrder(found);
        }
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function selectOrder(order: Order) {
    setSelectedOrder(order);
    setShowForm(true);
    const items: Record<string, { selected: boolean; quantity: number; reason: string; condition: string }> = {};
    for (const item of order.items) {
      items[item.id] = { selected: false, quantity: item.quantity, reason: "", condition: "NEW" };
    }
    setSelectedItems(items);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder || !reason) return;

    const items = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([orderItemId, v]) => ({
        orderItemId,
        quantity: v.quantity,
        reason: v.reason || undefined,
        condition: v.condition as "NEW" | "OPENED" | "DAMAGED" | undefined,
      }));

    if (items.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          reason,
          customerNotes: customerNotes || undefined,
          action,
          items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit return");
      }

      setSubmitted(true);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to submit return");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-14 flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-14">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold">Return Request Submitted</h2>
            <p className="text-sm text-muted-foreground">
              Your return request has been submitted for review. Approval, item receipt, inspection, and any refund or exchange are handled as separate steps.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" asChild>
                <Link href="/account/orders">View Orders</Link>
              </Button>
              <Button asChild>
                <Link href="/account">Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Returns" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <AccountSidebarClient active="returns" />

        <div className="lg:col-span-3 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/account">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Returns</h1>
      </div>

      {/* Existing Returns */}
      {returns.length > 0 && !showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Your Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {returns.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{r.returnNumber}</p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "REJECTED" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Selection */}
      {!showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request a Return</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <RotateCcw className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No eligible orders for return</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only delivered or shipped orders can be returned
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Select an order to start a return request. Submitting a request does not approve the return or process a refund.
                </p>
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className="w-full text-left p-4 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)} — {order.items.length} item{order.items.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Return Form */}
      {showForm && selectedOrder && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Return for {selectedOrder.orderNumber}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowForm(false); setSelectedOrder(null); }}
                >
                  Change Order
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Selection */}
              <div className="space-y-2">
                <Label>Select items to return</Label>
                <div className="border rounded-md divide-y">
                  {selectedOrder.items.map((item) => {
                    const si = selectedItems[item.id];
                    return (
                      <div key={item.id} className="p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={si?.selected || false}
                            onCheckedChange={(checked) =>
                              setSelectedItems((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], selected: !!checked },
                              }))
                            }
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.variantName && (
                              <p className="text-xs text-muted-foreground">{item.variantName}</p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.price)}
                          </span>
                        </div>
                        {si?.selected && (
                          <div className="ml-8 grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={si.quantity}
                                onChange={(e) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      quantity: Math.min(Math.max(1, parseInt(e.target.value) || 1), item.quantity),
                                    },
                                  }))
                                }
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Condition</Label>
                              <Select
                                value={si.condition}
                                onValueChange={(v) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], condition: v },
                                  }))
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NEW">New/Unused</SelectItem>
                                  <SelectItem value="OPENED">Opened</SelectItem>
                                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Reason (optional)</Label>
                              <Input
                                value={si.reason}
                                onChange={(e) =>
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], reason: e.target.value },
                                  }))
                                }
                                placeholder="Item reason"
                                className="h-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for return *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please tell us why you'd like to return these items..."
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred resolution</Label>
                <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REFUND">Refund to original payment method</SelectItem>
                    <SelectItem value="EXCHANGE">Exchange for different item</SelectItem>
                    <SelectItem value="STORE_CREDIT">Store credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Anything else we should know..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setSelectedOrder(null); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Return Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
        </div>
      </div>
    </div>
  );
}
