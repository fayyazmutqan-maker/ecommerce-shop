import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, sql } from "drizzle-orm";

// GET — fetch notifications for current admin/staff user
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const conditions = [];
    // Notifications for this user or global (userId = null)
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const notifs = await db.query.notifications.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(notifications.createdAt),
      limit,
    });

    // Unread count
    const unreadResult = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.isRead, false));
    const unreadCount = Number(unreadResult[0].count);

    return NextResponse.json({ notifications: notifs, unreadCount });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// POST — create notification (internal)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, type, title, message, entityType, entityId } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Type and title required" }, { status: 400 });
    }

    const [notif] = await db.insert(notifications).values({
      userId: userId || null,
      type,
      title,
      message: message || null,
      entityType: entityType || null,
      entityId: entityId || null,
    }).returning();

    return NextResponse.json(notif, { status: 201 });
  } catch (error) {
    console.error("Notification POST error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

// PUT — mark notifications as read
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (id) {
      const [notif] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
      return NextResponse.json(notif);
    }

    return NextResponse.json({ error: "ID or markAllRead required" }, { status: 400 });
  } catch (error) {
    console.error("Notification PUT error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// DELETE — delete notification
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Notification ID required" }, { status: 400 });

    await db.delete(notifications).where(eq(notifications.id, id));
    return NextResponse.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Notification DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
