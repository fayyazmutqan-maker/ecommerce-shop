import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { PermissionKey } from "@/lib/permissions";
import { getStaffPermissions } from "@/lib/permissions";

/**
 * Map API path prefixes to the staff permission required.
 * ADMIN users bypass this check entirely.
 * Routes not listed here don't require a specific staff permission.
 */
const STAFF_PERMISSION_MAP: { prefix: string; permission: PermissionKey }[] = [
  { prefix: "/api/products", permission: "products" },
  { prefix: "/api/categories", permission: "products" },
  { prefix: "/api/inventory-adjustments", permission: "products" },
  { prefix: "/api/product-groups", permission: "products" },
  { prefix: "/api/filters", permission: "products" },
  { prefix: "/api/orders", permission: "orders" },
  { prefix: "/api/fulfillments", permission: "orders" },
  { prefix: "/api/refunds", permission: "orders" },
  { prefix: "/api/returns", permission: "orders" },
  { prefix: "/api/draft-orders", permission: "orders" },
  { prefix: "/api/abandoned-carts", permission: "orders" },
  { prefix: "/api/customers", permission: "customers" },
  { prefix: "/api/discounts", permission: "discounts" },
  { prefix: "/api/coupons", permission: "discounts" },
  { prefix: "/api/auto-discounts", permission: "discounts" },
  { prefix: "/api/pages", permission: "content" },
  { prefix: "/api/templates", permission: "content" },
  { prefix: "/api/blog", permission: "content" },
  { prefix: "/api/navigations", permission: "content" },
  { prefix: "/api/settings", permission: "settings" },
  { prefix: "/api/shipping-zones", permission: "settings" },
  { prefix: "/api/analytics", permission: "analytics" },
  { prefix: "/api/import-export", permission: "import_export" },
  { prefix: "/api/smart-collections", permission: "products" },
  { prefix: "/api/gift-cards", permission: "orders" },
  { prefix: "/api/store-credit", permission: "orders" },
  { prefix: "/api/newsletter", permission: "content" },
  { prefix: "/api/notifications", permission: "orders" },
  { prefix: "/api/channels", permission: "channels" },
];

function getRequiredPermission(pathname: string): PermissionKey | null {
  for (const entry of STAFF_PERMISSION_MAP) {
    if (pathname.startsWith(entry.prefix)) return entry.permission;
  }
  return null;
}

