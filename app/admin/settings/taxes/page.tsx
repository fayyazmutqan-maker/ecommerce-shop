"use client";

import { useEffect, useState } from "react";
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
      .catch(() => toast.error("Failed to load settings"))
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
        toast.error(err.error || "Failed to save");
        return;
      }
      toast.success("Tax settings saved");
    } catch {
      toast.error("Failed to save settings");
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
          toast.error("CSR and OTP are required");
          return;
        }
        payload.csr = csrInput.trim();
        payload.otp = otpInput.trim();
      }
      if (step === "production-csid") {
        if (!complianceRequestId) {
          toast.error("Complete Step 1 first to get the Compliance Request ID");
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
        toast.error(data.error || "Onboarding step failed");
        return;
      }

      if (step === "compliance-csid") {
        setComplianceRequestId(data.requestId || "");
        setHasComplianceCsid(true);
        setOnboardResult({ success: true, message: `Compliance CSID obtained. Request ID: ${data.requestId}` });
        toast.success("Compliance CSID obtained successfully");
      } else if (step === "compliance-check") {
        const passed = data.success;
        setOnboardResult({
          success: passed,
          message: passed
            ? `Compliance check passed (${data.validationStatus})`
            : `Compliance check failed: ${data.errors?.map((e: { message: string }) => e.message).join(", ") || "Unknown error"}`,
        });
        if (passed) toast.success("Compliance check passed");
        else toast.error("Compliance check failed");
      } else if (step === "production-csid") {
        setHasProductionCsid(true);
        setOnboardResult({ success: true, message: "Production CSID obtained. ZATCA integration is now active!" });
        toast.success("Production CSID obtained — ZATCA integration active!");
      }
    } catch {
      setOnboardResult({ success: false, message: "Network error" });
      toast.error("Failed to connect to server");
    } finally {
      setOnboardLoading(false);
      setOnboardStep("idle");
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Tax Settings</h1>
        <p className="text-muted-foreground">Configure tax rates and VAT for your store</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> VAT Configuration</CardTitle>
          <CardDescription>Saudi Arabia requires 15% VAT on most goods (ZATCA regulations)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              value={form.taxRate}
              onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
              type="number"
              min={0}
              max={100}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">Standard ZATCA VAT rate is 15%</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Prices Include Tax</Label>
              <p className="text-xs text-muted-foreground">If enabled, product prices are treated as tax-inclusive</p>
            </div>
            <Switch checked={form.taxIncluded} onCheckedChange={(v) => setForm((f) => ({ ...f, taxIncluded: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency Code</Label>
              <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Input value={form.currencySymbol} onChange={(e) => setForm((f) => ({ ...f, currencySymbol: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Exemptions</CardTitle>
          <CardDescription>Individual customers can be marked as tax-exempt from the customer detail page</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Products can be individually marked as non-taxable in the product editor.
            Tax-exempt customers will not be charged VAT regardless of product settings.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> ZATCA E-Invoicing</CardTitle>
          <CardDescription>Configure ZATCA Phase 2 compliance for Saudi e-invoicing (Fatoora). When enabled, invoices are reported to ZATCA automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable ZATCA E-Invoicing</Label>
              <p className="text-xs text-muted-foreground">Generate ZATCA-compliant QR codes and report invoices to ZATCA</p>
            </div>
            <Switch checked={form.zatcaEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, zatcaEnabled: v }))} />
          </div>
          {form.zatcaEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>VAT Registration Number</Label>
                <Input
                  value={form.vatNumber}
                  onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
                  placeholder="e.g. 300000000000003"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">15-digit VAT number issued by ZATCA</p>
              </div>
              <div className="space-y-2">
                <Label>Commercial Registration Number</Label>
                <Input
                  value={form.commercialRegNo}
                  onChange={(e) => setForm((f) => ({ ...f, commercialRegNo: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="e.g. 1010000000"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">CR number from the Ministry of Commerce</p>
              </div>

              <Separator />

              {/* ZATCA API Integration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">ZATCA API Integration</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Connect to the ZATCA Fatoora platform for automatic invoice reporting</p>
                  </div>
                  <Badge variant={hasProductionCsid ? "default" : hasComplianceCsid ? "secondary" : "outline"}>
                    {hasProductionCsid ? "Active" : hasComplianceCsid ? "Compliance Only" : "Not Connected"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={form.zatcaEnvironment} onValueChange={(v) => setForm((f) => ({ ...f, zatcaEnvironment: v as typeof f.zatcaEnvironment }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="simulation">Simulation</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Start with Sandbox for testing, then move to Production after verification</p>
                </div>

                <Separator />

                {/* Onboarding Steps */}
                <div className="space-y-4">
                  <p className="text-sm font-medium">Onboarding Steps</p>

                  {/* Step 1: Compliance CSID */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {hasComplianceCsid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">Step 1: Get Compliance CSID</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      Submit your CSR (Certificate Signing Request) and OTP from ZATCA to receive a compliance certificate.
                    </p>
                    {!hasComplianceCsid && (
                      <div className="ml-7 space-y-3">
                        <div className="space-y-2">
                          <Label>CSR (Base64)</Label>
                          <Textarea
                            value={csrInput}
                            onChange={(e) => setCsrInput(e.target.value)}
                            placeholder="Paste your CSR here..."
                            rows={3}
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>OTP</Label>
                          <Input
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="6-digit OTP from ZATCA"
                            maxLength={6}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleOnboardStep("compliance-csid")}
                          disabled={onboardLoading || !csrInput.trim() || !otpInput.trim()}
                        >
                          {onboardLoading && onboardStep === "compliance-csid" ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                          ) : "Submit to ZATCA"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Compliance Check */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Circle className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Step 2: Compliance Invoice Check</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      Submit a test invoice to verify your setup is compliant with ZATCA requirements.
                    </p>
                    <div className="ml-7">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOnboardStep("compliance-check")}
                        disabled={onboardLoading || !hasComplianceCsid}
                      >
                        {onboardLoading && onboardStep === "compliance-check" ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
                        ) : "Run Compliance Check"}
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
                      <span className="font-medium">Step 3: Get Production CSID</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">
                      Exchange your compliance certificate for a production certificate to start reporting real invoices.
                    </p>
                    {!hasProductionCsid && (
                      <div className="ml-7">
                        <Button
                          size="sm"
                          onClick={() => handleOnboardStep("production-csid")}
                          disabled={onboardLoading || !hasComplianceCsid || !complianceRequestId}
                        >
                          {onboardLoading && onboardStep === "production-csid" ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
                          ) : "Get Production Certificate"}
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
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
