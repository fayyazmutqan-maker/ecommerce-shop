"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
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
import { useTranslations } from "next-intl";

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
  channelDetails: {
    online: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      topProducts: Array<{ productId: string; name: string; revenue: number; quantity: number; orders: number }>;
      paymentMethods: Record<string, { count: number; revenue: number }>;
    };
    pos: {
      orders: number;
      revenue: number;
      avgOrderValue: number;
      topProducts: Array<{ productId: string; name: string; revenue: number; quantity: number; orders: number }>;
      paymentMethods: Record<string, { count: number; revenue: number }>;
    };
    timeSeries: Array<{ date: string; onlineRevenue: number; posRevenue: number; onlineOrders: number; posOrders: number }>;
  };
  paymentMethods: Record<string, { count: number; revenue: number }>;
  orderStatusDistribution: Record<string, number>;
  customerInsights: {
    uniqueCustomers: number;
    newCustomerOrders: number;
    returningCustomerOrders: number;
    returningRate: number;
    newCustomers: Array<{ email: string; name: string | null; orders: number; revenue: number; lastOrderDate: string }>;
    returningCustomers: Array<{ email: string; name: string | null; orders: number; revenue: number; lastOrderDate: string }>;
  };
  abandonedCarts: {
    total: number;
    abandoned: number;
    emailSent: number;
    recovered: number;
    abandonedValue: number;
    recoveryRate: number;
    carts: Array<{
      id: string;
      email: string | null;
      phone: string | null;
      status: string;
      subtotal: number;
      items: Array<{ name: string; price: number; quantity: number; image?: string }>;
      createdAt: string;
    }>;
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
  { key: "7d", value: "7d" },
  { key: "30d", value: "30d" },
  { key: "90d", value: "90d" },
  { key: "12m", value: "12m" },
  { key: "thisMonth", value: "thisMonth" },
  { key: "thisYear", value: "thisYear" },
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
  const t = useTranslations("admin.analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [customerDialog, setCustomerDialog] = useState<"new" | "returning" | null>(null);
  const [selectedCart, setSelectedCart] = useState<AnalyticsData["abandonedCarts"]["carts"][number] | null>(null);

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
      toast.error(t("loadFailed"));
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
      { name: t("online"), value: data.salesByChannel.online.revenue },
      { name: t("pos"), value: data.salesByChannel.pos.revenue },
    ].filter((d) => d.value > 0);
  }, [data]);

  const paymentData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.paymentMethods).map(([method, info]) => ({
      name: method === "cod" ? t("cash") : method === "tap" ? t("cardTap") : method,
      count: info.count,
      revenue: info.revenue,
    }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("loadingData")}</p>
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
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
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
                <SelectItem key={r.value} value={r.value}>{t(`dateRanges.${r.key}`)}</SelectItem>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
            <ChangeIndicator value={data.overview.revenueChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("orders")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalOrders.toLocaleString()}</div>
            <ChangeIndicator value={data.overview.ordersChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("avgOrderValue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.avgOrderValue)}</div>
            <ChangeIndicator value={data.overview.avgOrderValueChange} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("newCustomers")}</CardTitle>
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
          <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="channels">{t("tabChannels")}</TabsTrigger>
          <TabsTrigger value="financials">{t("tabFinancials")}</TabsTrigger>
          <TabsTrigger value="products">{t("tabProducts")}</TabsTrigger>
          <TabsTrigger value="customers">{t("tabCustomers")}</TabsTrigger>
          <TabsTrigger value="abandoned">{t("tabAbandoned")}</TabsTrigger>
        </TabsList>

        {/* ══ Overview Tab ══ */}
        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t("revenueTrend")}</CardTitle>
              <CardDescription>
                {data.period.granularity === "day" ? t("dailyBreakdown") : data.period.granularity === "week" ? t("weeklyBreakdown") : t("monthlyBreakdown")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.timeSeries.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t("noDataPeriod")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      stroke="#000000"
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
                      stroke="#000000"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      stroke="#000000"
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
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value: number, name: string) => [
                        name === "revenue" ? formatCurrency(value) : value,
                        name === "revenue" ? t("revenue") : t("orders"),
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString("en-SA", { month: "long", day: "numeric", year: "numeric" });
                      }}
                    />
                    <Bar yAxisId="revenue" dataKey="revenue" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Sales by Channel & Payment Methods */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("salesByChannel")}</CardTitle>
              </CardHeader>
              <CardContent>
                {channelPieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("noSalesData")}</p>
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
                            {t("ordersPercent", { count: ch.name === t("online") ? data.salesByChannel.online.orders : data.salesByChannel.pos.orders, pct: pct.toFixed(1) })}
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
                <CardTitle className="text-base">{t("orderStatus")}</CardTitle>
              </CardHeader>
              <CardContent>
                {statusPieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("noOrders")}</p>
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
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        itemStyle={{ color: "var(--foreground)" }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("storeSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{data.overview.activeProducts}</p>
                  <p className="text-xs text-muted-foreground">{t("activeProducts")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{data.overview.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground">{t("totalCustomers")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{data.overview.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">{t("totalOrders")}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{formatCurrency(data.overview.netRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{t("netRevenue")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Channels Tab ══ */}
        <TabsContent value="channels" className="space-y-4">
          {/* Channel Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Online Card */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Monitor className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>{t("onlineStore")}</CardTitle>
                    <CardDescription>{t("onlineDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(data.channelDetails.online.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{t("revenue")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.channelDetails.online.orders}</p>
                    <p className="text-xs text-muted-foreground">{t("orders")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(data.channelDetails.online.avgOrderValue)}</p>
                    <p className="text-xs text-muted-foreground">{t("avgOrder")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* POS Card */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Smartphone className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>{t("pointOfSale")}</CardTitle>
                    <CardDescription>{t("posDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(data.channelDetails.pos.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{t("revenue")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.channelDetails.pos.orders}</p>
                    <p className="text-xs text-muted-foreground">{t("orders")}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(data.channelDetails.pos.avgOrderValue)}</p>
                    <p className="text-xs text-muted-foreground">{t("avgOrder")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Revenue Comparison Chart */}
          {data.channelDetails.timeSeries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("revenueByChannel")}</CardTitle>
                <CardDescription>{t("channelCompareDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.channelDetails.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      stroke="#000000"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return d.toLocaleDateString("en-SA", { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis
                      stroke="#000000"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "onlineRevenue" ? t("online") : t("pos"),
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString("en-SA", { month: "long", day: "numeric", year: "numeric" });
                      }}
                    />
                    <Legend formatter={(value) => (value === "onlineRevenue" ? t("online") : t("pos"))} />
                    <Bar dataKey="onlineRevenue" fill="var(--chart-4)" radius={[4, 4, 0, 0]} stackId="revenue" />
                    <Bar dataKey="posRevenue" fill="var(--chart-5)" radius={[4, 4, 0, 0]} stackId="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Products by Channel */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  {t("topOnlineProducts")}
                </CardTitle>
                <CardDescription>{t("topOnlineDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.channelDetails.online.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("noOnlineSales")}</p>
                ) : (
                  <div className="space-y-3">
                    {data.channelDetails.online.topProducts.map((product, idx) => (
                      <div key={`${product.productId}-${idx}`} className="flex items-center gap-3">
                        <Badge variant={idx < 3 ? "default" : "secondary"} className="text-xs shrink-0 w-6 h-6 p-0 flex items-center justify-center">
                          {idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{t("soldOrders", { qty: product.quantity, orders: product.orders })}</p>
                        </div>
                        <span className="font-bold text-sm shrink-0">{formatCurrency(product.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-4 w-4 text-orange-600" />
                  {t("topPosProducts")}
                </CardTitle>
                <CardDescription>{t("topPosDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.channelDetails.pos.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("noPosSales")}</p>
                ) : (
                  <div className="space-y-3">
                    {data.channelDetails.pos.topProducts.map((product, idx) => (
                      <div key={`${product.productId}-${idx}`} className="flex items-center gap-3">
                        <Badge variant={idx < 3 ? "default" : "secondary"} className="text-xs shrink-0 w-6 h-6 p-0 flex items-center justify-center">
                          {idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{t("soldOrders", { qty: product.quantity, orders: product.orders })}</p>
                        </div>
                        <span className="font-bold text-sm shrink-0">{formatCurrency(product.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods by Channel */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  {t("onlinePayments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.channelDetails.online.paymentMethods).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("noData")}</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data.channelDetails.online.paymentMethods).map(([method, info]) => (
                      <div key={method} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          {method === "cod" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                          <div>
                            <p className="text-sm font-medium">{method === "cod" ? t("cashOnDelivery") : method === "tap" ? t("cardTap") : method}</p>
                            <p className="text-xs text-muted-foreground">{t("transactions", { count: info.count })}</p>
                          </div>
                        </div>
                        <span className="font-bold text-sm">{formatCurrency(info.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-4 w-4 text-orange-600" />
                  {t("posPayments")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.channelDetails.pos.paymentMethods).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("noData")}</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data.channelDetails.pos.paymentMethods).map(([method, info]) => (
                      <div key={method} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          {method === "cod" || method === "cash" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                          <div>
                            <p className="text-sm font-medium">{method === "cod" || method === "cash" ? t("cash") : method === "tap" ? t("cardTap") : method}</p>
                            <p className="text-xs text-muted-foreground">{t("transactions", { count: info.count })}</p>
                          </div>
                        </div>
                        <span className="font-bold text-sm">{formatCurrency(info.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══ Financials Tab ══ */}
        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("revenueBreakdown")}</CardTitle>
                <CardDescription>{t("financialSummary")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2">
                  <span>{t("grossRevenue")}</span>
                  <span className="font-bold">{formatCurrency(data.financials.grossRevenue)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">{t("shippingPlus")}</span>
                  <span>{formatCurrency(data.financials.totalShipping)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">{t("taxPlus")}</span>
                  <span>{formatCurrency(data.financials.totalTax)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-red-600">
                  <span>{t("discountsMinus")}</span>
                  <span>-{formatCurrency(data.financials.totalDiscounts)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-red-600">
                  <span>{t("refundsMinus", { count: data.financials.refundCount })}</span>
                  <span>-{formatCurrency(data.financials.totalRefunds)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>{t("netRevenue")}</span>
                  <span className="text-green-600">{formatCurrency(data.financials.netRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("paymentMethods")}</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("noPayments")}</p>
                ) : (
                  <div className="space-y-4">
                    {paymentData.map((pm) => (
                      <div key={pm.name} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                        <div className="flex items-center gap-3">
                          {pm.name === "Cash" ? <Banknote className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                          <div>
                            <p className="font-medium">{pm.name}</p>
                            <p className="text-xs text-muted-foreground">{t("transactions", { count: pm.count })}</p>
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
              <CardTitle>{t("topByRevenue")}</CardTitle>
              <CardDescription>{t("topByRevenueDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noProductSales")}</p>
              ) : (
                <div className="space-y-1">
                <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-12 gap-2 py-2 text-xs font-medium text-muted-foreground border-b">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">{t("product")}</div>
                    <div className="col-span-2 text-right">{t("revenue")}</div>
                    <div className="col-span-2 text-right">{t("qtySold")}</div>
                    <div className="col-span-2 text-right">{t("orders")}</div>
                  </div>
                  {data.topProducts.map((product, idx) => (
                    <div key={`${product.productId}-${idx}`} className="grid grid-cols-12 gap-2 py-3 border-b last:border-0 items-center">
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
                <CardTitle className="text-base">{t("revenueByProduct")}</CardTitle>
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
                      stroke="#000000"
                      fontSize={11}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#000000"
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
                      itemStyle={{ color: "var(--foreground)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value: number) => [formatCurrency(value), t("revenue")]}
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
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("uniqueCustomers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerInsights.uniqueCustomers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("newCustomerOrders")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerInsights.newCustomerOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("returningRate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerInsights.returningRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("newVsReturning")}</CardTitle>
              <CardDescription>{t("clickCardDetails")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => setCustomerDialog("new")}
                  className="text-center p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                >
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold text-blue-600">{data.customerInsights.newCustomerOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("newCustomerOrders")}</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium">{t("viewCustomers")}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerDialog("returning")}
                  className="text-center p-6 rounded-lg bg-green-50 dark:bg-green-900/20 hover:ring-2 hover:ring-green-400 transition-all cursor-pointer"
                >
                  <RotateCcw className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">{data.customerInsights.returningCustomerOrders}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t("returningCustomerOrders")}</p>
                  <p className="text-xs text-green-600 mt-2 font-medium">{t("viewCustomers")}</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details Dialog */}
          <Dialog open={customerDialog !== null} onOpenChange={(open) => !open && setCustomerDialog(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {customerDialog === "new" ? t("newCustomersTitle") : t("returningCustomersTitle")}
                </DialogTitle>
                <DialogDescription>
                  {customerDialog === "new"
                    ? t("newCustomersDesc", { count: data.customerInsights.newCustomers.length })
                    : t("returningCustomersDesc", { count: data.customerInsights.returningCustomers.length })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1 mt-2">
                <div className="grid grid-cols-12 gap-2 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-5">{t("customer")}</div>
                  <div className="col-span-2 text-right">{t("orders")}</div>
                  <div className="col-span-3 text-right">{t("revenue")}</div>
                  <div className="col-span-2 text-right">{t("lastOrder")}</div>
                </div>
                {(customerDialog === "new"
                  ? data.customerInsights.newCustomers
                  : data.customerInsights.returningCustomers
                ).map((customer, idx) => (
                  <div key={`${customer.email}-${idx}`} className="grid grid-cols-12 gap-2 py-3 border-b last:border-0 items-center">
                    <div className="col-span-5 min-w-0">
                      <p className="text-sm font-medium truncate">{customer.name || t("guest")}</p>
                      <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                    </div>
                    <div className="col-span-2 text-right text-sm">{customer.orders}</div>
                    <div className="col-span-3 text-right text-sm font-bold">{formatCurrency(customer.revenue)}</div>
                    <div className="col-span-2 text-right text-xs text-muted-foreground">
                      {new Date(customer.lastOrderDate).toLocaleDateString("en-SA", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
                {(customerDialog === "new"
                  ? data.customerInsights.newCustomers
                  : data.customerInsights.returningCustomers
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("noCustomersFound")}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ══ Abandoned Carts Tab ══ */}
        <TabsContent value="abandoned" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalAbandoned")}</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.abandonedCarts.abandoned}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("emailsSent")}</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.abandonedCarts.emailSent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("recovered")}</CardTitle>
                <RotateCcw className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.abandonedCarts.recovered}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("recoveryRate")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.abandonedCarts.recoveryRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("abandonedCartValue")}</CardTitle>
              <CardDescription>{t("abandonedCartDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="text-center p-6 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <p className="text-sm text-muted-foreground mb-1">{t("lostRevenue")}</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(data.abandonedCarts.abandonedValue)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("cartsAbandoned", { count: data.abandonedCarts.abandoned })}
                  </p>
                </div>
                <div className="text-center p-6 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-muted-foreground mb-1">{t("recovered")}</p>
                  <p className="text-3xl font-bold text-green-600">{t("recoveredOrders", { count: data.abandonedCarts.recovered })}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("recoveryRateText", { rate: data.abandonedCarts.recoveryRate.toFixed(1) })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abandoned Carts List */}
          <Card>
            <CardHeader>
              <CardTitle>{t("abandonedCarts")}</CardTitle>
              <CardDescription>{t("clickCartItems")}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.abandonedCarts.carts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noAbandonedCarts")}</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 py-2 text-xs font-medium text-muted-foreground border-b">
                    <div className="col-span-4">{t("customer")}</div>
                    <div className="col-span-2 text-right">{t("items")}</div>
                    <div className="col-span-2 text-right">{t("value")}</div>
                    <div className="col-span-2 text-center">{t("status")}</div>
                    <div className="col-span-2 text-right">{t("date")}</div>
                  </div>
                  {data.abandonedCarts.carts.map((cart) => (
                    <button
                      key={cart.id}
                      type="button"
                      onClick={() => setSelectedCart(cart)}
                      className="grid grid-cols-12 gap-2 py-3 border-b last:border-0 items-center w-full text-left hover:bg-muted/50 rounded-md px-1 transition-colors cursor-pointer"
                    >
                      <div className="col-span-4 min-w-0">
                        <p className="text-sm font-medium truncate">{cart.email || t("guest")}</p>
                        {cart.phone && <p className="text-xs text-muted-foreground">{cart.phone}</p>}
                      </div>
                      <div className="col-span-2 text-right text-sm">
                        {cart.items.reduce((s, i) => s + i.quantity, 0)} {t("items").toLowerCase()}
                      </div>
                      <div className="col-span-2 text-right text-sm font-bold">
                        {formatCurrency(cart.subtotal)}
                      </div>
                      <div className="col-span-2 text-center">
                        <Badge variant={cart.status === "RECOVERED" ? "default" : cart.status === "EMAIL_SENT" ? "secondary" : "destructive"} className="text-xs">
                          {cart.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-right text-xs text-muted-foreground">
                        {new Date(cart.createdAt).toLocaleDateString("en-SA", { month: "short", day: "numeric" })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abandoned Cart Detail Dialog */}
          <Dialog open={selectedCart !== null} onOpenChange={(open) => !open && setSelectedCart(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              {selectedCart && (
                <>
                  <DialogHeader>
                    <DialogTitle>{t("abandonedCartDialog")}</DialogTitle>
                    <DialogDescription>
                      {selectedCart.email || t("guest")} · {new Date(selectedCart.createdAt).toLocaleDateString("en-SA", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant={selectedCart.status === "RECOVERED" ? "default" : selectedCart.status === "EMAIL_SENT" ? "secondary" : "destructive"}>
                        {selectedCart.status.replace(/_/g, " ")}
                      </Badge>
                      {selectedCart.phone && (
                        <span className="text-muted-foreground">{t("phone", { phone: selectedCart.phone })}</span>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{t("itemsInCart", { count: selectedCart.items.length })}</p>
                      {selectedCart.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 rounded-md object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{t("qty", { count: item.quantity })}</p>
                          </div>
                          <span className="font-bold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>{t("total")}</span>
                      <span>{formatCurrency(selectedCart.subtotal)}</span>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
