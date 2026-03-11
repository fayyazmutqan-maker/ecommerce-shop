import { NextResponse } from "next/server";
import { z } from "zod";
import { couponLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { sendContactFormNotification } from "@/lib/email";
import { db } from "@/lib/db";
import { storeSettings } from "@/lib/schema";

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
});

export async function POST(req: Request) {
  // Rate limit: prevent spam
  const rlResponse = await rateLimitResponse(couponLimiter, getClientIp(req));
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message } = parsed.data;

    // Get store email to send notification to
    const settings = await db.query.storeSettings.findFirst();
    const recipientEmail = settings?.storeEmail || process.env.ADMIN_EMAIL;

    if (recipientEmail) {
      await sendContactFormNotification({
        name,
        email,
        phone,
        subject: subject || "Contact Form Submission",
        message,
        recipientEmail,
      });
    }

    return NextResponse.json({ success: true, message: "Message received" });
  } catch (error) {
    console.error("Contact POST error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
