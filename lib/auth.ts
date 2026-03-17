import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// ── Account lockout — in-memory + Redis-backed ────────────────────
// Tracks failed login attempts per email. After MAX_FAILED_ATTEMPTS,
// the account is locked for LOCKOUT_DURATION_MS.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store (per-instance; in production use Redis via rate-limiter)
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();

function recordFailedLogin(email: string) {
  const entry = failedAttempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  failedAttempts.set(email, entry);
}

function isAccountLocked(email: string): boolean {
  const entry = failedAttempts.get(email);
  if (!entry) return false;
  if (entry.lockedUntil > Date.now()) return true;
  // Lock expired — reset
  if (entry.lockedUntil > 0) {
    failedAttempts.delete(email);
  }
  return false;
}

function clearFailedAttempts(email: string) {
  failedAttempts.delete(email);
}

// Periodic cleanup of stale entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const key = "__auth_lockout_cleanup";
  const g = globalThis as Record<string, unknown>;
  if (!g[key]) {
    g[key] = setInterval(() => {
      const now = Date.now();
      for (const [email, entry] of failedAttempts.entries()) {
        if (entry.lockedUntil > 0 && entry.lockedUntil < now) {
          failedAttempts.delete(email);
        }
      }
    }, 5 * 60 * 1000);
  }
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        // Account lockout check — block brute-force attacks
        if (isAccountLocked(email)) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.password) {
          // Perform a dummy hash to prevent timing side-channel
          await bcrypt.compare(parsed.data.password, "$2a$12$000000000000000000000000000000000000000000000000000000");
          recordFailedLogin(email);
          return null;
        }

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!isValid) {
          recordFailedLogin(email);
          return null;
        }

        // Block unverified email accounts
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Successful login — clear failed attempts
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

      // Re-validate role from DB every 5 minutes to catch role changes / deactivation
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
