import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, orderAddresses, orderTimeline, fulfillments } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { serializeDecimal } from "@/lib/decimal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, MapPin, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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
    },
  });

  if (!order) {
    notFound();
  }

  const data = serializeDecimal(order) as typeof order;

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span className="text-muted-foreground/40">/</span>
        <Link href="/account" className="hover:text-foreground transition-colors">Account</Link>
        <span className="text-muted-foreground/40">/</span>
        <Link href="/account/orders" className="hover:text-foreground transition-colors">Orders</Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">{data.orderNumber}</span>
      </nav>

      <div className="flex items-center gap-4 mb-8">
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
          {data.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{data.shippingAddress.firstName} {data.shippingAddress.lastName}</p>
                <p className="text-muted-foreground">{data.shippingAddress.address1}</p>
                {data.shippingAddress.address2 && <p className="text-muted-foreground">{data.shippingAddress.address2}</p>}
                <p className="text-muted-foreground">{data.shippingAddress.city}, {data.shippingAddress.state} {data.shippingAddress.postalCode}</p>
                <p className="text-muted-foreground">{data.shippingAddress.country}</p>
                {data.shippingAddress.phone && <p className="text-muted-foreground">{data.shippingAddress.phone}</p>}
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
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Method: <span className="font-medium">{data.paymentMethod || "N/A"}</span></p>
              <p>Status: <Badge className={getStatusColor(data.paymentStatus)}>{data.paymentStatus}</Badge></p>
              {data.couponCode && <p className="text-muted-foreground">Coupon: {data.couponCode}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
