"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Users,
  ArrowUpRight, ArrowDownRight, BarChart3, Package, RefreshCw,
  CreditCard, Banknote, ShoppingBag, Mail, RotateCcw, Calendar,
  Monitor, Smartphone, PieChart,
} from "lucide-react";
import {
  Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell, PieChart as RePieChart, Pie, Legend,
} from "recharts";
import { toast } from "sonner";

interface AnalyticsData {
  period: { from: string; to: string; granularity: string };
  overview: {
    totalRevenue: number;
    revenueChange: number;
    netRevenue: number;
    totalOrders: number;
    ordersChange: number;
    avgOrderValue: number;
    avgOrderValueChange: number;
    newCustomers: number;
    newCustomersChange: number;
    totalCustomers: number;
    activeProducts: number;
  };
  financials: {
    grossRevenue: number;
    totalTax: number;
    totalShipping: number;
    totalDiscounts: number;
    totalRefunds: number;
    refundCount: number;
    netRevenue: number;
  };
  salesByChannel: {
    online: { orders: number; revenue: number };
    pos: { orders: number; revenue: number };
  };
  paymentMethods: Record<string, { count: number; revenue: number }>;
  orderStatusDistribution: Record<string, number>;
  customerInsights: {
    uniqueCustomers: number;
    newCustomerOrders: number;
    returningCustomerOrders: number;
    returningRate: number;
  };
  abandonedCarts: {
    total: number;
    abandoned: number;
    emailSent: number;
    recovered: number;
    abandonedValue: number;
    recoveryRate: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    revenue: number;
    quantity: number;
    orders: number;
  }>;
  timeSeries: Array<{ date: string; revenue: number; orders: number }>;
}

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#e11d48", "#0891b2", "#ca8a04", "#64748b"];

const DATE_RANGES = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "12m" },
  { label: "This month", value: "thisMonth" },
  { label: "This year", value: "thisYear" },
];

