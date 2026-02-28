import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { users, staffPermissions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

const VALID_PERMISSIONS = [
  "products", "orders", "customers", "discounts",
  "content", "settings", "analytics", "import_export",
] as const;

const staffActionSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  permissions: z.array(z.enum(VALID_PERMISSIONS)).default([]),
});

/**
 * GET /api/staff — List staff members with their permissions
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffUsers = await db.query.users.findMany({
      where: eq(users.role, "STAFF"),
      columns: { id: true, name: true, email: true, image: true, phone: true, createdAt: true },
      with: { staffPermissions: { columns: { permission: true } } },
    });

    const results = staffUsers.map((user) => ({
      ...user,
      permissions: user.staffPermissions.map((p) => p.permission),
      staffPermissions: undefined,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

/**
 * POST /api/staff — Promote a user to STAFF role
 * Body: { userId: string, permissions: string[] }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = staffActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { userId, permissions } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update role to STAFF
    await db.update(users).set({ role: "STAFF" }).where(eq(users.id, userId));

    // Clear existing permissions and set new ones
    await db.delete(staffPermissions).where(eq(staffPermissions.userId, userId));
    if (Array.isArray(permissions) && permissions.length > 0) {
      await db.insert(staffPermissions).values(
        permissions.map((permission: string) => ({
          userId,
          permission,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff POST error:", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

/**
 * PUT /api/staff — Update permissions for a staff user
 * Body: { userId: string, permissions: string[] }
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = staffActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { userId, permissions } = parsed.data;

    // Clear and re-set permissions
    await db.delete(staffPermissions).where(eq(staffPermissions.userId, userId));
    if (Array.isArray(permissions) && permissions.length > 0) {
      await db.insert(staffPermissions).values(
        permissions.map((permission: string) => ({
          userId,
          permission,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff PUT error:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}

/**
 * DELETE /api/staff — Demote staff back to CUSTOMER and remove all permissions
 * Query: ?userId=xxx
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await db.delete(staffPermissions).where(eq(staffPermissions.userId, userId));
    await db.update(users).set({ role: "CUSTOMER" }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove staff" }, { status: 500 });
  }
}
