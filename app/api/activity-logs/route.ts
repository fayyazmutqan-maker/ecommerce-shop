import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (entityType) conditions.push(eq(activityLogs.entityType, entityType));
    if (action) conditions.push(eq(activityLogs.action, action));
    if (userId) conditions.push(eq(activityLogs.userId, userId));
    if (from) conditions.push(gte(activityLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(activityLogs.createdAt, new Date(to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, totalResult] = await Promise.all([
      db.query.activityLogs.findMany({
        where,
        orderBy: desc(activityLogs.createdAt),
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(where),
    ]);

    const total = Number(totalResult[0].count);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Activity logs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}

// POST — create activity log entry (internal use)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userName, action, entityType, entityId, details, ipAddress } = body;

    if (!action || !entityType) {
      return NextResponse.json({ error: "Action and entityType required" }, { status: 400 });
    }

    const [log] = await db.insert(activityLogs).values({
      userId: userId || null,
      userName: userName || null,
      action,
      entityType,
      entityId: entityId || null,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
    }).returning();

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Activity log POST error:", error);
    return NextResponse.json({ error: "Failed to create log entry" }, { status: 500 });
  }
}
