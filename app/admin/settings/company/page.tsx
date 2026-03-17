"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

export default function CompanySettingsPage() {
  const t = useTranslations("admin.company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    storeName: "",
    storeDescription: "",
    storeEmail: "",
    storePhone: "",
    storeAddress: "",
    socialFacebook: "",
    socialInstagram: "",
    socialTwitter: "",
    socialYoutube: "",
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          storeName: data.storeName || "",
          storeDescription: data.storeDescription || "",
          storeEmail: data.storeEmail || "",
          storePhone: data.storePhone || "",
          storeAddress: data.storeAddress || "",
          socialFacebook: data.socialFacebook || "",
          socialInstagram: data.socialInstagram || "",
          socialTwitter: data.socialTwitter || "",
          socialYoutube: data.socialYoutube || "",
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
        });
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
        body: JSON.stringify(form),
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

  if (loading) return <p className="text-muted-foreground text-center py-12">{t("loading")}</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> {t("storeDetails")}</CardTitle>
          <CardDescription>{t("storeDetailsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("storeName")}</Label>
              <Input value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("contactEmail")}</Label>
              <Input value={form.storeEmail} onChange={(e) => setForm((f) => ({ ...f, storeEmail: e.target.value }))} type="email" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contactPhone")}</Label>
              <Input value={form.storePhone} onChange={(e) => setForm((f) => ({ ...f, storePhone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("address")}</Label>
              <Input value={form.storeAddress} onChange={(e) => setForm((f) => ({ ...f, storeAddress: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("storeDescription")}</Label>
            <Textarea value={form.storeDescription} onChange={(e) => setForm((f) => ({ ...f, storeDescription: e.target.value }))} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("socialMedia")}</CardTitle>
          <CardDescription>{t("socialMediaDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("facebook")}</Label>
              <Input value={form.socialFacebook} onChange={(e) => setForm((f) => ({ ...f, socialFacebook: e.target.value }))} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2">
              <Label>{t("instagram")}</Label>
              <Input value={form.socialInstagram} onChange={(e) => setForm((f) => ({ ...f, socialInstagram: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("twitterX")}</Label>
              <Input value={form.socialTwitter} onChange={(e) => setForm((f) => ({ ...f, socialTwitter: e.target.value }))} placeholder="https://x.com/..." />
            </div>
            <div className="space-y-2">
              <Label>{t("youtube")}</Label>
              <Input value={form.socialYoutube} onChange={(e) => setForm((f) => ({ ...f, socialYoutube: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("seo")}</CardTitle>
          <CardDescription>{t("seoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("metaTitle")}</Label>
            <Input value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{t("metaDescription")}</Label>
            <Textarea value={form.metaDescription} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} rows={2} />
          </div>
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
