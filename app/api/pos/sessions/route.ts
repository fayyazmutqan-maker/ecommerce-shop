import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { posSessions } from "@/lib/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { serializeDecimal, toNumber } from "@/lib/decimal";

// ── GET — list POS sessions or get active session ──
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const active = url.searchParams.get("active");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Get the currently active (open) session for this staff member
    if (active === "true") {
      const [openSession] = await db
        .select()
        .from(posSessions)
        .where(and(
          eq(posSessions.staffId, session.user.id!),
          eq(posSessions.status, "OPEN"),
        ))
        .limit(1);

      return NextResponse.json(serializeDecimal({
        session: openSession || null,
      }));
    }

    // List all sessions (for admin reports)
    const sessions = await db
      .select()
      .from(posSessions)
      .orderBy(desc(posSessions.openedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(serializeDecimal({ sessions }));
  } catch (error) {
    console.error("POS sessions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch POS sessions" }, { status: 500 });
  }
}

// ── POST — open a new register session ──
const openSessionSchema = z.object({
  openingBalance: z.number().min(0),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = openSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Check for existing open session
    const [existing] = await db
      .select()
      .from(posSessions)
      .where(and(
        eq(posSessions.staffId, session.user.id!),
        eq(posSessions.status, "OPEN"),
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "You already have an open register session. Close it first." },
        { status: 409 },
      );
    }

    const [newSession] = await db
      .insert(posSessions)
      .values({
        staffId: session.user.id!,
        staffName: session.user.name || session.user.email || "Staff",
        openingBalance: parsed.data.openingBalance.toFixed(2),
        notes: parsed.data.notes,
        status: "OPEN",
      })
      .returning();

    audit({
      action: "POS_SESSION_OPENED",
      userId: session.user.id,
      resource: "PosSession",
      resourceId: newSession.id,
      details: { openingBalance: parsed.data.openingBalance },
      success: true,
    });

    return NextResponse.json(serializeDecimal({ session: newSession }));
  } catch (error) {
    console.error("POS session POST error:", error);
    return NextResponse.json({ error: "Failed to open register session" }, { status: 500 });
  }
}

// ── PATCH — close a register session ──
const closeSessionSchema = z.object({
  sessionId: z.string().min(1),
  closingBalance: z.number().min(0),
  notes: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = closeSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Find the open session
    const [posSession] = await db
      .select()
      .from(posSessions)
      .where(and(
        eq(posSessions.id, parsed.data.sessionId),
        eq(posSessions.status, "OPEN"),
      ))
      .limit(1);

    if (!posSession) {
      return NextResponse.json({ error: "No open session found" }, { status: 404 });
    }

    // Close the session
    const [closed] = await db
      .update(posSessions)
      .set({
        closedAt: new Date(),
        closingBalance: parsed.data.closingBalance.toFixed(2),
        notes: parsed.data.notes || posSession.notes,
        status: "CLOSED",
      })
      .where(eq(posSessions.id, parsed.data.sessionId))
      .returning();

    audit({
      action: "POS_SESSION_CLOSED",
      userId: session.user.id,
      resource: "PosSession",
      resourceId: closed.id,
      details: {
        openingBalance: toNumber(posSession.openingBalance),
        closingBalance: parsed.data.closingBalance,
        totalSales: toNumber(posSession.totalSales),
        totalOrders: posSession.totalOrders,
        variance: parsed.data.closingBalance - toNumber(posSession.openingBalance) - toNumber(posSession.totalSales),
      },
      success: true,
    });

    return NextResponse.json(serializeDecimal({ session: closed }));
  } catch (error) {
    console.error("POS session PATCH error:", error);
    return NextResponse.json({ error: "Failed to close register session" }, { status: 500 });
  }
}
