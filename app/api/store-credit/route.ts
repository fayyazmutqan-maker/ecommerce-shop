import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storeCreditTransactions, users } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

const creditSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().min(0.01).max(100000),
  type: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().max(500).nullable().optional(),
  orderId: z.string().nullable().optional(),
});

// GET — get store credit balance for a user
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || session.user.id;
    const admin = searchParams.get("admin") === "true";

    // Non-admins can only check their own balance
    if (userId !== session.user.id && !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all transactions
    const transactions = await db.query.storeCreditTransactions.findMany({
      where: eq(storeCreditTransactions.userId, userId),
      orderBy: desc(storeCreditTransactions.createdAt),
    });

    // Calculate balance
    const balance = transactions.reduce((sum, t) => {
      return t.type === "CREDIT" ? sum + Number(t.amount) : sum - Number(t.amount);
    }, 0);

    if (admin) {
      return NextResponse.json({ balance, transactions });
    }

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Store credit GET error:", error);
    return NextResponse.json({ error: "Failed to fetch store credit" }, { status: 500 });
  }
}

// POST — add or deduct store credit (admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = creditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Wrap in transaction with row lock to prevent race conditions
    const transaction = await db.transaction(async (tx) => {
      // Verify user exists — lock the user row to serialize concurrent credit operations
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, data.userId))
        .for("update");

      if (!user) throw new Error("USER_NOT_FOUND");

      // For debits, check balance inside the transaction
      if (data.type === "DEBIT") {
        const txns = await tx.query.storeCreditTransactions.findMany({
          where: eq(storeCreditTransactions.userId, data.userId),
        });
        const balance = txns.reduce((sum, t) => {
          return t.type === "CREDIT" ? sum + Number(t.amount) : sum - Number(t.amount);
        }, 0);

        if (data.amount > balance + 0.001) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
      }

      const [record] = await tx.insert(storeCreditTransactions).values({
        userId: data.userId,
        amount: data.amount.toFixed(2),
        type: data.type,
        reason: data.reason || null,
        orderId: data.orderId || null,
        processedBy: session.user.id,
      }).returning();

      return record;
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "Insufficient store credit balance" }, { status: 400 });
      }
    }
    console.error("Store credit POST error:", error);
    return NextResponse.json({ error: "Failed to process store credit" }, { status: 500 });
  }
}
