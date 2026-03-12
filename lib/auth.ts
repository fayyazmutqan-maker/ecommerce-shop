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
  password: z.string().min(6),
});

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

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );
        if (!isValid) return null;

        // Block unverified email accounts
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox for the verification link.");
        }

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
            // User deleted — invalidate token
            token.role = "CUSTOMER";
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
