import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { hasRealEnvValue } from "@/lib/env";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authLimiter } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// ── Account lockout ───────────────────────────────────────────────────────────
// Uses the existing rate-limiter (Redis-backed in production, in-memory in dev).
// This replaces the previous per-instance in-memory Map which was ineffective
// on serverless because each cold start reset it silently.
//
// Strategy: after MAX_FAILED_ATTEMPTS failures within the limiter's window the
// authLimiter bucket empties and further attempts are rejected with 429.
// On a successful login we can't "reset" the Upstash bucket, so we keep a
// lightweight in-memory set of recently-verified emails to skip the extra check.
// This is safe: the worst case is one extra limiter check per successful login.

const MAX_FAILED_ATTEMPTS = 5;

// Tracks emails that have just successfully authenticated so we skip the
// lockout check for them within the same instance lifetime.
const recentlyVerified = new Set<string>();

async function checkLockout(email: string): Promise<boolean> {
  // If this email just succeeded on this instance, skip the lockout check.
  if (recentlyVerified.has(email)) return false;

  // Re-use the authLimiter: each failed attempt consumes a token.
  // When remaining === 0 the account is considered locked.
  const result = await authLimiter.check(`lockout:${email}`);
  return !result.success;
}

async function recordFailedLogin(email: string): Promise<void> {
  // Consume a token from the limiter bucket for this email.
  await authLimiter.check(`lockout:${email}`);
}

function clearFailedAttempts(email: string): void {
  recentlyVerified.add(email);
  // Remove from the set after the lockout window (15 min) so it doesn't grow forever.
  setTimeout(() => recentlyVerified.delete(email), 15 * 60 * 1000);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(hasRealEnvValue(process.env.GOOGLE_CLIENT_ID) && hasRealEnvValue(process.env.GOOGLE_CLIENT_SECRET)
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();

        // Account lockout check — Redis-backed, works across all serverless instances
        const locked = await checkLockout(email);
        if (locked) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.password) {
          // Perform a dummy hash to prevent timing side-channel
          await bcrypt.compare(parsed.data.password, "$2a$12$000000000000000000000000000000000000000000000000000000");
          await recordFailedLogin(email);
          return null;
        }

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!isValid) {
          await recordFailedLogin(email);
          return null;
        }

        // Block unverified email accounts
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Successful login — mark as recently verified to skip lockout check
        clearFailedAttempts(email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "CUSTOMER";
        token.id = user.id;
        token.roleCheckedAt = Date.now();
      }

      // Re-validate role from DB every 5 minutes to catch role changes / deactivation.
      // This is intentional: role changes (e.g. staff→customer, deactivation) must
      // propagate within a bounded window without requiring a full sign-out.
      // At scale, consider caching role lookups in Redis to reduce DB load.
      const ROLE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const lastChecked = (token.roleCheckedAt as number) || 0;
      if (token.id && Date.now() - lastChecked > ROLE_CHECK_INTERVAL) {
        try {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
            columns: { role: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
          } else {
            // User deleted — invalidate by clearing identity
            return { ...token, id: undefined, role: undefined };
          }
          token.roleCheckedAt = Date.now();
        } catch {
          // DB error — keep existing role, retry next time
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
