/**
 * Staff permissions helper
 *
 * Permission keys:
 * - products: Manage products, categories, inventory
 * - orders: View/manage orders, fulfillments, refunds, returns
 * - customers: View/manage customers
 * - discounts: Manage discounts, coupons, auto-discounts
 * - content: Manage pages, templates
 * - settings: Store settings, shipping zones (ADMIN-only by default)
 * - analytics: View dashboard analytics
 * - import_export: Import/export data (ADMIN-only by default)
 */

import { db } from "@/lib/db";
import { staffPermissions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const ALL_PERMISSIONS = [
  { key: "products", label: "Products", description: "Manage products, categories, and inventory" },
  { key: "orders", label: "Orders", description: "View and manage orders, fulfillments, refunds, and returns" },
  { key: "customers", label: "Customers", description: "View and manage customer accounts" },
  { key: "discounts", label: "Discounts", description: "Manage discounts, coupons, and auto-discounts" },
  { key: "content", label: "Content", description: "Manage pages and email templates" },
  { key: "settings", label: "Settings", description: "Manage store settings and shipping zones" },
  { key: "analytics", label: "Analytics", description: "View dashboard and analytics" },
  { key: "import_export", label: "Import / Export", description: "Import and export data" },
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]["key"];

/**
 * Check if a user has a specific permission.
 * - ADMIN role has all permissions implicitly.
 * - STAFF role permissions are loaded from the staffPermissions table.
 * - CUSTOMER role has no admin permissions.
 */
export async function hasPermission(
  user: { role?: string; id?: string } | null | undefined,
  permission: PermissionKey
): Promise<boolean> {
  if (!user?.id || !user?.role) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;

  const allPerms = await getStaffPermissions(user.id);
  return allPerms.includes(permission);
}

/**
 * Get all permissions for a staff user.
 * Returns an empty array for non-staff users.
 */
export async function getStaffPermissions(userId: string): Promise<string[]> {
  const perms = await db
    .select({ permission: staffPermissions.permission })
    .from(staffPermissions)
    .where(eq(staffPermissions.userId, userId));

  return perms.map((p) => p.permission);
}

/**
 * Check if user is ADMIN or STAFF with specific permission.
 * Use this in API routes to replace `role !== "ADMIN"` checks.
 */
export async function requirePermission(
  session: { user?: { role?: string; id?: string } } | null,
  permission: PermissionKey
): Promise<{ authorized: boolean; error?: string }> {
  if (!session?.user) return { authorized: false, error: "Unauthorized" };
  if (session.user.role === "ADMIN") return { authorized: true };
  if (session.user.role === "STAFF") {
    const perms = await getStaffPermissions(session.user.id!);
    if (perms.includes(permission)) return { authorized: true };
    return { authorized: false, error: "Insufficient permissions" };
  }
  return { authorized: false, error: "Unauthorized" };
}
