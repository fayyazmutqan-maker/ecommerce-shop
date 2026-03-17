import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { orders, users, products, productImages, orderItems } from "@/lib/schema";
import { eq, count, gte, lt, and, desc, asc, sql } from "drizzle-orm";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/helpers";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { RecentOrders } from "@/components/admin/recent-orders";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totalOrdersResult, totalCustomersResult, totalProductsResult, allOrders, thisMonthOrders, lastMonthOrders, thisMonthCustomersResult, lastMonthCustomersResult] =
    await Promise.all([
      db.select({ value: count() }).from(orders),
      db.select({ value: count() }).from(users).where(eq(users.role, "CUSTOMER")),
      db.select({ value: count() }).from(products).where(eq(products.status, "ACTIVE")),
      db.query.orders.findMany({
        columns: { totalAmount: true, createdAt: true },
        orderBy: [desc(orders.createdAt)],
      }),
      db.query.orders.findMany({
        where: gte(orders.createdAt, startOfMonth),
        columns: { totalAmount: true },
      }),
      db.query.orders.findMany({
        where: and(gte(orders.createdAt, startOfLastMonth), lt(orders.createdAt, startOfMonth)),
        columns: { totalAmount: true },
      }),
      db.select({ value: count() }).from(users).where(and(eq(users.role, "CUSTOMER"), gte(users.createdAt, startOfMonth))),
      db.select({ value: count() }).from(users).where(and(eq(users.role, "CUSTOMER"), gte(users.createdAt, startOfLastMonth), lt(users.createdAt, startOfMonth))),
    ]);

  const totalOrders = totalOrdersResult[0].value;
  const totalCustomers = totalCustomersResult[0].value;
  const totalProducts = totalProductsResult[0].value;
  const thisMonthCustomers = thisMonthCustomersResult[0].value;
  const lastMonthCustomers = lastMonthCustomersResult[0].value;

  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const revenueChange = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : thisMonthRevenue > 0 ? "+100" : "0";
  const orderChange = lastMonthOrders.length > 0
    ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length * 100).toFixed(1)
    : thisMonthOrders.length > 0 ? "+100" : "0";
  const customerChange = lastMonthCustomers > 0
    ? ((thisMonthCustomers - lastMonthCustomers) / lastMonthCustomers * 100).toFixed(1)
    : thisMonthCustomers > 0 ? "+100" : "0";

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    revenueChange,
    orderChange,
    customerChange,
  };
}

async function getMonthlyRevenue() {
  const allOrders = await db.query.orders.findMany({
    where: gte(orders.createdAt, new Date(new Date().getFullYear(), 0, 1)),
    columns: { totalAmount: true, createdAt: true },
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = months.map((name, i) => ({
    name,
    revenue: allOrders
      .filter((o) => new Date(o.createdAt).getMonth() === i)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0),
  }));

  // Only include months up to current month
  return monthlyData.slice(0, new Date().getMonth() + 1);
}

async function getRecentOrders() {
  return db.query.orders.findMany({
    limit: 5,
    orderBy: [desc(orders.createdAt)],
    with: {
      user: { columns: { name: true, email: true, image: true } },
      items: { columns: { name: true, quantity: true } },
    },
  });
}

async function getTopProducts() {
  // Sort by actual sales volume (order item count) instead of stock quantity
  const salesData = await db
    .select({
      productId: orderItems.productId,
      totalSold: sql<number>`SUM(${orderItems.quantity})`,
      totalRevenue: sql<string>`SUM(CAST(${orderItems.totalPrice} AS NUMERIC))`,
    })
    .from(orderItems)
    .groupBy(orderItems.productId)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(5);

  const productIds = salesData.map((s) => s.productId);

  if (productIds.length === 0) {
    return [];
  }

  const result = await db.query.products.findMany({
    where: eq(products.status, "ACTIVE"),
    with: {
      images: true,
      orderItems: true,
    },
  });

  // Sort by sales volume and limit to top 5
  return result
    .map((p) => {
      const sales = salesData.find((s) => s.productId === p.id);
      return {
        ...p,
        images: p.images.filter((img) => img.isPrimary).slice(0, 1),
        _count: { orderItems: p.orderItems.length },
        _totalSold: sales ? Number(sales.totalSold) : 0,
        _totalRevenue: sales ? Number(sales.totalRevenue) : 0,
      };
    })
    .sort((a, b) => b._totalSold - a._totalSold)
    .slice(0, 5);
}

export default async function AdminDashboard() {
  const [stats, recentOrders, topProducts, chartData, t] = await Promise.all([
    getStats(),
    getRecentOrders(),
    getTopProducts(),
    getMonthlyRevenue(),
    getTranslations("admin.dashboard"),
  ]);

  const statCards = [
    {
      title: t("totalRevenue"),
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      change: `${parseFloat(stats.revenueChange) >= 0 ? "+" : ""}${stats.revenueChange}%`,
      trend: parseFloat(stats.revenueChange) >= 0 ? "up" as const : "down" as const,
    },
    {
      title: t("orders"),
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      change: `${parseFloat(stats.orderChange) >= 0 ? "+" : ""}${stats.orderChange}%`,
      trend: parseFloat(stats.orderChange) >= 0 ? "up" as const : "down" as const,
    },
    {
      title: t("customers"),
      value: stats.totalCustomers.toString(),
      icon: Users,
      change: `${parseFloat(stats.customerChange) >= 0 ? "+" : ""}${stats.customerChange}%`,
      trend: parseFloat(stats.customerChange) >= 0 ? "up" as const : "down" as const,
    },
    {
      title: t("products"),
      value: stats.totalProducts.toString(),
      icon: Package,
      change: t("active"),
      trend: "up" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {stat.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                )}
                <span
                  className={
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  }
                >
                  {stat.change}
                </span>
                <span className="ml-1">{t("fromLastMonth")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Recent Orders */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("revenueOverview")}</CardTitle>
              <CardDescription>{t("monthlyRevenue")}</CardDescription>
            </div>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("viewAnalytics")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <DashboardChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("recentOrders")}</CardTitle>
            <CardDescription>{t("latestOrders")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentOrders orders={recentOrders.map(o => ({ ...o, totalAmount: Number(o.totalAmount), items: o.items.map(i => ({ ...i, quantity: i.quantity })) }))} />
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>{t("topProducts")}</CardTitle>
          <CardDescription>{t("topProductsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku || t("noSKU")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatCurrency(Number(product.price))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("inStock", { count: product.quantity })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
