import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("account");
  const tCommon = await getTranslations("common");

  const orderList = await db.query.orders.findMany({
    where: eq(orders.userId, session.user.id),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: {
        with: { product: { columns: { name: true, slug: true } } },
      },
      shippingAddress: true,
      billingAddress: true,
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: t("title"), href: "/account" },
        { label: t("orders") },
      ]} />

      <div className="flex items-center gap-4 mb-10">
        <Button variant="outline" size="icon" asChild className="h-10 w-10">
          <Link href="/account">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">{t("title")}</p>
          <h1 className="text-3xl font-bold">{t("myOrders")}</h1>
        </div>
      </div>

      {orderList.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <p className="text-muted-foreground mb-5 font-medium">
              {t("noOrdersYet")}
            </p>
            <Button asChild className="h-11 px-6 font-semibold">
              <Link href="/products">{t("startShopping")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {orderList.map((order) => (
            <Card key={order.id} className="shadow-none border">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {t("orderNumber", { number: order.orderNumber })}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("placedOn", {
                        date: new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }),
                      })}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                      {order.shippingMethod && <span>Shipping: {order.shippingMethod}</span>}
                      {order.paymentMethod && <span>Payment: {order.paymentMethod}</span>}
                      {order.shippingAddress && (
                        <span>
                          Deliver to {order.shippingAddress.city}
                          {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Badge variant={order.status === "DELIVERED" ? "default" : order.status === "CANCELLED" ? "destructive" : "secondary"}>
                      {order.status}
                    </Badge>
                    <Badge variant={order.paymentStatus === "PAID" ? "default" : order.paymentStatus === "FAILED" ? "destructive" : "secondary"}>
                      {order.paymentStatus}
                    </Badge>
                    <span className="min-w-24 text-right font-bold text-[15px]">
                      {order.currency} {Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("productColumn")}</TableHead>
                      <TableHead className="text-center">{t("qtyColumn")}</TableHead>
                      <TableHead className="text-end">{t("priceColumn")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="hover:text-foreground/70 transition-colors"
                          >
                            {item.product.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-end font-medium">
                          {tCommon("sar")} {(Number(item.price) * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{order.currency} {Number(order.subtotal).toFixed(2)}</span>
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">{order.currency} {Number(order.shippingAmount).toFixed(2)}</span>
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">{order.currency} {Number(order.taxAmount).toFixed(2)}</span>
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium">{order.currency} {Number(order.discountAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/account/orders/${order.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t("viewOrder")}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/api/orders/${order.id}/invoice`} target="_blank">
                        <FileText className="mr-2 h-4 w-4" />
                        Invoice
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
