"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Save, TestTube } from "lucide-react";

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    tapEnabled: false,
    tapTestMode: true,
    tapPublicKey: "",
    tapSecretKey: "",
    codEnabled: true,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          tapEnabled: data.tapEnabled ?? false,
          tapTestMode: data.tapTestMode ?? true,
          tapPublicKey: data.tapPublicKey || "",
          tapSecretKey: data.tapSecretKey || "",
          codEnabled: data.codEnabled ?? true,
        });
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.tapSecretKey.startsWith("sk_****")) {
        delete (payload as Record<string, unknown>).tapSecretKey;
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/payments/test-connection", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
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
          <div className="space-y-2">
            <Label>Public Key</Label>
            <Input value={form.tapPublicKey} onChange={(e) => setForm((f) => ({ ...f, tapPublicKey: e.target.value }))} placeholder="pk_test_..." />
          </div>
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <Input value={form.tapSecretKey} onChange={(e) => setForm((f) => ({ ...f, tapSecretKey: e.target.value }))} placeholder="sk_test_..." type="password" />
            <p className="text-xs text-muted-foreground">Secret keys are masked after saving for security</p>
          </div>
          {form.tapEnabled && (
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          )}
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
