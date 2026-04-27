"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const verificationMessages: Record<string, { type: "success" | "error"; key: string }> = {
  success: { type: "success", key: "emailVerified" },
  expired: { type: "error", key: "verificationExpired" },
  invalid: { type: "error", key: "invalidVerification" },
  error: { type: "error", key: "verificationError" },
};

/** Validate callback URL — prevent open redirect attacks */
function sanitizeCallbackUrl(raw: string): string {
  // Must start with / and not // (protocol-relative)
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  // Block data:, javascript: schemes embedded in path
  if (/[?#]/.test(raw.split("/")[1] || "")) return "/";
  // Block encoded characters that could bypass checks
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("//") || decoded.includes("://")) return "/";
  } catch {
    return "/"; // Malformed encoding
  }
  return raw;
}

function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/";
  const callbackUrl = sanitizeCallbackUrl(rawCallback);
  const verified = searchParams.get("verified");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (verified && verificationMessages[verified]) {
      const msg = verificationMessages[verified];
      if (msg.type === "success") {
        toast.success(t(msg.key));
      } else {
        toast.error(t(msg.key));
      }
    }
  }, [verified, t]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("ACCOUNT_LOCKED")) {
          toast.error(t("accountLocked"));
        } else if (result.error.includes("EMAIL_NOT_VERIFIED")) {
          toast.error(t("verifyEmailFirst"));
        } else {
          toast.error(t("invalidCredentials"));
        }
      } else {
        toast.success(t("loggedIn"));
        // Fetch fresh session to determine role-based redirect
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const role = session?.user?.role;
        const destination =
          (role === "ADMIN" || role === "STAFF") && callbackUrl === "/"
            ? "/admin"
            : callbackUrl;
        // Use window.location for a full navigation to ensure middleware
        // picks up the new session cookie and applies proper redirects
        window.location.href = destination;
        return; // prevent finally from resetting isLoading
      }
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      toast.error(t("failedGoogleSignIn"));
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-[440px] shadow-none border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="flex justify-center">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-8 w-8" />
              <span className="text-2xl font-bold">ShopFlow</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("welcomeBack")}</CardTitle>
          <CardDescription className="text-[15px]">
            {t("signInDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-7">
          {verified && verificationMessages[verified] && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              verificationMessages[verified].type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
            }`}>
              {verificationMessages[verified].type === "success"
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <XCircle className="h-4 w-4 shrink-0" />}
              {t(verificationMessages[verified].key)}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {t("continueWithGoogle")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground tracking-widest">
                {t("orContinueWith")}
              </span>
            </div>
          </div>

          <form onSubmit={onSubmit} method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@store.com"
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">{t("password")}</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 text-[15px] font-semibold"
                disabled={isLoading || isGoogleLoading}
                asChild={!isLoading && !isGoogleLoading}
              >
                {isLoading || isGoogleLoading ? (
                  <span>{tCommon("cancel")}</span>
                ) : (
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tCommon("cancel")}
                  </Link>
                )}
              </Button>
              <Button type="submit" className="h-12 text-[15px] font-semibold" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("signIn") || "Sign In"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground px-7 pt-2">
          <div>
            {t("dontHaveAccount")}{" "}
            <Link href="/register" className="text-foreground hover:underline font-semibold">
              {t("createOne")}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
