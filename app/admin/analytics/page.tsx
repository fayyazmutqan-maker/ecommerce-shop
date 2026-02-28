import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { orders, products, users } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { formatCurrency } from "@/lib/helpers";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { DashboardChart } from "@/components/admin/dashboard-chart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [allOrders, productsCount, customersCount] = await Promise.all([
    db.query.orders.findMany({
      columns: { totalAmount: true, status: true, source: true, createdAt: true },
    }),
    db.select({ value: count() }).from(products).where(eq(products.status, "ACTIVE")),
    db.select({ value: count() }).from(users).where(eq(users.role, "CUSTOMER")),
  ]);

  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const avgOrderValue = allOrders.length ? totalRevenue / allOrders.length : 0;
  const onlineOrders = allOrders.filter((o) => o.source === "ONLINE").length;
  const posOrders = allOrders.filter((o) => o.source === "POS").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your store performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(avgOrderValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              POS Orders
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posOrders}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue overview</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardChart />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Online Store</span>
                <span className="font-medium">{onlineOrders} orders</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Point of Sale</span>
                <span className="font-medium">{posOrders} orders</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Store Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Products</span>
                <span className="font-medium">{productsCount[0].value}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Customers</span>
                <span className="font-medium">{customersCount[0].value}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Orders</span>
                <span className="font-medium">{allOrders.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
