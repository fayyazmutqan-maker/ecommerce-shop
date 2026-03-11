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
import { Save, Loader2, Eye, EyeOff, CheckCircle2, XCircle, ExternalLink, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
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
    tapPublicKey: "",
    tapSecretKey: "",
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
        toast.error("Failed to load settings");
      });
  }, []);

  async function handleSave() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your store settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payments">Payments & Tax</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="social">Social & SEO</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                Basic information about your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Store Name</Label>
                  <Input
                    value={settings.storeName}
                    onChange={(e) =>
                      setSettings({ ...settings, storeName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store Email</Label>
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
                <Label>Store Description</Label>
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
                  <Label>Phone</Label>
                  <Input
                    value={settings.storePhone}
                    onChange={(e) =>
                      setSettings({ ...settings, storePhone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
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
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Asia/Riyadh">
                        Arabia Standard Time (Riyadh)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
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
              <CardTitle>Store Branding</CardTitle>
              <CardDescription>
                Upload your store logo and favicon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Store Logo</Label>
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
                <Label>Favicon</Label>
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
              <CardTitle>Currency</CardTitle>
              <CardDescription>
                Set your store&apos;s default currency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Currency</Label>
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
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                      <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency Symbol</Label>
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
                  <Label>Weight Unit</Label>
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
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
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
                    Tap Payments
                    {settings.tapEnabled ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Accept Visa, Mastercard, mada, Apple Pay, and STC Pay
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
                    <Label className="font-semibold">Test Mode</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {settings.tapTestMode
                        ? "Using sandbox — no real charges will be made"
                        : "Live mode — real payments will be processed"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {settings.tapTestMode ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">Sandbox</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300">Live</Badge>
                    )}
                    <Switch
                      checked={settings.tapTestMode}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, tapTestMode: v })
                      }
                    />
                  </div>
                </div>

                {/* API Keys */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">API Keys</h4>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Get your API keys from{" "}
                    <a
                      href="https://dashboard.tap.company"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                    >
                      Tap Dashboard <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Public Key {settings.tapTestMode ? "(Test)" : "(Live)"}</Label>
                      <Input
                        value={settings.tapPublicKey}
                        onChange={(e) =>
                          setSettings({ ...settings, tapPublicKey: e.target.value })
                        }
                        placeholder={settings.tapTestMode ? "pk_test_..." : "pk_live_..."}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secret Key {settings.tapTestMode ? "(Test)" : "(Live)"}</Label>
                      <div className="relative">
                        <Input
                          type={showSecretKey ? "text" : "password"}
                          value={settings.tapSecretKey}
                          onChange={(e) =>
                            setSettings({ ...settings, tapSecretKey: e.target.value })
                          }
                          placeholder={settings.tapTestMode ? "sk_test_..." : "sk_live_..."}
                          className="font-mono text-sm pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testingConnection || !settings.tapSecretKey}
                    onClick={async () => {
                      setTestingConnection(true);
                      setConnectionStatus("idle");
                      try {
                        const res = await fetch("/api/payments/test-connection", {
                          method: "POST",
                        });
                        const data = await res.json();
                        if (res.ok && data.status === "connected") {
                          setConnectionStatus("success");
                          toast.success("Connection successful! Tap API keys are valid.");
                        } else {
                          setConnectionStatus("error");
                          toast.error(data.message || "Connection failed. Please save your keys first, then test.");
                        }
                      } catch {
                        setConnectionStatus("error");
                        toast.error("Connection failed. Please save your keys first, then test.");
                      } finally {
                        setTestingConnection(false);
                      }
                    }}
                  >
                    {testingConnection ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Test Connection
                  </Button>
                  <p className="text-xs text-muted-foreground">Save your keys first, then test</p>
                  {connectionStatus === "success" && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Connected
                    </span>
                  )}
                  {connectionStatus === "error" && (
                    <span className="flex items-center gap-1 text-sm text-red-600">
                      <XCircle className="h-4 w-4" /> Failed
                    </span>
                  )}
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <p className="text-xs text-muted-foreground">
                    Add this URL in your Tap Dashboard → Webhooks settings
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
                        toast.success("Webhook URL copied!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Supported Methods Info */}
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Supported Payment Methods</p>
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
                    Cash on Delivery
                    {settings.codEnabled ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Allow customers to pay when their order is delivered
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
              <CardTitle>Tax Settings</CardTitle>
              <CardDescription>
                Configure tax rates for your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Tax Rate (%)</Label>
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
                <Label>Prices include tax</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Settings</CardTitle>
              <CardDescription>
                Configure shipping options for your store
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
                <Label>Enable shipping</Label>
              </div>
              {settings.shippingEnabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Flat Shipping Rate (SAR)</Label>
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
                    <Label>Free Shipping Minimum (SAR)</Label>
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
              <CardTitle>Social Media</CardTitle>
              <CardDescription>
                Connect your social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
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
                  <Label>Instagram URL</Label>
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
                  <Label>Twitter / X URL</Label>
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
                  <Label>YouTube URL</Label>
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
              <CardTitle>SEO</CardTitle>
              <CardDescription>
                Default SEO settings for your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  value={settings.metaTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, metaTitle: e.target.value })
                  }
                  placeholder="Your Store - Tagline"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
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
                <Label>Google Analytics ID</Label>
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
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                POS and maintenance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>POS System</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable Point of Sale for in-store transactions
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
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a maintenance page to visitors
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
