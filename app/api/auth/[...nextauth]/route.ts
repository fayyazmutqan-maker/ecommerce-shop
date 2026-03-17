import { handlers } from "@/lib/auth";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(authLimiter, ip);
  if (rlResponse) return rlResponse;

  return handlers.POST(req);
}
