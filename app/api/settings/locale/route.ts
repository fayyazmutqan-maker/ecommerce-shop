import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  locale: z.enum(["en", "ar"]),
});

/**
 * POST /api/settings/locale — Set user locale preference via cookie
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const response = NextResponse.json({ locale: parsed.data.locale });
    response.cookies.set("locale", parsed.data.locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to set locale" }, { status: 500 });
  }
}
