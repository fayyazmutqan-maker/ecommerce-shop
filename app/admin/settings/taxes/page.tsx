"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Calculator } from "lucide-react";

export default function TaxSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    taxRate: 15,
    taxIncluded: false,
    currency: "SAR",
    currencySymbol: "SAR",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          taxRate: data.taxRate != null ? data.taxRate * 100 : 15,
          taxIncluded: data.taxIncluded ?? false,
          currency: data.currency || "SAR",
          currencySymbol: data.currencySymbol || "SAR",
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
        body: JSON.stringify({
          taxRate: form.taxRate / 100,
          currency: form.currency,
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
          <div className="grid grid-cols-2 gap-4">
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
