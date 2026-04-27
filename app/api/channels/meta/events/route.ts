/**
 * Meta Conversions API Events Endpoint
 *
 * POST /api/channels/meta/events — Track server-side events
 *
 * Used by the storefront to send conversion events (AddToCart, ViewContent, Search)
 * to Meta Conversions API via the server for improved attribution.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  trackProductView,
  trackAddToCart,
  trackInitiateCheckout,
  trackSearch,
  trackPageView,
  extractTrackingContext,
} from "@/lib/conversions";
import { isRequestAbortedError } from "@/lib/request-errors";

const eventSchema = z.object({
  event: z.enum(["ViewContent", "AddToCart", "InitiateCheckout", "Search", "PageView"]),
  productId: z.string().optional(),
  productName: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().default("SAR"),
  quantity: z.number().default(1),
  query: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number(),
  })).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const { event, productId, productName, value, currency, quantity, query, items } = parsed.data;
    const session = await auth();
    const context = extractTrackingContext(req, session?.user?.id);

    // Fire-and-forget — don't block the response
    switch (event) {
      case "ViewContent":
        if (productId) {
          trackProductView(
            { productId, productName: productName || "", value: value || 0, currency },
            context,
          ).catch(() => {});
        }
        break;
      case "AddToCart":
        if (productId) {
          trackAddToCart(
            { productId, value: value || 0, currency, quantity },
            context,
          ).catch(() => {});
        }
        break;
      case "InitiateCheckout":
        trackInitiateCheckout(
          value || 0,
          currency,
          items || [],
          context,
        ).catch(() => {});
        break;
      case "Search":
        if (query) {
          trackSearch({ query }, context).catch(() => {});
        }
        break;
      case "PageView":
        trackPageView(context).catch(() => {});
        break;
    }

    return NextResponse.json({ tracked: true });
  } catch (error) {
    if (isRequestAbortedError(error)) {
      return new Response(null, { status: 204 });
    }

    console.error("Meta event tracking error:", error);
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}
