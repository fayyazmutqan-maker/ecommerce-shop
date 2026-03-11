import Link from "next/link";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/schema";
import { desc, or, ilike, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/helpers";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  const whereClause = q
    ? or(
        ilike(orders.orderNumber, `%${q}%`),
        ilike(orders.email, `%${q}%`),
      )
    : undefined;

  const [allOrders, countResult] = await Promise.all([
    db.query.orders.findMany({
      where: whereClause,
      orderBy: [desc(orders.createdAt)],
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
      with: {
        user: { columns: { name: true, email: true } },
        items: true,
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
  ]);

  const totalItems = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage and fulfill customer orders ({totalItems} orders)
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          {
            label: "Total Orders",
            value: allOrders.length,
          },
          {
            label: "Pending",
            value: allOrders.filter((o) => o.status === "PENDING").length,
          },
          {
            label: "Processing",
            value: allOrders.filter((o) => o.status === "PROCESSING").length,
          },
          {
            label: "Delivered",
            value: allOrders.filter((o) => o.status === "DELIVERED").length,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <AdminSearch placeholder="Search orders..." />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    {order.source === "POS" && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        POS
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {order.user?.name || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.fulfillmentStatus)}>
                      {order.fulfillmentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.items.length} items</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(Number(order.totalAmount))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {allOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No orders yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        </CardContent>
      </Card>
    </div>
  );
}