/** Allowed origins for mutating API requests (CSRF protection) */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin requests don't send Origin
  return ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin === new URL(allowed).origin);
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";
  const isStaff = req.auth?.user?.role === "STAFF";
  const isAdminOrStaff = isAdmin || isStaff;

  // ── Redirect authenticated users away from auth pages ──
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";
  if (isAuthPage && isLoggedIn) {
    // If they came with a callbackUrl, honour it; otherwise go to account
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    // Strict validation: must be relative path, no protocol-relative, no encoded tricks
    const isSafeCallback = callbackUrl
      && callbackUrl.startsWith("/")
      && !callbackUrl.startsWith("//")
      && !callbackUrl.includes("://")
      && !/[\x00-\x1f]/.test(callbackUrl);
    if (isSafeCallback) {
      return NextResponse.redirect(new URL(callbackUrl, req.url));
    }
    if (isAdminOrStaff) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/account", req.url));
  }

  // ── Protect /account routes — require authentication ──
  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── CSRF origin check for mutating API requests ──
  if (
    pathname.startsWith("/api/") &&
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS" &&
    // Exclude webhook endpoints (server-to-server)
    !pathname.startsWith("/api/payments/webhook") &&
    !pathname.startsWith("/api/payments/callback") &&
    !pathname.startsWith("/api/channels/meta/webhook") &&
    !pathname.startsWith("/api/channels/google/callback") &&
    !pathname.startsWith("/api/channels/whatsapp/webhook") &&
    !pathname.startsWith("/api/channels/tiktok/webhook") &&
    !pathname.startsWith("/api/channels/tiktok/callback") &&
    !pathname.startsWith("/api/channels/snapchat/webhook") &&
    !pathname.startsWith("/api/channels/snapchat/callback")
  ) {
    const origin = req.headers.get("origin");
    if (origin && !isOriginAllowed(origin)) {
      console.warn(
        JSON.stringify({ _type: "audit", action: "CSRF_BLOCKED", origin, path: pathname, timestamp: new Date().toISOString() })
      );
      return NextResponse.json(
        { error: "Forbidden — origin not allowed" },
        { status: 403 }
      );
    }
  }

  // Protect admin routes — allow both ADMIN and STAFF
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdminOrStaff) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // ── Enforce granular staff permissions ──
  // ADMIN users bypass — only STAFF users are permission-checked.
  // Public endpoints (customer-facing GETs, evaluate, checkout) are excluded.
  if (
    isStaff &&
    pathname.startsWith("/api/") &&
    // Exclude public/checkout endpoints
    !pathname.startsWith("/api/auto-discounts/evaluate") &&
    !pathname.startsWith("/api/shipping-zones/calculate") &&
    !pathname.startsWith("/api/payments/")
  ) {
    const requiredPerm = getRequiredPermission(pathname);
    if (requiredPerm) {
      const perms = await getStaffPermissions(req.auth!.user!.id!);
      if (!perms.includes(requiredPerm)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }
  }

  // Protect admin API routes (mutating operations) — ADMIN or STAFF
  if (pathname.startsWith("/api/products") && req.method !== "GET") {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname.startsWith("/api/upload")) {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Settings — ADMIN only
  if (pathname.startsWith("/api/settings") && req.method !== "GET") {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Orders — require auth for non-GET EXCEPT POST (guest checkout allowed)
  // Guest checkout is rate-limited and validated in the route handler itself
  if (pathname.startsWith("/api/orders") && req.method !== "GET" && req.method !== "POST") {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect new admin API routes — ADMIN or STAFF
  if (
    pathname.startsWith("/api/refunds") ||
    pathname.startsWith("/api/fulfillments") ||
    pathname.startsWith("/api/returns")
  ) {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Staff management — ADMIN only
  if (pathname.startsWith("/api/staff")) {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect admin-only CRUD routes — ADMIN or STAFF
  // Exception: /api/auto-discounts/evaluate is a public POST endpoint for checkout
  if (
    (pathname.startsWith("/api/categories") ||
      pathname.startsWith("/api/discounts") ||
      pathname.startsWith("/api/pages") ||
      pathname.startsWith("/api/customers") ||
      pathname.startsWith("/api/shipping-zones") ||
      (pathname.startsWith("/api/auto-discounts") && !pathname.startsWith("/api/auto-discounts/evaluate")) ||
      pathname.startsWith("/api/draft-orders") ||
      pathname.startsWith("/api/abandoned-carts") ||
      pathname.startsWith("/api/gift-cards") ||
      pathname.startsWith("/api/blog") ||
      pathname.startsWith("/api/smart-collections") ||
      pathname.startsWith("/api/store-credit") ||
      pathname.startsWith("/api/activity-logs") ||
      pathname.startsWith("/api/notifications") ||
      pathname.startsWith("/api/inventory-adjustments") ||
      pathname.startsWith("/api/import-export")) &&
    req.method !== "GET"
  ) {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Also protect GET for admin-only routes
  if (
    (pathname.startsWith("/api/abandoned-carts") ||
      pathname.startsWith("/api/draft-orders") ||
      pathname.startsWith("/api/import-export") ||
      pathname.startsWith("/api/activity-logs") ||
      pathname.startsWith("/api/notifications") ||
      pathname.startsWith("/api/inventory-adjustments") ||
      pathname.startsWith("/api/customers") ||
      pathname.startsWith("/api/gift-cards") ||
      pathname.startsWith("/api/store-credit") ||
      pathname.startsWith("/api/refunds") ||
      pathname.startsWith("/api/staff")) &&
    req.method === "GET"
  ) {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect user-auth routes (wishlist, addresses, reviews POST)
  if (
    pathname.startsWith("/api/wishlist") ||
    pathname.startsWith("/api/addresses") ||
    (pathname.startsWith("/api/reviews") && req.method !== "GET")
  ) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect payment endpoints
  // test-connection — admin only
  if (pathname.startsWith("/api/payments/test-connection")) {
    if (!isLoggedIn || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect navigations mutations — ADMIN or STAFF
  if (pathname.startsWith("/api/navigations") && req.method !== "GET") {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect newsletter admin actions (not subscribe)
  if (
    pathname.startsWith("/api/newsletter") &&
    req.method !== "POST" &&
    req.method !== "GET"
  ) {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect product-groups mutations
  if (pathname.startsWith("/api/product-groups") && req.method !== "GET") {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect filters mutations
  if (pathname.startsWith("/api/filters") && req.method !== "GET") {
    if (!isLoggedIn || !isAdminOrStaff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  const isDev = process.env.NODE_ENV === "development";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://cdnjs.cloudflare.com https://goSellJSLib.b-cdn.net https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.amazonaws.com https://placehold.co https://lh3.googleusercontent.com",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' https://api.tap.company https://vitals.vercel-insights.com${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
      "frame-src 'self' https://goSellJSLib.b-cdn.net https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      isDev ? "" : "upgrade-insecure-requests",
    ].filter(Boolean).join("; ")
  );

  return response;
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/account/:path*",
  ],
};
