"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="w-full max-w-[440px] shadow-none border">
          <CardHeader className="text-center space-y-3">
            <CardTitle className="text-2xl font-bold">{t("invalidLink")}</CardTitle>
            <CardDescription>{t("invalidLinkDesc")}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/forgot-password" className="text-foreground hover:underline font-semibold">
              {t("requestNewLink")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="w-full max-w-[440px] shadow-none border">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center"><CheckCircle className="h-12 w-12 text-green-500" /></div>
            <CardTitle className="text-2xl font-bold">{t("passwordReset")}</CardTitle>
            <CardDescription>{t("passwordResetDesc")}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push("/login")}>{t("goToLogin")}</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("passwordsNoMatch"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("passwordMinLength"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess(true);
        toast.success(t("passwordResetSuccess"));
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
          <CardTitle className="text-2xl font-bold">{t("resetPassword")}</CardTitle>
          <CardDescription className="text-[15px]">{t("resetPasswordDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-7">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">{t("newPassword")}</Label>
              <Input id="password" type="password" placeholder="••••••••" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">{t("confirmPassword")}</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" required minLength={8}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className="h-11" />
            </div>
            <Button type="submit" className="w-full h-12 text-[15px] font-semibold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("resetPassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
