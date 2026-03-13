"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Save } from "lucide-react";

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tapEnabled: false,
    tapTestMode: true,
    codEnabled: true,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          tapEnabled: data.tapEnabled ?? false,
          tapTestMode: data.tapTestMode ?? true,
          codEnabled: data.codEnabled ?? true,
        });
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
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }
      toast.success("Payment settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground">Configure payment gateways and methods</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Tap Payments
            <Badge variant={form.tapEnabled ? "default" : "secondary"}>
              {form.tapEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
          <CardDescription>Accept credit/debit cards via Tap Payments gateway</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Tap Payments</Label>
            <Switch checked={form.tapEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, tapEnabled: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Test Mode</Label>
              <p className="text-xs text-muted-foreground">Use Tap test/sandbox environment</p>
            </div>
            <Switch checked={form.tapTestMode} onCheckedChange={(v) => setForm((f) => ({ ...f, tapTestMode: v }))} />
          </div>
          <p className="text-xs text-muted-foreground">API keys are configured via environment variables (TAP_SECRET_KEY, TAP_PUBLIC_KEY)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash on Delivery (COD)</CardTitle>
          <CardDescription>Allow customers to pay upon delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Enable COD</Label>
            <Switch checked={form.codEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, codEnabled: v }))} />
          </div>
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
