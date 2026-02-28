import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { giftCards, giftCardTransactions } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, gt, or, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { couponLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const createSchema = z.object({
  initialBalance: z.number().min(1).max(100000),
  recipientEmail: z.string().email().nullable().optional(),
  recipientName: z.string().max(200).nullable().optional(),
  senderName: z.string().max(200).nullable().optional(),
  message: z.string().max(1000).nullable().optional(),
  customerId: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
});

// GET — list all gift cards (admin) or check balance (public)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const admin = searchParams.get("admin") === "true";

    // Public: check gift card balance by code (rate-limited to prevent enumeration)
    if (code) {
      const ip = getClientIp(req);
      const rlResponse = await rateLimitResponse(couponLimiter, `gc:${ip}`);
      if (rlResponse) return rlResponse;

      const card = await db.query.giftCards.findFirst({
        where: and(
          eq(giftCards.code, code.toUpperCase().trim()),
          eq(giftCards.isActive, true),
          or(isNull(giftCards.expiresAt), gt(giftCards.expiresAt, new Date()))
        ),
      });
      if (!card) {
        return NextResponse.json({ error: "Invalid gift card" }, { status: 404 });
      }
      return NextResponse.json({
        currentBalance: card.currentBalance,
        currency: card.currency,
      });
    }

    // Admin: list all
    if (admin) {
      const session = await auth();
      if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const cards = await db.query.giftCards.findMany({
        orderBy: desc(giftCards.createdAt),
        with: { transactions: { orderBy: desc(giftCardTransactions.createdAt) } },
      });
      return NextResponse.json(cards);
    }

    return NextResponse.json({ error: "Code parameter required" }, { status: 400 });
  } catch (error) {
    console.error("Gift cards GET error:", error);
    return NextResponse.json({ error: "Failed to fetch gift cards" }, { status: 500 });
  }
}

// POST — create a new gift card (admin)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    let code = data.code?.toUpperCase().trim() || generateGiftCardCode();

    // Ensure unique code
    const existing = await db.query.giftCards.findFirst({ where: eq(giftCards.code, code) });
    if (existing) {
      code = generateGiftCardCode();
    }

    const balanceStr = data.initialBalance.toFixed(2);
    const [card] = await db.insert(giftCards).values({
      code,
      initialBalance: balanceStr,
      currentBalance: balanceStr,
      recipientEmail: data.recipientEmail || null,
      recipientName: data.recipientName || null,
      senderName: data.senderName || null,
      message: data.message || null,
      customerId: data.customerId || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    }).returning();

    // Create initial credit transaction
    await db.insert(giftCardTransactions).values({
      giftCardId: card.id,
      amount: balanceStr,
      type: "CREDIT",
      note: "Initial balance",
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("Gift card POST error:", error);
    return NextResponse.json({ error: "Failed to create gift card" }, { status: 500 });
  }
}

// PUT — update gift card or redeem
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, action, amount, isActive, orderId, note } = body;

    if (!id) {
      return NextResponse.json({ error: "Gift card ID required" }, { status: 400 });
    }

    // Admin/staff check for balance-modifying operations
    const isAdminOrStaff = ["ADMIN", "STAFF"].includes(session.user.role);

    // Redeem (debit) — wrapped in DB transaction with atomic balance check
    if (action === "REDEEM") {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      const result = await db.transaction(async (tx) => {
        // Lock the row with a SELECT ... FOR UPDATE equivalent via raw SQL
        const [card] = await tx
          .select()
          .from(giftCards)
          .where(eq(giftCards.id, id))
          .for("update");

        if (!card) throw new Error("NOT_FOUND");
        if (!card.isActive) throw new Error("INACTIVE");

        const currentBal = Number(card.currentBalance);
        if (amount > currentBal) throw new Error("INSUFFICIENT");

        // Atomic update — use SQL expression to prevent stale reads
        const newBalance = (currentBal - amount).toFixed(2);
        const [updated] = await tx.update(giftCards).set({
          currentBalance: newBalance,
          lastUsedAt: new Date(),
        }).where(eq(giftCards.id, id)).returning();

        await tx.insert(giftCardTransactions).values({
          giftCardId: id,
          amount: (-amount).toFixed(2),
          type: "DEBIT",
          orderId: orderId || null,
          note: note || "Redeemed at checkout",
        });

        return updated;
      });

      return NextResponse.json(result);
    }

    // Add balance (credit) — admin/staff only, wrapped in DB transaction
    if (action === "ADD_BALANCE") {
      if (!isAdminOrStaff) {
        return NextResponse.json({ error: "Unauthorized — admin/staff only" }, { status: 403 });
      }
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      const result = await db.transaction(async (tx) => {
        const [card] = await tx
          .select()
          .from(giftCards)
          .where(eq(giftCards.id, id))
          .for("update");

        if (!card) throw new Error("NOT_FOUND");

        const newBalance = (Number(card.currentBalance) + amount).toFixed(2);
        const [updated] = await tx.update(giftCards).set({
          currentBalance: newBalance,
        }).where(eq(giftCards.id, id)).returning();

        await tx.insert(giftCardTransactions).values({
          giftCardId: id,
          amount: amount.toFixed(2),
          type: "CREDIT",
          note: note || "Balance added by admin",
        });

        return updated;
      });

      return NextResponse.json(result);
    }

    // Toggle active status — admin/staff only
    if (typeof isActive === "boolean") {
      if (!isAdminOrStaff) {
        return NextResponse.json({ error: "Unauthorized — admin/staff only" }, { status: 403 });
      }
      const card = await db.query.giftCards.findFirst({ where: eq(giftCards.id, id) });
      if (!card) {
        return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
      }
      const [updated] = await db.update(giftCards).set({ isActive }).where(eq(giftCards.id, id)).returning();
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
      }
      if (error.message === "INACTIVE") {
        return NextResponse.json({ error: "Gift card is inactive" }, { status: 400 });
      }
      if (error.message === "INSUFFICIENT") {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }
    }
    console.error("Gift card PUT error:", error);
    return NextResponse.json({ error: "Failed to update gift card" }, { status: 500 });
  }
}

// DELETE — delete gift card (admin)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Gift card ID required" }, { status: 400 });

    await db.delete(giftCards).where(eq(giftCards.id, id));
    return NextResponse.json({ message: "Gift card deleted" });
  } catch (error) {
    console.error("Gift card DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete gift card" }, { status: 500 });
  }
}
