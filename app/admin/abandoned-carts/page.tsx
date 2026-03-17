"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  ShoppingCart,
  Clock,
  CheckCircle,
  Send,
  Trash2,
  Loader2,
  Eye,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useTranslations } from "next-intl";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantName?: string;
}

interface AbandonedCart {
  id: string;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  items: CartItem[];
  subtotal: number;
  recoveryToken: string;
  status: string;
  emailSentAt?: string | null;
  recoveredAt?: string | null;
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AbandonedCartsPage() {
  const t = useTranslations("admin.abandonedCarts");
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const fetchCarts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/abandoned-carts?${params}`);
      const data = await res.json();
      setCarts(data.carts || []);
    } catch {
      toast.error(t("failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCarts(); }, [fetchCarts]);

  const handleSendRecovery = async (cart: AbandonedCart) => {
    if (!cart.email) {
      toast.error(t("noEmail"));
      return;
    }

    setSendingEmail(cart.id);
    try {
      const res = await fetch("/api/abandoned-carts/send-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: cart.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }

      toast.success(t("recoverySent", { email: cart.email }));
      fetchCarts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("recoveryFailed"));
    } finally {
      setSendingEmail(null);
    }
  };

  const handleDelete = async (cart: AbandonedCart) => {
    if (!confirm(t("deleteCart"))) return;
    try {
      const res = await fetch(`/api/abandoned-carts?id=${cart.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("cartDeleted"));
      fetchCarts();
    } catch {
      toast.error(t("failedDelete"));
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-SA", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const timeSince = (date: string) => {
    const hours = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return t("lessThanHour");
    if (hours < 24) return t("hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("daysAgo", { count: days });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ABANDONED": return <Badge variant="destructive">{t("statusAbandoned")}</Badge>;
      case "EMAIL_SENT": return <Badge variant="outline" className="border-blue-500 text-blue-500">{t("statusEmailSent")}</Badge>;
      case "RECOVERED": return <Badge variant="outline" className="border-green-500 text-green-500">{t("statusRecovered")}</Badge>;
      case "EXPIRED": return <Badge variant="secondary">{t("statusExpired")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: carts.length,
    abandoned: carts.filter(c => c.status === "ABANDONED").length,
    emailSent: carts.filter(c => c.status === "EMAIL_SENT").length,
    recovered: carts.filter(c => c.status === "RECOVERED").length,
    totalValue: carts.filter(c => c.status === "ABANDONED" || c.status === "EMAIL_SENT").reduce((s, c) => s + c.subtotal, 0),
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-none"><CardContent className="pt-6"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div className="space-y-1"><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-20" /></div></div></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[25%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /></div>))}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.abandoned}</p>
                <p className="text-xs text-muted-foreground">{t("statsAbandoned")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emailSent}</p>
                <p className="text-xs text-muted-foreground">{t("statsEmailsSent")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recovered}</p>
                <p className="text-xs text-muted-foreground">{t("statsRecovered")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">SAR {stats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{t("statsRecoverableValue")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("filterPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCarts")}</SelectItem>
            <SelectItem value="ABANDONED">{t("statusAbandoned")}</SelectItem>
            <SelectItem value="EMAIL_SENT">{t("statusEmailSent")}</SelectItem>
            <SelectItem value="RECOVERED">{t("statusRecovered")}</SelectItem>
            <SelectItem value="EXPIRED">{t("statusExpired")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead>{t("value")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("abandonedTime")}</TableHead>
                <TableHead className="w-28">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carts.map((cart) => (
                <TableRow key={cart.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{cart.email || t("unknown")}</p>
                      {cart.phone && <p className="text-xs text-muted-foreground">{cart.phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cart.items.length !== 1 ? t("itemsCount", { count: cart.items.length }) : t("itemCount", { count: cart.items.length })}
                  </TableCell>
                  <TableCell className="font-medium">SAR {cart.subtotal.toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(cart.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{timeSince(cart.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title={t("viewDetails")} onClick={() => setSelectedCart(cart)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(cart.status === "ABANDONED" || cart.status === "EMAIL_SENT") && cart.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t("sendRecoveryEmail")}
                          onClick={() => handleSendRecovery(cart)}
                          disabled={sendingEmail === cart.id}
                        >
                          {sendingEmail === cart.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 text-blue-600" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cart)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {carts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground">{t("noCarts")}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cart Detail Dialog */}
      <Dialog open={!!selectedCart} onOpenChange={() => setSelectedCart(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("cartDetails")}</DialogTitle>
          </DialogHeader>

          {selectedCart && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("email")}</p>
                  <p className="font-medium">{selectedCart.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("phone")}</p>
                  <p className="font-medium">{selectedCart.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("status")}</p>
                  <div className="mt-1">{statusBadge(selectedCart.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("created")}</p>
                  <p className="font-medium">{formatDate(selectedCart.createdAt)}</p>
                </div>
                {selectedCart.emailSentAt && (
                  <div>
                    <p className="text-muted-foreground">{t("emailSentAt")}</p>
                    <p className="font-medium">{formatDate(selectedCart.emailSentAt)}</p>
                  </div>
                )}
                {selectedCart.recoveredAt && (
                  <div>
                    <p className="text-muted-foreground">{t("recoveredAt")}</p>
                    <p className="font-medium">{formatDate(selectedCart.recoveredAt)}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("cartItems")}</p>
                {selectedCart.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                      <p className="text-xs text-muted-foreground">{t("qty", { count: item.quantity })}</p>
                    </div>
                    <span className="text-sm font-medium">SAR {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>{t("subtotal")}</span>
                <span>SAR {selectedCart.subtotal.toFixed(2)}</span>
              </div>

              {(selectedCart.status === "ABANDONED" || selectedCart.status === "EMAIL_SENT") && selectedCart.email && (
                <Button
                  className="w-full"
                  onClick={() => { handleSendRecovery(selectedCart); setSelectedCart(null); }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("sendRecoveryTo", { email: selectedCart.email })}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
