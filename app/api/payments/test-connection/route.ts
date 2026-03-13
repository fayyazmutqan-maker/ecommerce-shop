import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/payments/test-connection
 * Tests the Tap API connection using the stored secret key — server-side only.
 * The secret key never leaves the server.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tapSecretKey = process.env.TAP_SECRET_KEY;
    if (!tapSecretKey) {
      return NextResponse.json(
        { error: "TAP_SECRET_KEY not configured in environment variables." },
        { status: 400 }
      );
    }

    // Use the Tap /v2/charges/list endpoint with a minimal request to verify the key
    const res = await fetch("https://api.tap.company/v2/charges/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tapSecretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        period: { date: { from: Date.now(), to: Date.now() } },
        limit: 1,
      }),
    });

    if (res.ok || res.status === 200) {
      return NextResponse.json({ status: "connected" });
    }

    const error = await res.json().catch(() => ({}));
    return NextResponse.json(
      {
        status: "failed",
        message: error?.errors?.[0]?.description || "Invalid API key",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json(
      { status: "failed", message: "Connection failed" },
      { status: 500 }
    );
  }
}
