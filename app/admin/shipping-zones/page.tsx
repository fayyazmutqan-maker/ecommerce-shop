"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Globe,
  Truck,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface ShippingRate {
  id?: string;
  name: string;
  type: "FLAT" | "WEIGHT_BASED" | "PRICE_BASED" | "FREE";
  price: number;
  minWeight?: number | null;
  maxWeight?: number | null;
  minOrderAmount?: number | null;
  maxOrderAmount?: number | null;
  estimatedDays?: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  regions: string[];
  isActive: boolean;
  sortOrder: number;
  rates: ShippingRate[];
}

const COUNTRIES = [
  { code: "SA" },
  { code: "AE" },
  { code: "KW" },
  { code: "BH" },
  { code: "OM" },
  { code: "QA" },
  { code: "EG" },
  { code: "JO" },
  { code: "IQ" },
  { code: "LB" },
  { code: "*" },
];

const emptyRate: ShippingRate = {
  name: "",
  type: "FLAT",
  price: 0,
  minWeight: null,
  maxWeight: null,
  minOrderAmount: null,
  maxOrderAmount: null,
  estimatedDays: "",
  isActive: true,
  sortOrder: 0,
};

export default function ShippingZonesPage() {
  const t = useTranslations("admin.shippingZones");
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCountries, setFormCountries] = useState<string[]>([]);
  const [formRegions, setFormRegions] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formRates, setFormRates] = useState<ShippingRate[]>([{ ...emptyRate }]);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch("/api/shipping-zones");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const resetForm = () => {
    setFormName("");
    setFormCountries([]);
    setFormRegions("");
    setFormIsActive(true);
    setFormRates([{ ...emptyRate }]);
    setEditingZone(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (zone: ShippingZone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormCountries(zone.countries);
    setFormRegions(zone.regions?.join(", ") || "");
    setFormIsActive(zone.isActive);
    setFormRates(zone.rates.length > 0 ? zone.rates : [{ ...emptyRate }]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error(t("toasts.zoneNameRequired")); return; }
    if (formCountries.length === 0) { toast.error(t("toasts.selectCountry")); return; }
    if (formRates.some(r => !r.name.trim())) { toast.error(t("toasts.ratesNeedName")); return; }

    setSaving(true);
    try {
      const body = {
        ...(editingZone ? { id: editingZone.id } : {}),
        name: formName.trim(),
        countries: formCountries,
        regions: formRegions.split(",").map(r => r.trim()).filter(Boolean),
        isActive: formIsActive,
        rates: formRates.map((r, i) => ({
          name: r.name, type: r.type, price: r.price,
          minWeight: r.minWeight, maxWeight: r.maxWeight,
          minOrderAmount: r.minOrderAmount, maxOrderAmount: r.maxOrderAmount,
          estimatedDays: r.estimatedDays || null, isActive: r.isActive, sortOrder: i,
        })),
      };

      const res = await fetch("/api/shipping-zones", {
        method: editingZone ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(editingZone ? t("toasts.updated") : t("toasts.created"));
      setDialogOpen(false);
      resetForm();
      fetchZones();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toasts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone: ShippingZone) => {
    if (!confirm(t("deleteConfirm", { name: zone.name }))) return;
    try {
      const res = await fetch(`/api/shipping-zones?id=${zone.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("toasts.deleted"));
      fetchZones();
    } catch {
      toast.error(t("toasts.deleteFailed"));
    }
  };

  const addRate = () => setFormRates([...formRates, { ...emptyRate, sortOrder: formRates.length }]);
  const removeRate = (idx: number) => setFormRates(formRates.filter((_, i) => i !== idx));
  const updateRate = (idx: number, updates: Partial<ShippingRate>) => {
    setFormRates(formRates.map((r, i) => i === idx ? { ...r, ...updates } : r));
  };

  const toggleCountry = (code: string) => {
    setFormCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const rateTypeLabel = (type: string) => t(`rateTypes.${type}`);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card><CardContent className="pt-6"><div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[25%]" /><Skeleton className="h-4 w-[25%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[10%]" /></div>))}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t("addZone")}
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">{t("noShippingZones")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("noShippingZonesDesc")}</p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> {t("addShippingZone")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {zone.name}
                        <Badge variant={zone.isActive ? "default" : "secondary"}>
                          {zone.isActive ? t("active") : t("inactive")}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {zone.countries.map(c => t(`countryNames.${c}`)).join(", ")}
                        {zone.regions?.length > 0 && ` — ${zone.regions.join(", ")}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}>
                      {zone.rates.length} rate{zone.rates.length !== 1 ? "s" : ""}
                      {expandedZone === zone.id ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(zone)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {expandedZone === zone.id && (
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tableHead.rateName")}</TableHead>
                        <TableHead>{t("tableHead.type")}</TableHead>
                        <TableHead>{t("tableHead.price")}</TableHead>
                        <TableHead>{t("tableHead.conditions")}</TableHead>
                        <TableHead>{t("tableHead.estDelivery")}</TableHead>
                        <TableHead>{t("tableHead.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {zone.rates.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell><Badge variant="outline">{rateTypeLabel(rate.type)}</Badge></TableCell>
                          <TableCell>{rate.type === "FREE" ? t("free") : `SAR ${Number(rate.price).toFixed(2)}`}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {rate.type === "WEIGHT_BASED" && `${rate.minWeight || 0}–${rate.maxWeight || "∞"} kg`}
                            {rate.type === "PRICE_BASED" && `SAR ${rate.minOrderAmount || 0}–${rate.maxOrderAmount || "∞"}`}
                            {rate.type === "FREE" && rate.minOrderAmount ? t("minOrder", { amount: rate.minOrderAmount }) : ""}
                            {rate.type === "FLAT" && "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{rate.estimatedDays || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={rate.isActive ? "default" : "secondary"}>
                              {rate.isActive ? t("active") : t("inactive")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {zone.rates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">{t("noRatesConfigured")}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? t("dialog.editTitle") : t("dialog.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Zone Name */}
            <div className="space-y-2">
              <Label>{t("dialog.zoneName")}</Label>
              <Input placeholder={t("dialog.zoneNamePlaceholder")} value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>

            {/* Countries */}
            <div className="space-y-2">
              <Label>{t("dialog.countries")}</Label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((country) => (
                  <Badge
                    key={country.code}
                    variant={formCountries.includes(country.code) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCountry(country.code)}
                  >
                    {t(`countryNames.${country.code}`)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div className="space-y-2">
              <Label>{t("dialog.regions")}</Label>
              <Input placeholder={t("dialog.regionsPlaceholder")} value={formRegions} onChange={(e) => setFormRegions(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("dialog.regionsHint")}</p>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label>{t("dialog.active")}</Label>
            </div>

            {/* Rates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("dialog.shippingRates")}</Label>
                <Button variant="outline" size="sm" onClick={addRate}>
                  <Plus className="mr-1 h-3 w-3" /> {t("dialog.addRate")}
                </Button>
              </div>

              {formRates.map((rate, idx) => (
                <Card key={idx} className="shadow-none">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("dialog.rateNumber", { number: idx + 1 })}</span>
                      </div>
                      {formRates.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeRate(idx)} className="text-destructive hover:text-destructive h-7 px-2">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">{t("dialog.rateName")}</Label>
                        <Input placeholder={t("dialog.rateNamePlaceholder")} value={rate.name} onChange={(e) => updateRate(idx, { name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t("dialog.type")}</Label>
                        <Select value={rate.type} onValueChange={(v) => updateRate(idx, { type: v as ShippingRate["type"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FLAT">{t("rateTypes.FLAT")}</SelectItem>
                            <SelectItem value="WEIGHT_BASED">{t("rateTypes.WEIGHT_BASED")}</SelectItem>
                            <SelectItem value="PRICE_BASED">{t("rateTypes.PRICE_BASED")}</SelectItem>
                            <SelectItem value="FREE">{t("rateTypes.FREE")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {rate.type !== "FREE" && (
                        <div className="space-y-2">
                          <Label className="text-xs">{t("dialog.priceSar")}</Label>
                          <Input type="number" min="0" step="0.01" value={rate.price} onChange={(e) => updateRate(idx, { price: parseFloat(e.target.value) || 0 })} />
                        </div>
                      )}
                      {rate.type === "WEIGHT_BASED" && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs">{t("dialog.minWeightKg")}</Label>
                            <Input type="number" min="0" step="0.1" value={rate.minWeight ?? ""} onChange={(e) => updateRate(idx, { minWeight: parseFloat(e.target.value) || null })} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">{t("dialog.maxWeightKg")}</Label>
                            <Input type="number" min="0" step="0.1" value={rate.maxWeight ?? ""} onChange={(e) => updateRate(idx, { maxWeight: parseFloat(e.target.value) || null })} />
                          </div>
                        </>
                      )}
                      {(rate.type === "PRICE_BASED" || rate.type === "FREE") && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs">{t("dialog.minOrderSar")}</Label>
                            <Input type="number" min="0" step="0.01" value={rate.minOrderAmount ?? ""} onChange={(e) => updateRate(idx, { minOrderAmount: parseFloat(e.target.value) || null })} />
                          </div>
                          {rate.type === "PRICE_BASED" && (
                            <div className="space-y-2">
                              <Label className="text-xs">{t("dialog.maxOrderSar")}</Label>
                              <Input type="number" min="0" step="0.01" value={rate.maxOrderAmount ?? ""} onChange={(e) => updateRate(idx, { maxOrderAmount: parseFloat(e.target.value) || null })} />
                            </div>
                          )}
                        </>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs">{t("dialog.estDelivery")}</Label>
                        <Input placeholder={t("dialog.estDeliveryPlaceholder")} value={rate.estimatedDays ?? ""} onChange={(e) => updateRate(idx, { estimatedDays: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch checked={rate.isActive} onCheckedChange={(v) => updateRate(idx, { isActive: v })} />
                      <Label className="text-xs">{t("dialog.rateActive")}</Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("dialog.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingZone ? t("dialog.updateZone") : t("dialog.createZone")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
