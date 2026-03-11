import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { serializeDecimal } from "@/lib/decimal";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";
import {
  orders,
  orderItems,
  products,
  users,
  abandonedCarts,
  refunds,
} from "@/lib/schema";

/**
 * GET /api/analytics — Comprehensive analytics data
 * Query params:
 * - from: ISO date (start of range)
 * - to: ISO date (end of range)
 * - granularity: "day" | "week" | "month" (default: "day")
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const granularity = searchParams.get("granularity") || "day";

    // Default: last 30 days
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = toParam ? new Date(toParam) : now;

    // Previous period for comparison (same duration before `from`)
    const duration = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - duration);
    const prevTo = from;

    // ── Parallel data fetches ──
    const [
      currentOrders,
      previousOrders,
      currentCustomers,
      previousCustomers,
      topProductsData,
      onlineTopProducts,
      posTopProducts,
      channelTimeSeries,
      abandonedData,
      refundsData,
      allCustomersCount,
      activeProductsCount,
      revenueTimeSeries,
    ] = await Promise.all([
      // Current period orders
      db.query.orders.findMany({
        where: and(gte(orders.createdAt, from), lte(orders.createdAt, to)),
        columns: {
          id: true, totalAmount: true, subtotal: true, taxAmount: true,
          shippingAmount: true, discountAmount: true, status: true,
          source: true, paymentStatus: true, email: true, userId: true,
          createdAt: true, paymentMethod: true,
        },
      }),

      // Previous period orders (for comparison)
      db.query.orders.findMany({
        where: and(gte(orders.createdAt, prevFrom), lte(orders.createdAt, prevTo)),
        columns: { id: true, totalAmount: true, status: true, source: true, createdAt: true },
      }),

      // New customers in current period
      db.select({ value: count() }).from(users).where(
        and(eq(users.role, "CUSTOMER"), gte(users.createdAt, from), lte(users.createdAt, to))
      ),

      // New customers in previous period
      db.select({ value: count() }).from(users).where(
        and(eq(users.role, "CUSTOMER"), gte(users.createdAt, prevFrom), lte(users.createdAt, prevTo))
      ),

      // Top products by revenue in period
      db.select({
        productId: orderItems.productId,
        name: orderItems.name,
        totalRevenue: sql<string>`SUM(CAST(${orderItems.totalPrice} AS NUMERIC))`,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        orderCount: count(),
      })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
        .groupBy(orderItems.productId, orderItems.name)
        .orderBy(sql`SUM(CAST(${orderItems.totalPrice} AS NUMERIC)) DESC`)
        .limit(10),

      // Top products by channel (Online)
      db.select({
        productId: orderItems.productId,
        name: orderItems.name,
        totalRevenue: sql<string>`SUM(CAST(${orderItems.totalPrice} AS NUMERIC))`,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        orderCount: count(),
      })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to), eq(orders.source, "ONLINE")))
        .groupBy(orderItems.productId, orderItems.name)
        .orderBy(sql`SUM(CAST(${orderItems.totalPrice} AS NUMERIC)) DESC`)
        .limit(10),

      // Top products by channel (POS)
      db.select({
        productId: orderItems.productId,
        name: orderItems.name,
        totalRevenue: sql<string>`SUM(CAST(${orderItems.totalPrice} AS NUMERIC))`,
        totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
        orderCount: count(),
      })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to), eq(orders.source, "POS")))
        .groupBy(orderItems.productId, orderItems.name)
        .orderBy(sql`SUM(CAST(${orderItems.totalPrice} AS NUMERIC)) DESC`)
        .limit(10),

      // Revenue time series by channel
      db.select({
        date: sql<string>`DATE(${orders.createdAt})`,
        source: orders.source,
        revenue: sql<string>`SUM(CAST(${orders.totalAmount} AS NUMERIC))`,
        orderCount: count(),
      })
        .from(orders)
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
        .groupBy(sql`DATE(${orders.createdAt})`, orders.source)
        .orderBy(sql`DATE(${orders.createdAt})`),

      // Abandoned carts in period
      db.query.abandonedCarts.findMany({
        where: and(gte(abandonedCarts.createdAt, from), lte(abandonedCarts.createdAt, to)),
        columns: { id: true, status: true, subtotal: true, createdAt: true, email: true, phone: true, items: true },
      }),

      // Refunds in period
      db.query.refunds.findMany({
        where: and(gte(refunds.createdAt, from), lte(refunds.createdAt, to)),
        columns: { id: true, amount: true, createdAt: true },
      }),

      // Total customers
      db.select({ value: count() }).from(users).where(eq(users.role, "CUSTOMER")),

      // Active products
      db.select({ value: count() }).from(products).where(eq(products.status, "ACTIVE")),

      // Revenue time series (grouped by day)
      db.select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<string>`SUM(CAST(${orders.totalAmount} AS NUMERIC))`,
        orderCount: count(),
      })
        .from(orders)
        .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
        .groupBy(sql`DATE(${orders.createdAt})`)
        .orderBy(sql`DATE(${orders.createdAt})`),
    ]);

    // ── Compute metrics ──
    const currentRevenue = currentOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const previousRevenue = previousOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const currentOrderCount = currentOrders.length;
    const previousOrderCount = previousOrders.length;
    const avgOrderValue = currentOrderCount ? currentRevenue / currentOrderCount : 0;
    const prevAvgOrderValue = previousOrderCount ? previousRevenue / previousOrderCount : 0;

    // Revenue breakdown
    const grossRevenue = currentOrders.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalTax = currentOrders.reduce((s, o) => s + Number(o.taxAmount), 0);
    const totalShipping = currentOrders.reduce((s, o) => s + Number(o.shippingAmount), 0);
    const totalDiscounts = currentOrders.reduce((s, o) => s + Number(o.discountAmount), 0);
    const totalRefunds = refundsData.reduce((s, r) => s + Number(r.amount), 0);
    const netRevenue = currentRevenue - totalRefunds;

    // Sales by channel
    const onlineOrders = currentOrders.filter((o) => o.source === "ONLINE");
    const posOrders = currentOrders.filter((o) => o.source === "POS");
    const onlineRevenue = onlineOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const posRevenue = posOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

    // Per-channel payment methods
    const onlinePaymentMethods: Record<string, { count: number; revenue: number }> = {};
    for (const o of onlineOrders) {
      const method = o.paymentMethod || "unknown";
      if (!onlinePaymentMethods[method]) onlinePaymentMethods[method] = { count: 0, revenue: 0 };
      onlinePaymentMethods[method].count++;
      onlinePaymentMethods[method].revenue += Number(o.totalAmount);
    }
    const posPaymentMethods: Record<string, { count: number; revenue: number }> = {};
    for (const o of posOrders) {
      const method = o.paymentMethod || "unknown";
      if (!posPaymentMethods[method]) posPaymentMethods[method] = { count: 0, revenue: 0 };
      posPaymentMethods[method].count++;
      posPaymentMethods[method].revenue += Number(o.totalAmount);
    }

    // Channel time series (merge into single array with online/pos columns)
    const channelTimeMap: Record<string, { onlineRevenue: number; posRevenue: number; onlineOrders: number; posOrders: number }> = {};
    for (const row of channelTimeSeries) {
      const key = row.date;
      if (!channelTimeMap[key]) channelTimeMap[key] = { onlineRevenue: 0, posRevenue: 0, onlineOrders: 0, posOrders: 0 };
      if (row.source === "ONLINE") {
        channelTimeMap[key].onlineRevenue = Number(row.revenue);
        channelTimeMap[key].onlineOrders = row.orderCount;
      } else {
        channelTimeMap[key].posRevenue = Number(row.revenue);
        channelTimeMap[key].posOrders = row.orderCount;
      }
    }
    const channelTimeSeriesFormatted = Object.entries(channelTimeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, ...d }));

    // Payment methods
    const paymentMethods: Record<string, { count: number; revenue: number }> = {};
    for (const o of currentOrders) {
      const method = o.paymentMethod || "unknown";
      if (!paymentMethods[method]) paymentMethods[method] = { count: 0, revenue: 0 };
      paymentMethods[method].count++;
      paymentMethods[method].revenue += Number(o.totalAmount);
    }

    // Order status distribution
    const statusDistribution: Record<string, number> = {};
    for (const o of currentOrders) {
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
    }

    // Returning vs new customers — build detailed lists (online only, exclude POS)
    const onlineOnlyOrders = currentOrders.filter((o) => o.source !== "POS");
    const uniqueCustomerEmails = new Set(onlineOnlyOrders.map((o) => o.email));
    const customerOrderMap: Record<string, { email: string; userId: string | null; orders: number; revenue: number; firstOrderDate: Date; lastOrderDate: Date }> = {};
    for (const o of onlineOnlyOrders) {
      if (!customerOrderMap[o.email]) {
        customerOrderMap[o.email] = {
          email: o.email,
          userId: o.userId,
          orders: 0,
          revenue: 0,
          firstOrderDate: o.createdAt,
          lastOrderDate: o.createdAt,
        };
      }
      const c = customerOrderMap[o.email];
      c.orders++;
      c.revenue += Number(o.totalAmount);
      if (o.createdAt < c.firstOrderDate) c.firstOrderDate = o.createdAt;
      if (o.createdAt > c.lastOrderDate) c.lastOrderDate = o.createdAt;
    }
    const customerList = Object.values(customerOrderMap);
    const newCustomerList = customerList.filter((c) => c.orders === 1);
    const returningCustomerList = customerList.filter((c) => c.orders > 1);
    const newCustomerOrders = newCustomerList.reduce((s, c) => s + c.orders, 0);
    const returningCustomerOrders = returningCustomerList.reduce((s, c) => s + c.orders, 0);

    // Fetch user names for customer lists
    const customerEmails = customerList.map((c) => c.email);
    const customerUsers = customerEmails.length > 0
      ? await db.query.users.findMany({
          where: sql`${users.email} IN (${sql.join(customerEmails.map(e => sql`${e}`), sql`, `)})`,
          columns: { email: true, name: true },
        })
      : [];
    const emailToName: Record<string, string> = {};
    for (const u of customerUsers) {
      if (u.name) emailToName[u.email] = u.name;
    }

    // Abandoned cart metrics
    const abandonedCount = abandonedData.filter((c) => c.status === "ABANDONED").length;
    const recoveredCount = abandonedData.filter((c) => c.status === "RECOVERED").length;
    const emailSentCount = abandonedData.filter((c) => c.status === "EMAIL_SENT").length;
    const abandonedValue = abandonedData
      .filter((c) => c.status === "ABANDONED")
      .reduce((s, c) => s + Number(c.subtotal), 0);
    const recoveryRate = abandonedData.length ? (recoveredCount / abandonedData.length) * 100 : 0;

    // % change helpers
    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    // Aggregate time series by granularity
    let timeSeries = revenueTimeSeries.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: r.orderCount,
    }));

    if (granularity === "week") {
      const weekMap: Record<string, { revenue: number; orders: number }> = {};
      for (const point of timeSeries) {
        const d = new Date(point.date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const key = weekStart.toISOString().split("T")[0];
        if (!weekMap[key]) weekMap[key] = { revenue: 0, orders: 0 };
        weekMap[key].revenue += point.revenue;
        weekMap[key].orders += point.orders;
      }
      timeSeries = Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data }));
    } else if (granularity === "month") {
      const monthMap: Record<string, { revenue: number; orders: number }> = {};
      for (const point of timeSeries) {
        const key = point.date.substring(0, 7); // YYYY-MM
        if (!monthMap[key]) monthMap[key] = { revenue: 0, orders: 0 };
        monthMap[key].revenue += point.revenue;
        monthMap[key].orders += point.orders;
      }
      timeSeries = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data }));
    }

    return NextResponse.json({
      period: { from: from.toISOString(), to: to.toISOString(), granularity },

      overview: {
        totalRevenue: currentRevenue,
        revenueChange: pctChange(currentRevenue, previousRevenue),
        netRevenue,
        totalOrders: currentOrderCount,
        ordersChange: pctChange(currentOrderCount, previousOrderCount),
        avgOrderValue,
        avgOrderValueChange: pctChange(avgOrderValue, prevAvgOrderValue),
        newCustomers: currentCustomers[0].value,
        newCustomersChange: pctChange(currentCustomers[0].value, previousCustomers[0].value),
        totalCustomers: allCustomersCount[0].value,
        activeProducts: activeProductsCount[0].value,
      },

      financials: {
        grossRevenue,
        totalTax,
        totalShipping,
        totalDiscounts,
        totalRefunds,
        refundCount: refundsData.length,
        netRevenue,
      },

      salesByChannel: {
        online: { orders: onlineOrders.length, revenue: onlineRevenue },
        pos: { orders: posOrders.length, revenue: posRevenue },
      },

      channelDetails: {
        online: {
          orders: onlineOrders.length,
          revenue: onlineRevenue,
          avgOrderValue: onlineOrders.length ? onlineRevenue / onlineOrders.length : 0,
          topProducts: onlineTopProducts.map((p) => ({
            productId: p.productId,
            name: p.name,
            revenue: Number(p.totalRevenue),
            quantity: p.totalQuantity,
            orders: p.orderCount,
          })),
          paymentMethods: onlinePaymentMethods,
        },
        pos: {
          orders: posOrders.length,
          revenue: posRevenue,
          avgOrderValue: posOrders.length ? posRevenue / posOrders.length : 0,
          topProducts: posTopProducts.map((p) => ({
            productId: p.productId,
            name: p.name,
            revenue: Number(p.totalRevenue),
            quantity: p.totalQuantity,
            orders: p.orderCount,
          })),
          paymentMethods: posPaymentMethods,
        },
        timeSeries: channelTimeSeriesFormatted,
      },

      paymentMethods,
      orderStatusDistribution: statusDistribution,

      customerInsights: {
        uniqueCustomers: uniqueCustomerEmails.size,
        newCustomerOrders,
        returningCustomerOrders,
        returningRate: currentOrderCount
          ? (returningCustomerOrders / currentOrderCount) * 100
          : 0,
        newCustomers: newCustomerList
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 50)
          .map((c) => ({
            email: c.email,
            name: emailToName[c.email] || null,
            orders: c.orders,
            revenue: c.revenue,
            lastOrderDate: c.lastOrderDate.toISOString(),
          })),
        returningCustomers: returningCustomerList
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 50)
          .map((c) => ({
            email: c.email,
            name: emailToName[c.email] || null,
            orders: c.orders,
            revenue: c.revenue,
            lastOrderDate: c.lastOrderDate.toISOString(),
          })),
      },

      abandonedCarts: {
        total: abandonedData.length,
        abandoned: abandonedCount,
        emailSent: emailSentCount,
        recovered: recoveredCount,
        abandonedValue,
        recoveryRate,
        carts: abandonedData
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 50)
          .map((c) => {
            let items: Array<{ name: string; price: number; quantity: number; image?: string }> = [];
            try { items = JSON.parse(c.items); } catch {}
            return {
              id: c.id,
              email: c.email,
              phone: c.phone,
              status: c.status,
              subtotal: Number(c.subtotal),
              items,
              createdAt: c.createdAt.toISOString(),
            };
          }),
      },

      topProducts: topProductsData.map((p) => ({
        productId: p.productId,
        name: p.name,
        revenue: Number(p.totalRevenue),
        quantity: p.totalQuantity,
        orders: p.orderCount,
      })),

      timeSeries,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
