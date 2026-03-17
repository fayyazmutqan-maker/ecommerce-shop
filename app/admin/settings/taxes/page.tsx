"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Calculator, ShieldCheck, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

export default function TaxSettingsPage() {
  const t = useTranslations("admin.taxes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    taxRate: 15,
    taxIncluded: false,
    currency: "SAR",
    currencySymbol: "SAR",
    zatcaEnabled: true,
    vatNumber: "",
    commercialRegNo: "",
    zatcaEnvironment: "sandbox" as "sandbox" | "simulation" | "production",
  });

  // Onboarding state
  const [hasComplianceCsid, setHasComplianceCsid] = useState(false);
  const [hasProductionCsid, setHasProductionCsid] = useState(false);
  const [onboardStep, setOnboardStep] = useState<"idle" | "compliance-csid" | "compliance-check" | "production-csid">("idle");
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [csrInput, setCsrInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [complianceRequestId, setComplianceRequestId] = useState("");
  const [onboardResult, setOnboardResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          taxRate: data.taxRate != null ? data.taxRate * 100 : 15,
          taxIncluded: data.taxIncluded ?? false,
          currency: data.currency || "SAR",
          currencySymbol: data.currencySymbol || "SAR",
          zatcaEnabled: data.zatcaEnabled ?? true,
          vatNumber: data.vatNumber || "",
          commercialRegNo: data.commercialRegNo || "",
          zatcaEnvironment: data.zatcaEnvironment || "sandbox",
        });
        setHasComplianceCsid(!!data.zatcaCsid);
        setHasProductionCsid(!!data.zatcaPcsid);
      })
      .catch(() => toast.error(t("toasts.loadFailed")))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxRate: form.taxRate / 100,
          currency: form.currency,
          zatcaEnabled: form.zatcaEnabled,
          vatNumber: form.vatNumber || null,
          commercialRegNo: form.commercialRegNo || null,
          zatcaEnvironment: form.zatcaEnvironment,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t("toasts.saveError"));
        return;
      }
      toast.success(t("toasts.saved"));
    } catch {
      toast.error(t("toasts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleOnboardStep = async (step: "compliance-csid" | "compliance-check" | "production-csid") => {
    setOnboardLoading(true);
    setOnboardStep(step);
    setOnboardResult(null);
    try {
      const payload: Record<string, string> = { step };
      if (step === "compliance-csid") {
        if (!csrInput.trim() || !otpInput.trim()) {
          toast.error(t("toasts.csrOtpRequired"));
          return;
        }
        payload.csr = csrInput.trim();
        payload.otp = otpInput.trim();
      }
      if (step === "production-csid") {
        if (!complianceRequestId) {
          toast.error(t("toasts.completeStep1"));
          return;
        }
        payload.requestId = complianceRequestId;
      }

      const res = await fetch("/api/zatca/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setOnboardResult({ success: false, message: data.error || "Failed" });
        toast.error(data.error || t("toasts.onboardFailed"));
        return;
      }

      if (step === "compliance-csid") {
        setComplianceRequestId(data.requestId || "");
        setHasComplianceCsid(true);
        setOnboardResult({ success: true, message: `Compliance CSID obtained. Request ID: ${data.requestId}` });
        toast.success(t("toasts.complianceCsidObtained"));
      } else if (step === "compliance-check") {
        const passed = data.success;
        setOnboardResult({
          success: passed,
          message: passed
            ? `Compliance check passed (${data.validationStatus})`
            : `Compliance check failed: ${data.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`,
        });
        if (passed) toast.success(t("toasts.complianceCheckPassed"));
        else toast.error(t("toasts.complianceCheckFailed"));
      } else if (step === "production-csid") {
        setHasProductionCsid(true);
        setOnboardResult({ success: true, message: "Production CSID obtained. ZATCA integration is now active!" });
        toast.success(t("toasts.productionCsidObtained"));
      }
    } catch {
      setOnboardResult({ success: false, message: t("toasts.networkError") });
      toast.error(t("toasts.networkError"));
    } finally {
      setOnboardLoading(false);
      setOnboardStep("idle");
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">{t("loading")}</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> {t("vatConfig")}</CardTitle>
          <CardDescription>{t("vatConfigDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("taxRate")}</Label>
            <Input
              value={form.taxRate}
              onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
              type="number"
              min={0}
              max={100}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">{t("taxRateHelp")}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("pricesIncludeTax")}</Label>
              <p className="text-xs text-muted-foreground">{t("pricesIncludeTaxHelp")}</p>
            </div>
            <Switch checked={form.taxIncluded} onCheckedChange={(v) => setForm((f) => ({ ...f, taxIncluded: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("currencyCode")}</Label>
              <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("currencySymbol")}</Label>
              <Input value={form.currencySymbol} onChange={(e) => setForm((f) => ({ ...f, currencySymbol: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("taxExemptions")}</CardTitle>
          <CardDescription>{t("taxExemptionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("taxExemptionsInfo")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> {t("zatcaTitle")}</CardTitle>
          <CardDescription>{t("zatcaDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("enableZatca")}</Label>
              <p className="text-xs text-muted-foreground">{t("enableZatcaHelp")}</p>
            </div>
            <Switch checked={form.zatcaEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, zatcaEnabled: v }))} />
          </div>
          {form.zatcaEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t("vatRegNumber")}</Label>
                <Input
                  value={form.vatNumber}
                  onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
                  placeholder={t("vatRegPlaceholder")}
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">{t("vatRegHelp")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("commercialRegNo")}</Label>
                <Input
                  value={form.commercialRegNo}
                  onChange={(e) => setForm((f) => ({ ...f, commercialRegNo: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder={t("commercialRegPlaceholder")}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">{t("commercialRegHelp")}</p>
              </div>

              <Separator />

              {/* ZATCA API Integration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">{t("zatcaApi")}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("zatcaApiHelp")}</p>
                  </div>
                  <Badge variant={hasProductionCsid ? "default" : hasComplianceCsid ? "secondary" : "outline"}>
                    {hasProductionCsid ? t("statusActive") : hasComplianceCsid ? t("statusCompliance") : t("statusNotConnected")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>{t("environment")}</Label>
                  <Select value={form.zatcaEnvironment} onValueChange={(v) => setForm((f) => ({ ...f, zatcaEnvironment: v as typeof f.zatcaEnvironment }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">{t("envSandbox")}</SelectItem>
                      <SelectItem value="simulation">{t("envSimulation")}</SelectItem>
                      <SelectItem value="production">{t("envProduction")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("envHelp")}</p>
                </div>

                <Separator />

                {/* Onboarding Steps */}
                <div className="space-y-4">
                  <p className="text-sm font-medium">{t("onboardingSteps")}</p>

                  {/* Step 1: Compliance CSID */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {hasComplianceCsid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{t("step1Title")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      {t("step1Desc")}
                    </p>
                    {!hasComplianceCsid && (
                      <div className="ml-7 space-y-3">
                        <div className="space-y-2">
                          <Label>{t("csrLabel")}</Label>
                          <Textarea
                            value={csrInput}
                            onChange={(e) => setCsrInput(e.target.value)}
                            placeholder={t("csrPlaceholder")}
                            rows={3}
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("otpLabel")}</Label>
                          <Input
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder={t("otpPlaceholder")}
                            maxLength={6}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleOnboardStep("compliance-csid")}
                          disabled={onboardLoading || !csrInput.trim() || !otpInput.trim()}
                        >
                          {onboardLoading && onboardStep === "compliance-csid" ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("submitting")}</>
                          ) : t("submitToZatca")}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Compliance Check */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Circle className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{t("step2Title")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      {t("step2Desc")}
                    </p>
                    <div className="ml-7">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOnboardStep("compliance-check")}
                        disabled={onboardLoading || !hasComplianceCsid}
                      >
                        {onboardLoading && onboardStep === "compliance-check" ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("checking")}</>
                        ) : t("runComplianceCheck")}
                      </Button>
                    </div>
                  </div>

                  {/* Step 3: Production CSID */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {hasProductionCsid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{t("step3Title")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      {t("step3Desc")}
                    </p>
                    {!hasProductionCsid && (
                      <div className="ml-7">
                        <Button
                          size="sm"
                          onClick={() => handleOnboardStep("production-csid")}
                          disabled={onboardLoading || !hasComplianceCsid || !complianceRequestId}
                        >
                          {onboardLoading && onboardStep === "production-csid" ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("activating")}</>
                          ) : t("getProductionCert")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Onboarding Result Message */}
                {onboardResult && (
                  <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${onboardResult.success ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                    {onboardResult.success ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <span>{onboardResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </div>
  );
}
