import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderTimeline } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { serializeDecimal } from "@/lib/decimal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { AccountSidebar } from "@/components/store/account-sidebar";
import { CreditCard, Download, Package, Truck, MapPin, ArrowLeft, Clock, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface DisplayAddress {
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
}

interface DisplayRefund {
  id: string;
  type: string;
  amount: string | number;
  status: string;
  reason: string | null;
  zatcaCreditNoteNumber?: string | null;
  createdAt: string | Date;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    SHIPPED: "bg-indigo-100 text-indigo-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-800",
    PAID: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    UNFULFILLED: "bg-yellow-100 text-yellow-800",
    FULFILLED: "bg-green-100 text-green-800",
    PARTIALLY_FULFILLED: "bg-blue-100 text-blue-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.userId, session.user.id)),
    with: {
      items: {
        with: { product: { columns: { slug: true, name: true } } },
      },
      shippingAddress: true,
      billingAddress: true,
      timeline: { orderBy: [desc(orderTimeline.createdAt)] },
      fulfillments: true,
      refunds: true,
    },
  });

  if (!order) {
    notFound();
  }

  const data = serializeDecimal(order) as typeof order;
  const shippingAddress = data.shippingAddress as DisplayAddress | null;
  const billingAddress = data.billingAddress as DisplayAddress | null;
  const refunds = data.refunds as DisplayRefund[] | undefined;
  const completedRefunds = (refunds || []).filter((refund) =>
    refund.status === "COMPLETED" || refund.status === "APPROVED"
  );
  const totalRefunded = completedRefunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
  const netAfterRefunds = Math.max(0, Number(data.totalAmount) - totalRefunded);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Orders", href: "/account/orders" },
        { label: data.orderNumber },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <AccountSidebar active="orders" user={session.user} />

        <div className="lg:col-span-3">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/account/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        <div>
          <h1 className="text-2xl font-bold">Order {data.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(data.createdAt).toLocaleDateString("en-SA", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        </div>
        <Button asChild>
          <Link href={`/api/orders/${data.id}/invoice`} target="_blank">
            <Download className="mr-2 h-4 w-4" />
            Download Invoice
          </Link>
        </Button>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Badge className={getStatusColor(data.status)}>{data.status}</Badge>
        <Badge className={getStatusColor(data.paymentStatus)}>Payment: {data.paymentStatus}</Badge>
        <Badge className={getStatusColor(data.fulfillmentStatus)}>{data.fulfillmentStatus}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">SAR {Number(item.totalPrice).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>SAR {Number(data.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>SAR {Number(data.taxAmount).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>SAR {Number(data.shippingAmount).toFixed(2)}</span></div>
                {Number(data.discountAmount) > 0 && (
                  <div className="flex justify-between text-green-600"><span>Discount</span><span>-SAR {Number(data.discountAmount).toFixed(2)}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>SAR {Number(data.totalAmount).toFixed(2)}</span></div>
                {totalRefunded > 0 && (
                  <>
                    <div className="flex justify-between text-destructive"><span>Refunded</span><span>-SAR {totalRefunded.toFixed(2)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Net after refunds</span><span>SAR {netAfterRefunds.toFixed(2)}</span></div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {data.timeline && data.timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        {event.message && <p className="text-xs text-muted-foreground">{event.message}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(event.createdAt).toLocaleString("en-SA")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Shipping Address */}
          {shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                <p className="text-muted-foreground">{shippingAddress.address1}</p>
                {shippingAddress.address2 && <p className="text-muted-foreground">{shippingAddress.address2}</p>}
                <p className="text-muted-foreground">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                <p className="text-muted-foreground">{shippingAddress.country}</p>
                {shippingAddress.phone && <p className="text-muted-foreground">{shippingAddress.phone}</p>}
              </CardContent>
            </Card>
          )}

          {/* Tracking */}
          {data.fulfillments && data.fulfillments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Truck className="h-4 w-4" /> Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                {data.fulfillments.map((f) => (
                  <div key={f.id}>
                    <Badge variant="secondary">{f.status}</Badge>
                    {f.carrier && <p className="text-muted-foreground mt-1">Carrier: {f.carrier}</p>}
                    {f.trackingNumber && (
                      <p className="text-muted-foreground">
                        Tracking: {f.trackingUrl ? (
                          <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{f.trackingNumber}</a>
                        ) : f.trackingNumber}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" /> Payment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{data.paymentMethod || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(data.paymentStatus)}>{data.paymentStatus}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">SAR {Number(data.totalAmount).toFixed(2)}</span>
              </div>
              {data.couponCode && <p className="text-muted-foreground">Coupon: {data.couponCode}</p>}
            </CardContent>
          </Card>

          {/* Billing Address */}
          {billingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{billingAddress.firstName} {billingAddress.lastName}</p>
                <p className="text-muted-foreground">{billingAddress.address1}</p>
                {billingAddress.address2 && <p className="text-muted-foreground">{billingAddress.address2}</p>}
                <p className="text-muted-foreground">{billingAddress.city}, {billingAddress.state} {billingAddress.postalCode}</p>
                <p className="text-muted-foreground">{billingAddress.country}</p>
                {billingAddress.phone && <p className="text-muted-foreground">{billingAddress.phone}</p>}
              </CardContent>
            </Card>
          )}

          {/* Refunds */}
          {refunds && refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><RotateCcw className="h-4 w-4" /> Refunds</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                {refunds.map((refund) => (
                  <div key={refund.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{refund.type} Refund</span>
                      <Badge className={getStatusColor(refund.status)}>{refund.status}</Badge>
                    </div>
                    <p className="font-semibold">SAR {Number(refund.amount).toFixed(2)}</p>
                    {refund.reason && <p className="text-muted-foreground">{refund.reason}</p>}
                    {refund.zatcaCreditNoteNumber && (
                      <p className="text-xs text-muted-foreground">Credit note: {refund.zatcaCreditNoteNumber}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(refund.createdAt).toLocaleDateString("en-SA", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <Link href={`/api/refunds/${refund.id}/credit-note`} target="_blank">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Credit Note
                      </Link>
                    </Button>
                  </div>
                ))}
                {totalRefunded > 0 && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-medium">
                      <span>Total refunded</span>
                      <span>SAR {totalRefunded.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Net paid</span>
                      <span>SAR {netAfterRefunds.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
