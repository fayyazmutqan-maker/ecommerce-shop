import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Allowed origins for mutating API requests (CSRF protection) */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin requests don't send Origin
  return ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin === new URL(allowed).origin);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";
  const isStaff = req.auth?.user?.role === "STAFF";
  const isAdminOrStaff = isAdmin || isStaff;

  // ── CSRF origin check for mutating API requests ──
  if (
    pathname.startsWith("/api/") &&
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS" &&
    // Exclude webhook endpoints (server-to-server)
    !pathname.startsWith("/api/payments/webhook") &&
    !pathname.startsWith("/api/payments/callback")
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

  // Protect payment test-connection (admin only)
  // NOTE: create-charge allows guests (ownership is verified in the route handler)
  if (pathname.startsWith("/api/payments/test-connection")) {
    if (!isLoggedIn) {
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
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://goSellJSLib.b-cdn.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.s3.*.amazonaws.com https://placehold.co https://lh3.googleusercontent.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.tap.company https://vitals.vercel-insights.com",
      "frame-src 'self' https://goSellJSLib.b-cdn.net",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  return response;
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
  ],
};
