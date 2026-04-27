"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ShoppingBag, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { PhoneInputField } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Step = "register" | "verify";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("register");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState<string | undefined>();
  const [resendCooldown, setResendCooldown] = useState(0);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error(t("passwordsNoMatch"));
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error(t("passwordMinLength"));
      setIsLoading(false);
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error(t("passwordRequirements"));
      setIsLoading(false);
      return;
    }

    if (!phone || !isValidPhoneNumber(phone)) {
      toast.error(t("invalidPhone"));
      setIsLoading(false);
      return;
    }

    try {
      if (turnstileSiteKey && !turnstileToken) {
        toast.error(t("completeCaptcha"));
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || tCommon("somethingWentWrong"));
        turnstileRef.current?.reset();
      } else {
        setRegisteredEmail(email.trim().toLowerCase());
        setStep("verify");
        setResendCooldown(60);
        toast.success(t("otpSent"));
      }
    } catch {
      toast.error(tCommon("somethingWentWrong"));
      turnstileRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerifyOTP = useCallback(async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || tCommon("somethingWentWrong"));
        setOtp("");
      } else {
        toast.success(t("emailVerified"));
        router.push("/login?verified=success");
      }
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }, [otp, registeredEmail, router, t, tCommon]);

  async function handleResendOTP() {
    if (resendCooldown > 0) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      if (res.ok) {
        toast.success(t("otpResent"));
        setResendCooldown(60);
        setOtp("");
      } else {
        const data = await res.json();
        toast.error(data.error || tCommon("somethingWentWrong"));
      }
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }

  // OTP Verification Step
  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <Card className="w-full max-w-[440px] shadow-none border">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">{t("verifyYourEmail")}</CardTitle>
            <CardDescription className="text-[15px]">
              {t("otpSentTo", { email: registeredEmail })}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-7">
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {t("otpExpiresIn")}
              </p>

              <Button
                onClick={handleVerifyOTP}
                className="w-full h-12 text-[15px] font-semibold"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t("verifyEmail")}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{t("didntReceiveCode")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={isLoading || resendCooldown > 0}
                  className="text-sm"
                >
                  {resendCooldown > 0
                    ? t("resendIn", { seconds: resendCooldown })
                    : t("resendCode")}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setStep("register");
                  setOtp("");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("backToRegister")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration Form Step
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
          <CardTitle className="text-2xl font-bold">{t("createAccountTitle")}</CardTitle>
          <CardDescription className="text-[15px]">
            {t("createAccountDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">{t("fullName")}</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">{t("phone")}</Label>
              <PhoneInputField
                value={phone}
                onChange={setPhone}
                id="phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
                className="h-11"
              />
            </div>
            {/* Honeypot — hidden from real users, bots auto-fill it */}
            <div className="absolute opacity-0 -z-10" aria-hidden="true" tabIndex={-1}>
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {turnstileSiteKey && (
              <Turnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken("")}
                onExpire={() => setTurnstileToken("")}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 text-[15px] font-semibold"
                disabled={isLoading}
                asChild={!isLoading}
              >
                {isLoading ? (
                  <span>{tCommon("cancel")}</span>
                ) : (
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {tCommon("cancel")}
                  </Link>
                )}
              </Button>
              <Button type="submit" className="h-12 text-[15px] font-semibold" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("createAccountTitle")}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground px-7 pt-2">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-foreground hover:underline font-semibold ml-1">
            {t("signIn")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
