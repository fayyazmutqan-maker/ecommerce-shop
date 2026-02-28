"use client";

import { useEffect, useState } from "react";
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
      toast.error("Failed to load data");
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
        toast.error(err.error || "Failed to save");
        return;
      }
      toast.success("Shipping settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Shipping Settings</h1>
        <p className="text-muted-foreground">Configure shipping rates, zones, and methods</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> General Shipping</CardTitle>
          <CardDescription>Global shipping configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Shipping</Label>
            <Switch checked={settings.shippingEnabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, shippingEnabled: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Free Shipping Minimum (SAR)</Label>
              <Input value={settings.freeShippingMin} onChange={(e) => setSettings((s) => ({ ...s, freeShippingMin: e.target.value }))} type="number" placeholder="e.g. 200" />
            </div>
            <div className="space-y-2">
              <Label>Flat Shipping Rate (SAR)</Label>
              <Input value={settings.flatShippingRate} onChange={(e) => setSettings((s) => ({ ...s, flatShippingRate: e.target.value }))} type="number" placeholder="e.g. 25" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shipping Zones ({zones.length})</CardTitle>
              <CardDescription>Manage zones from the <a href="/admin/shipping-zones" className="text-primary underline">Shipping Zones</a> page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No shipping zones configured</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead>Rates</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{z.countries}</TableCell>
                    <TableCell>{z.rates?.length || 0} rates</TableCell>
                    <TableCell>
                      <Badge variant={z.isActive ? "default" : "secondary"}>{z.isActive ? "Active" : "Inactive"}</Badge>
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
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
