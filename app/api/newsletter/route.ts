import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { subscribers } from "@/lib/schema";
import { eq, count, desc } from "drizzle-orm";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// POST /api/newsletter - Subscribe to newsletter
export async function POST(req: NextRequest) {
  const rlResponse = await rateLimitResponse(formLimiter, getClientIp(req));
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json();
    const { email } = subscribeSchema.parse(body);

    const existing = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, email),
    });

    if (existing) {
      if (existing.status === "UNSUBSCRIBED") {
        await db.update(subscribers).set({
          status: "ACTIVE",
          unsubscribedAt: null,
          subscribedAt: new Date(),
        }).where(eq(subscribers.email, email));
        return NextResponse.json({ message: "Welcome back! You have been re-subscribed." });
      }
      return NextResponse.json({ message: "You are already subscribed!" });
    }

    await db.insert(subscribers).values({ email });

    return NextResponse.json({ message: "Successfully subscribed to our newsletter!" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

// DELETE /api/newsletter - Unsubscribe
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const subscriber = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, email),
    });

    if (!subscriber || subscriber.status === "UNSUBSCRIBED") {
      return NextResponse.json({ message: "Email not found in our subscriber list" }, { status: 404 });
    }

    await db.update(subscribers).set({
      status: "UNSUBSCRIBED",
      unsubscribedAt: new Date(),
    }).where(eq(subscribers.email, email));

    return NextResponse.json({ message: "Successfully unsubscribed" });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}

// GET /api/newsletter - Admin: list subscribers
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIVE";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const [subscriberList, [activeCount], [unsubscribedCount], [totalForStatus]] = await Promise.all([
      db.query.subscribers.findMany({
        where: eq(subscribers.status, status),
        orderBy: desc(subscribers.subscribedAt),
        limit,
        offset,
      }),
      db.select({ value: count() }).from(subscribers).where(eq(subscribers.status, "ACTIVE")),
      db.select({ value: count() }).from(subscribers).where(eq(subscribers.status, "UNSUBSCRIBED")),
      db.select({ value: count() }).from(subscribers).where(eq(subscribers.status, status)),
    ]);

    const counts = {
      active: activeCount.value,
      unsubscribed: unsubscribedCount.value,
    };

    return NextResponse.json({
      subscribers: subscriberList,
      counts,
      pagination: { page, limit, total: totalForStatus.value, totalPages: Math.ceil(totalForStatus.value / limit) },
    });
  } catch (error) {
    console.error("Newsletter list error:", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}
