"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

export default function CompanySettingsPage() {
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
      toast.success("Company settings saved");
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
        <h1 className="text-2xl font-bold">Company Information</h1>
        <p className="text-muted-foreground">Manage your store identity and contact details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Store Details</CardTitle>
          <CardDescription>Basic store information displayed to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={form.storeName} onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input value={form.storeEmail} onChange={(e) => setForm((f) => ({ ...f, storeEmail: e.target.value }))} type="email" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={form.storePhone} onChange={(e) => setForm((f) => ({ ...f, storePhone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.storeAddress} onChange={(e) => setForm((f) => ({ ...f, storeAddress: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Store Description</Label>
            <Textarea value={form.storeDescription} onChange={(e) => setForm((f) => ({ ...f, storeDescription: e.target.value }))} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media</CardTitle>
          <CardDescription>Links displayed in the store footer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input value={form.socialFacebook} onChange={(e) => setForm((f) => ({ ...f, socialFacebook: e.target.value }))} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={form.socialInstagram} onChange={(e) => setForm((f) => ({ ...f, socialInstagram: e.target.value }))} placeholder="https://instagram.com/..." />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Twitter / X</Label>
              <Input value={form.socialTwitter} onChange={(e) => setForm((f) => ({ ...f, socialTwitter: e.target.value }))} placeholder="https://x.com/..." />
            </div>
            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input value={form.socialYoutube} onChange={(e) => setForm((f) => ({ ...f, socialYoutube: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO</CardTitle>
          <CardDescription>Default meta tags for search engines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea value={form.metaDescription} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} rows={2} />
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
