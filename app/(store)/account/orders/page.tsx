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
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const orderList = await db.query.orders.findMany({
    where: eq(orders.userId, session.user.id),
    orderBy: [desc(orders.createdAt)],
    with: {
      items: {
        with: { product: { columns: { name: true, slug: true } } },
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Orders" },
      ]} />

      <div className="flex items-center gap-4 mb-10">
        <Button variant="outline" size="icon" asChild className="h-10 w-10">
          <Link href="/account">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">Account</p>
          <h1 className="text-3xl font-bold">My Orders</h1>
        </div>
      </div>

      {orderList.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <p className="text-muted-foreground mb-5 font-medium">
              You haven&apos;t placed any orders yet.
            </p>
            <Button asChild className="h-11 px-6 font-semibold">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {orderList.map((order) => (
            <Card key={order.id} className="shadow-none border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Order #{order.orderNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        order.status === "DELIVERED"
                          ? "default"
                          : order.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {order.status}
                    </Badge>
                    <span className="font-bold text-[15px]">
                      SAR {Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
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
                        <TableCell className="text-right font-medium">
                          SAR {(Number(item.price) * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
