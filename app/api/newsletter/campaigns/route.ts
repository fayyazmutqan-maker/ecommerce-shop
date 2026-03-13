import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { newsletterCampaigns, subscribers } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { sendNewsletterEmail } from "@/lib/email";
import { audit, auditMeta } from "@/lib/audit";

const campaignSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  previewText: z.string().max(200).optional(),
  content: z.string().min(1, "Content is required").max(50000),
});

// GET /api/newsletter/campaigns — list campaigns
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const campaigns = await db.query.newsletterCampaigns.findMany({
      orderBy: desc(newsletterCampaigns.createdAt),
      limit,
      offset,
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Campaign list error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// POST /api/newsletter/campaigns — create & send a campaign
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { subject, previewText, content } = parsed.data;

    // Get all active subscribers
    const activeSubscribers = await db.query.subscribers.findMany({
      where: eq(subscribers.status, "ACTIVE"),
      columns: { email: true },
    });

    if (activeSubscribers.length === 0) {
      return NextResponse.json({ error: "No active subscribers to send to" }, { status: 400 });
    }

    // Create campaign record
    const [campaign] = await db.insert(newsletterCampaigns).values({
      subject,
      previewText: previewText || null,
      content,
      status: "SENDING",
      sentBy: session.user.email || session.user.id,
      recipientCount: activeSubscribers.length,
    }).returning();

    // Send emails in batches (avoid overwhelming the email provider)
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 1000; // 1 second between batches
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < activeSubscribers.length; i += BATCH_SIZE) {
      const batch = activeSubscribers.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((sub) =>
          sendNewsletterEmail({
            to: sub.email,
            subject,
            previewText: previewText || undefined,
            content,
            campaignId: campaign.id,
          })
        )
      );

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < activeSubscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Update campaign with results
    const finalStatus = failureCount === activeSubscribers.length ? "FAILED" : "SENT";
    await db.update(newsletterCampaigns).set({
      status: finalStatus,
      sentAt: new Date(),
      successCount,
      failureCount,
      updatedAt: new Date(),
    }).where(eq(newsletterCampaigns.id, campaign.id));

    audit({
      action: "NEWSLETTER_SENT",
      userId: session.user.id,
      email: session.user.email || undefined,
      ip: auditMeta(req).ip,
      resource: "newsletter_campaign",
      resourceId: campaign.id,
      details: { subject, recipientCount: activeSubscribers.length, successCount, failureCount },
      success: true,
    });

    return NextResponse.json({
      campaign: { ...campaign, status: finalStatus, sentAt: new Date(), successCount, failureCount },
      message: `Newsletter sent to ${successCount} subscribers${failureCount > 0 ? ` (${failureCount} failed)` : ""}`,
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
