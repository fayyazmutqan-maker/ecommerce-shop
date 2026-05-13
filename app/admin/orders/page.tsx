import Link from "next/link";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
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
import { Button } from "@/components/ui/button";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/helpers";
import { getTranslations } from "next-intl/server";
import { Eye, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);
  const t = await getTranslations("admin.orders");

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
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle", { count: totalItems })}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          {
            label: t("totalOrders"),
            value: allOrders.length,
          },
          {
            label: t("pending"),
            value: allOrders.filter((o) => o.status === "PENDING").length,
          },
          {
            label: t("processing"),
            value: allOrders.filter((o) => o.status === "PROCESSING").length,
          },
          {
            label: t("delivered"),
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
          <AdminSearch placeholder={t("searchOrders")} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("order")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("payment")}</TableHead>
                <TableHead>{t("fulfillment")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                        {order.user?.name || t("guest")}
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
                  <TableCell>{t("itemsCount", { count: order.items.length })}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(Number(order.totalAmount))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/orders/${order.id}`} aria-label={`View order ${order.orderNumber}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/api/orders/${order.id}/invoice`} target="_blank" aria-label={`Download invoice ${order.orderNumber}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {allOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">{t("noOrders")}</p>
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
