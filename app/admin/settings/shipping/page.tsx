"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Save, Truck, Plus, Pencil, Trash2 } from "lucide-react";

interface ShippingZone {
  id: string;
  name: string;
  countries: string;
  regions: string | null;
  isActive: boolean;
  rates: { id: string; name: string; price: string; type: string; estimatedDays: string | null }[];
}

export default function ShippingSettingsPage() {
  const t = useTranslations("admin.shipping");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [settings, setSettings] = useState({
    shippingEnabled: true,
    freeShippingMin: "",
    flatShippingRate: "",
  });

  const fetchData = async () => {
    try {
      const [settingsRes, zonesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/shipping-zones"),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({
          shippingEnabled: data.shippingEnabled ?? true,
          freeShippingMin: data.freeShippingMin || "",
          flatShippingRate: data.flatShippingRate || "",
        });
      }
      if (zonesRes.ok) {
        setZones(await zonesRes.json());
      }
    } catch {
      toast.error(t("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shippingEnabled: settings.shippingEnabled,
      };
      if (settings.freeShippingMin) payload.freeShippingThreshold = parseFloat(settings.freeShippingMin);
      if (settings.flatShippingRate) payload.shippingFee = parseFloat(settings.flatShippingRate);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t("toasts.saveError"));
        return;
      }
      toast.success(t("toasts.saved"));
    } catch {
      toast.error(t("toasts.saveError"));
    } finally {
      setSaving(false);
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
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> {t("generalShipping")}</CardTitle>
          <CardDescription>{t("generalShippingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("enableShipping")}</Label>
            <Switch checked={settings.shippingEnabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, shippingEnabled: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("freeShippingMin")}</Label>
              <Input value={settings.freeShippingMin} onChange={(e) => setSettings((s) => ({ ...s, freeShippingMin: e.target.value }))} type="number" placeholder={t("freeShippingMinPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("flatShippingRate")}</Label>
              <Input value={settings.flatShippingRate} onChange={(e) => setSettings((s) => ({ ...s, flatShippingRate: e.target.value }))} type="number" placeholder={t("flatShippingRatePlaceholder")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("shippingZones", { count: zones.length })}</CardTitle>
              <CardDescription>{t.rich("shippingZonesDesc", { link: (chunks) => <a href="/admin/shipping-zones" className="text-primary underline">{chunks}</a> })}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t("noZones")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("zone")}</TableHead>
                  <TableHead>{t("countries")}</TableHead>
                  <TableHead>{t("rates")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{z.countries}</TableCell>
                    <TableCell>{t("rateCount", { count: z.rates?.length || 0 })}</TableCell>
                    <TableCell>
                      <Badge variant={z.isActive ? "default" : "secondary"}>{z.isActive ? t("active") : t("inactive")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
