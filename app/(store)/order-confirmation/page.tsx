import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { serializeDecimal, toNumber } from "@/lib/decimal";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ order?: string; status?: string }>;
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderNumber = params.order;
  const status = params.status;
  const isFailed = status === "failed";

  // Must have an order number
  if (!orderNumber) {
    notFound();
  }

  // Fetch the order from DB and verify ownership
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: true,
      shippingAddress: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Ownership verification: order must belong to the current user OR match by email
  const session = await auth();
  const isOwner =
    (session?.user?.id && order.userId === session.user.id) ||
    (session?.user?.email && order.email === session.user.email) ||
    // Allow unauthenticated access for guest orders within 1 hour of creation
    (!order.userId &&
      new Date().getTime() - new Date(order.createdAt).getTime() <
        60 * 60 * 1000);

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-6 lg:px-8 py-28 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Access Denied
        </h1>
        <p className="text-muted-foreground text-base mb-8">
          Please sign in to view this order.
        </p>
        <Button className="h-12 px-8" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  const serializedOrder = serializeDecimal(order);

  if (isFailed) {
    return (
      <div className="mx-auto max-w-2xl px-6 lg:px-8 py-28 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Payment Failed
        </h1>
        <p className="text-muted-foreground text-base mb-2">
          Your payment could not be processed. Order number:
        </p>
        <p className="text-xl font-bold mb-4">{serializedOrder.orderNumber}</p>
        <p className="text-sm text-muted-foreground mb-2">
          Total: SAR {toNumber(serializedOrder.totalAmount).toFixed(2)}
        </p>
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900 max-w-md mx-auto mb-8">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Your order has been saved. You can retry payment or contact support.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button className="h-12 px-8 w-full sm:w-auto" asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button variant="outline" className="h-12 px-8 w-full sm:w-auto" asChild>
            <Link href="/account/orders">My Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 lg:px-8 py-28 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Order Confirmed!
      </h1>
      <p className="text-muted-foreground text-base mb-2">
        Thank you for your order. Your order number is:
      </p>
      <p className="text-xl font-bold mb-4">{serializedOrder.orderNumber}</p>
      <p className="text-lg font-semibold mb-8">
        Total: SAR {toNumber(serializedOrder.totalAmount).toFixed(2)}
      </p>
      <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
        You will receive an email confirmation shortly. We&apos;ll notify you
        when your order ships.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Button className="h-12 px-8" asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
