"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const t = useTranslations("admin.settings");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    storeName: "ShopFlow",
    storeDescription: "",
    storeEmail: "",
    storePhone: "",
    storeAddress: "",
    currency: "SAR",
    currencySymbol: "SAR",
    taxRate: 0,
    taxIncluded: false,
    shippingEnabled: true,
    freeShippingMin: 0,
    flatShippingRate: 0,
    timezone: "Asia/Riyadh",
    weightUnit: "kg",
    socialFacebook: "",
    socialInstagram: "",
    socialTwitter: "",
    socialYoutube: "",
    metaTitle: "",
    metaDescription: "",
    googleAnalyticsId: "",
    maintenanceMode: false,
    posEnabled: true,
    storeLogo: "",
    storeFavicon: "",
    // Payment Gateway
    tapEnabled: false,
    tapTestMode: true,
    codEnabled: true,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data && data.id) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {
        toast.error(t("loadFailed"));
      });
  }, [t]);

  async function handleSave() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
        toast.success(t("saved"));
      } else {
        const error = await res.json().catch(() => null);
        toast.error(error?.error || t("saveFailed"));
      }
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("saveChanges")}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="payments">{t("tabs.paymentsTax")}</TabsTrigger>
          <TabsTrigger value="shipping">{t("tabs.shipping")}</TabsTrigger>
          <TabsTrigger value="social">{t("tabs.socialSeo")}</TabsTrigger>
          <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("storeInfo")}</CardTitle>
              <CardDescription>
                {t("storeInfoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("storeName")}</Label>
                  <Input
                    value={settings.storeName}
                    onChange={(e) =>
                      setSettings({ ...settings, storeName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("storeEmail")}</Label>
                  <Input
                    type="email"
                    value={settings.storeEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, storeEmail: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("storeDescription")}</Label>
                <Textarea
                  value={settings.storeDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      storeDescription: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    value={settings.storePhone}
                    onChange={(e) =>
                      setSettings({ ...settings, storePhone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("timezone")}</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) =>
                      setSettings({ ...settings, timezone: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">{t("timezones.utc")}</SelectItem>
                      <SelectItem value="Asia/Riyadh">
                        {t("timezones.riyadh")}
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        {t("timezones.eastern")}
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        {t("timezones.central")}
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        {t("timezones.mountain")}
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        {t("timezones.pacific")}
                      </SelectItem>
                      <SelectItem value="Europe/London">{t("timezones.london")}</SelectItem>
                      <SelectItem value="Europe/Paris">{t("timezones.paris")}</SelectItem>
                      <SelectItem value="Asia/Tokyo">{t("timezones.tokyo")}</SelectItem>
                      <SelectItem value="Asia/Dubai">{t("timezones.dubai")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("address")}</Label>
                <Textarea
                  value={settings.storeAddress}
                  onChange={(e) =>
                    setSettings({ ...settings, storeAddress: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("storeBranding")}</CardTitle>
              <CardDescription>
                {t("storeBrandingDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("storeLogo")}</Label>
                <ImageUpload
                  value={settings.storeLogo ? [settings.storeLogo] : []}
                  onChange={(urls) =>
                    setSettings({ ...settings, storeLogo: urls[0] || "" })
                  }
                  folder="store"
                  maxImages={1}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("favicon")}</Label>
                <ImageUpload
                  value={settings.storeFavicon ? [settings.storeFavicon] : []}
                  onChange={(urls) =>
                    setSettings({ ...settings, storeFavicon: urls[0] || "" })
                  }
                  folder="store"
                  maxImages={1}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("currency")}</CardTitle>
              <CardDescription>
                {t("currencyDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("currency")}</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(v) =>
                      setSettings({ ...settings, currency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">{t("currencies.usd")}</SelectItem>
                      <SelectItem value="EUR">{t("currencies.eur")}</SelectItem>
                      <SelectItem value="GBP">{t("currencies.gbp")}</SelectItem>
                      <SelectItem value="CAD">{t("currencies.cad")}</SelectItem>
                      <SelectItem value="AUD">{t("currencies.aud")}</SelectItem>
                      <SelectItem value="AED">{t("currencies.aed")}</SelectItem>
                      <SelectItem value="SAR">{t("currencies.sar")}</SelectItem>
                      <SelectItem value="INR">{t("currencies.inr")}</SelectItem>
                      <SelectItem value="JPY">{t("currencies.jpy")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("currencySymbol")}</Label>
                  <Input
                    value={settings.currencySymbol}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        currencySymbol: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("weightUnit")}</Label>
                  <Select
                    value={settings.weightUnit}
                    onValueChange={(v) =>
                      setSettings({ ...settings, weightUnit: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">{t("weightUnits.kg")}</SelectItem>
                      <SelectItem value="lb">{t("weightUnits.lb")}</SelectItem>
                      <SelectItem value="g">{t("weightUnits.g")}</SelectItem>
                      <SelectItem value="oz">{t("weightUnits.oz")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Tap Payments Gateway */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("tapPayments")}
                    {settings.tapEnabled ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">{t("active")}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{t("disabled")}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t("tapDesc")}
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.tapEnabled}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, tapEnabled: v })
                  }
                />
              </div>
            </CardHeader>
            {settings.tapEnabled && (
              <CardContent className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/30">
                  <div>
                    <Label className="font-semibold">{t("testMode")}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {settings.tapTestMode
                        ? t("sandboxDesc")
                        : t("liveDesc")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.tapTestMode ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">{t("sandbox")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">{t("live")}</Badge>
                    )}
                    <Switch
                      checked={settings.tapTestMode}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, tapTestMode: v })
                      }
                    />
                  </div>
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label>{t("webhookUrl")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("webhookUrlDesc")}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/payments/webhook`}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/api/payments/webhook`
                        );
                        toast.success(t("webhookCopied"));
                      }}
                    >
                      {t("copy")}
                    </Button>
                  </div>
                </div>

                {/* Supported Methods Info */}
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">{t("supportedMethods")}</p>
                  <div className="flex flex-wrap gap-2">
                    {["Visa", "Mastercard", "mada", "Apple Pay", "STC Pay", "KNET"].map((method) => (
                      <Badge key={method} variant="secondary" className="text-xs">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Cash on Delivery */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    {t("cashOnDelivery")}
                    {settings.codEnabled ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">{t("active")}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{t("disabled")}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t("codDesc")}
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.codEnabled}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, codEnabled: v })
                  }
                />
              </div>
            </CardHeader>
          </Card>

          {/* Tax Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("taxSettings")}</CardTitle>
              <CardDescription>
                {t("taxSettingsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("defaultTaxRate")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.taxRate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.taxIncluded}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, taxIncluded: v })
                  }
                />
                <Label>{t("pricesIncludeTax")}</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("shippingSettings")}</CardTitle>
              <CardDescription>
                {t("shippingSettingsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.shippingEnabled}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, shippingEnabled: v })
                  }
                />
                <Label>{t("enableShipping")}</Label>
              </div>
              {settings.shippingEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("flatShippingRate")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.flatShippingRate || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          flatShippingRate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("freeShippingMin")}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.freeShippingMin || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          freeShippingMin: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("socialMedia")}</CardTitle>
              <CardDescription>
                {t("socialDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("facebookUrl")}</Label>
                  <Input
                    value={settings.socialFacebook}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialFacebook: e.target.value,
                      })
                    }
                    placeholder="https://facebook.com/yourstore"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("instagramUrl")}</Label>
                  <Input
                    value={settings.socialInstagram}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialInstagram: e.target.value,
                      })
                    }
                    placeholder="https://instagram.com/yourstore"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("twitterUrl")}</Label>
                  <Input
                    value={settings.socialTwitter}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialTwitter: e.target.value,
                      })
                    }
                    placeholder="https://x.com/yourstore"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("youtubeUrl")}</Label>
                  <Input
                    value={settings.socialYoutube}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socialYoutube: e.target.value,
                      })
                    }
                    placeholder="https://youtube.com/yourstore"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("seo")}</CardTitle>
              <CardDescription>
                {t("seoDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("metaTitle")}</Label>
                <Input
                  value={settings.metaTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, metaTitle: e.target.value })
                  }
                  placeholder="Your Store - Tagline"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("metaDescription")}</Label>
                <Textarea
                  value={settings.metaDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      metaDescription: e.target.value,
                    })
                  }
                  placeholder="A brief description of your store for search engines"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("googleAnalyticsId")}</Label>
                <Input
                  value={settings.googleAnalyticsId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      googleAnalyticsId: e.target.value,
                    })
                  }
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("advancedSettings")}</CardTitle>
              <CardDescription>
                {t("advancedDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("posSystem")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("posDesc")}
                  </p>
                </div>
                <Switch
                  checked={settings.posEnabled}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, posEnabled: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("maintenanceMode")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("maintenanceDesc")}
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, maintenanceMode: v })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