function getDateRange(range: string): { from: string; to: string; granularity: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;
  let granularity = "day";

  switch (range) {
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      granularity = "week";
      break;
    case "12m":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      granularity = "month";
      break;
    case "thisMonth":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "thisYear":
      from = new Date(now.getFullYear(), 0, 1);
      granularity = "month";
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { from: from.toISOString(), to, granularity };
}

function formatCurrency(amount: number): string {
  return `SAR ${amount.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChangeIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const isPositive = value > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const { from, to, granularity } = getDateRange(range);
      const res = await fetch(
        `/api/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&granularity=${granularity}`
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }

  const statusPieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.orderStatusDistribution).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    }));
  }, [data]);

  const channelPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Online", value: data.salesByChannel.online.revenue },
      { name: "POS", value: data.salesByChannel.pos.revenue },
    ].filter((d) => d.value > 0);
  }, [data]);

  const paymentData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.paymentMethods).map(([method, info]) => ({
      name: method === "cod" ? "Cash" : method === "tap" ? "Card" : method,
      count: info.count,
      revenue: info.revenue,
    }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-8 w-32 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive store performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
            <ChangeIndicator value={data.overview.revenueChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalOrders.toLocaleString()}</div>
            <ChangeIndicator value={data.overview.ordersChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.avgOrderValue)}</div>
            <ChangeIndicator value={data.overview.avgOrderValueChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.newCustomers.toLocaleString()}</div>
            <ChangeIndicator value={data.overview.newCustomersChange} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
        </TabsList>

        {/* ══ Overview Tab ══ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue & Orders Trend</CardTitle>
              <CardDescription>
                {data.period.granularity === "day" ? "Daily" : data.period.granularity === "week" ? "Weekly" : "Monthly"} breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.timeSeries.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data for selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return data.period.granularity === "month"
                          ? d.toLocaleDateString("en-SA", { month: "short" })
                          : d.toLocaleDateString("en-SA", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis
                      yAxisId="revenue"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "revenue" ? formatCurrency(value) : value,
                        name === "revenue" ? "Revenue" : "Orders",
                      ]}
                    />
                    <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sales by Channel & Payment Methods */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                {channelPieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No sales data</p>
                ) : (
                  <div className="space-y-4">
                    {channelPieData.map((ch, i) => {
                      const totalRev = data.overview.totalRevenue || 1;
                      const pct = (ch.value / totalRev) * 100;
                      return (
                        <div key={ch.name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {ch.name === "Online" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                              <span className="text-sm font-medium">{ch.name}</span>
                            </div>
                            <span className="text-sm font-bold">{formatCurrency(ch.value)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: COLORS[i] }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ch.name === "Online" ? data.salesByChannel.online.orders : data.salesByChannel.pos.orders} orders ({pct.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No orders</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <RePieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusPieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Store Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{data.overview.activeProducts}</p>
                  <p className="text-xs text-muted-foreground">Active Products</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{data.overview.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground">Total Customers</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{data.overview.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{formatCurrency(data.overview.netRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Net Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Financials Tab ══ */}
        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Financial summary for period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2">
                  <span>Gross Revenue</span>
                  <span className="font-bold">{formatCurrency(data.financials.grossRevenue)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">+ Shipping</span>
                  <span>{formatCurrency(data.financials.totalShipping)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">+ Tax (VAT 15%)</span>
                  <span>{formatCurrency(data.financials.totalTax)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-red-600">
                  <span>- Discounts</span>
                  <span>-{formatCurrency(data.financials.totalDiscounts)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-red-600">
                  <span>- Refunds ({data.financials.refundCount})</span>
                  <span>-{formatCurrency(data.financials.totalRefunds)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Net Revenue</span>
                  <span className="text-green-600">{formatCurrency(data.financials.netRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No payments</p>
                ) : (
                  <div className="space-y-4">
                    {paymentData.map((pm) => (
                      <div key={pm.name} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                        <div className="flex items-center gap-3">
                          {pm.name === "Cash" ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                          <div>
                            <p className="font-medium">{pm.name}</p>
                            <p className="text-xs text-muted-foreground">{pm.count} transactions</p>
                          </div>
                        </div>
                        <span className="font-bold">{formatCurrency(pm.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ Top Products Tab ══ */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
              <CardDescription>Best performing products in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No product sales data</p>
              ) : (
                <div className="space-y-1">
                <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-12 gap-2 py-2 text-xs font-medium text-muted-foreground border-b">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Product</div>
                    <div className="col-span-2 text-right">Revenue</div>
                    <div className="col-span-2 text-right">Qty Sold</div>
                    <div className="col-span-2 text-right">Orders</div>
                  </div>
                  {data.topProducts.map((product, idx) => (
                    <div key={product.productId} className="grid grid-cols-12 gap-2 py-3 border-b last:border-0 items-center">
                      <div className="col-span-1">
                        <Badge variant={idx < 3 ? "default" : "secondary"} className="text-xs">
                          {idx + 1}
                        </Badge>
                      </div>
                      <div className="col-span-5 truncate font-medium text-sm">{product.name}</div>
                      <div className="col-span-2 text-right font-bold text-sm">{formatCurrency(product.revenue)}</div>
                      <div className="col-span-2 text-right text-sm">{product.quantity}</div>
                      <div className="col-span-2 text-right text-sm text-muted-foreground">{product.orders}</div>
                    </div>
                  ))}
                </div>
                </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Bar Chart */}
          {data.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.topProducts.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={110}
                      tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {data.topProducts.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ Customers Tab ══ */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerInsights.uniqueCustomers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">New Customer Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerInsights.newCustomerOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Returning Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerInsights.returningRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New vs Returning Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="text-center p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">{data.customerInsights.newCustomerOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">New Customer Orders</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <RotateCcw className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">{data.customerInsights.returningCustomerOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">Returning Customer Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Abandoned Carts Tab ══ */}
        <TabsContent value="abandoned" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Abandoned</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.abandonedCarts.abandoned}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.abandonedCarts.emailSent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recovered</CardTitle>
                <RotateCcw className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.abandonedCarts.recovered}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recovery Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.abandonedCarts.recoveryRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Abandoned Cart Value</CardTitle>
              <CardDescription>Potential revenue from unrecovered carts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="text-center p-6 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Lost Revenue</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(data.abandonedCarts.abandonedValue)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.abandonedCarts.abandoned} carts still abandoned
                  </p>
                </div>
                <div className="text-center p-6 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Recovered</p>
                  <p className="text-3xl font-bold text-green-600">{data.abandonedCarts.recovered} orders</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {data.abandonedCarts.recoveryRate.toFixed(1)}% recovery rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
