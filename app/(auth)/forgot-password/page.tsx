"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
        toast.success(t("resetLinkSent"));
      } else {
        const err = await res.json();
        toast.error(err.error || tCommon("somethingWentWrong"));
      }
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
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
            <CardTitle className="text-2xl font-bold">{t("checkYourEmail")}</CardTitle>
            <CardDescription className="text-[15px]">
              {t("resetEmailSent", { email })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground px-7 pt-4">
            <Link href="/login" className="text-foreground hover:underline font-semibold inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> {t("backToLogin")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
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
          <CardTitle className="text-2xl font-bold">{t("forgotPasswordTitle")}</CardTitle>
          <CardDescription className="text-[15px]">{t("forgotPasswordDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-7">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t("email")}</Label>
              <Input id="email" type="email" placeholder="you@example.com" required
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-11" />
            </div>
            <Button type="submit" className="w-full h-12 text-[15px] font-semibold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("sendResetLink")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground px-7 pt-2">
          <Link href="/login" className="text-foreground hover:underline font-semibold inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> {t("backToLogin")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
