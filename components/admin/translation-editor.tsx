"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/**
 * Field labels (mirrored from lib/translations.ts to avoid importing server code)
 */
const FIELD_LABELS: Record<string, string> = {
  name: "Name / الاسم",
  title: "Title / العنوان",
  description: "Description / الوصف",
  shortDescription: "Short Description / وصف قصير",
  content: "Content / المحتوى",
  excerpt: "Excerpt / مقتطف",
  seoTitle: "SEO Title / عنوان SEO",
  seoDescription: "SEO Description / وصف SEO",
  customBadge: "Custom Badge / شارة مخصصة",
  warrantyInfo: "Warranty Info / معلومات الضمان",
  estimatedDelivery: "Estimated Delivery / التوصيل المتوقع",
};

/** Fields that should use a textarea instead of an input */
const TEXTAREA_FIELDS = new Set([
  "description",
  "shortDescription",
  "content",
  "excerpt",
  "seoDescription",
]);

interface TranslationEditorProps {
  entityType: "product" | "category" | "page" | "blogPost" | "smartCollection";
  entityId: string;
  /** Original (English) field values — shown as reference */
  originalValues?: Record<string, string | null>;
  locale?: string;
}

export function TranslationEditor({
  entityType,
  entityId,
  originalValues = {},
  locale = "ar",
}: TranslationEditorProps) {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchTranslations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/translations?entityType=${entityType}&entityId=${entityId}&locale=${locale}`
      );
      if (res.ok) {
        const data = await res.json();
        setTranslations(data.translations);
      }
    } catch {
      // Silently fail — fields will be empty
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, locale]);

  useEffect(() => {
    if (entityId) fetchTranslations();
  }, [entityId, fetchTranslations]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          locale,
          translations,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save translations");
      }

      setSaved(true);
      toast.success("Arabic translations saved");
      setTimeout(() => setSaved(false), 3000);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save translations"
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const filledCount = Object.values(translations).filter(
    (v) => v && v.trim()
  ).length;
  const totalFields = Object.keys(translations).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Arabic Translation / الترجمة العربية</CardTitle>
          </div>
          <Badge variant={filledCount === totalFields ? "default" : "secondary"}>
            {filledCount}/{totalFields} translated
          </Badge>
        </div>
        <CardDescription>
          Enter Arabic translations below. Empty fields will show the English
          version as fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {Object.entries(translations).map(([field, value]) => {
          const isTextarea = TEXTAREA_FIELDS.has(field);
          const originalValue = originalValues[field];

          return (
            <div key={field} className="space-y-1.5">
              <Label className="text-sm font-medium">
                {FIELD_LABELS[field] || field}
              </Label>
              {originalValue && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  EN: {originalValue}
                </p>
              )}
              {isTextarea ? (
                <Textarea
                  dir="rtl"
                  value={value}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`Arabic ${field}...`}
                  rows={field === "content" ? 8 : 3}
                  className="font-[family-name:var(--font-arabic)]"
                />
              ) : (
                <Input
                  dir="rtl"
                  value={value}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`Arabic ${field}...`}
                  className="font-[family-name:var(--font-arabic)]"
                />
              )}
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Globe className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Arabic Translations"}
        </Button>
      </CardContent>
    </Card>
  );
}
