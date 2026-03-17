"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Loader2,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  Package,
  FolderOpen,
  FileText,
  PenTool,
  FolderKanban,
  Languages,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────

type EntityType = "product" | "category" | "page" | "blogPost" | "smartCollection";

interface EntityItem {
  id: string;
  label: string;
  subLabel?: string;
  status?: string;
  translatedFields: number;
  totalFields: number;
  progress: number;
}

interface EntitiesResponse {
  entities: EntityItem[];
  totalEntities: number;
  fullyTranslated: number;
  totalFields: number;
}

// ─── Constants ───────────────────────────────────────────────

const ENTITY_TABS: { value: EntityType; icon: typeof Package }[] = [
  { value: "product", icon: Package },
  { value: "category", icon: FolderOpen },
  { value: "page", icon: FileText },
  { value: "blogPost", icon: PenTool },
  { value: "smartCollection", icon: FolderKanban },
];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  title: "Title",
  description: "Description",
  shortDescription: "Short Description",
  content: "Content",
  excerpt: "Excerpt",
  seoTitle: "SEO Title",
  seoDescription: "SEO Description",
  customBadge: "Custom Badge",
  warrantyInfo: "Warranty Info",
  estimatedDelivery: "Estimated Delivery",
};

const TEXTAREA_FIELDS = new Set([
  "description",
  "shortDescription",
  "content",
  "excerpt",
  "seoDescription",
]);

const LOCALE = "ar";

// ─── Main Page ───────────────────────────────────────────────

export default function TranslationsPage() {
  const t = useTranslations("admin.translationsPage");
  const [activeTab, setActiveTab] = useState<EntityType>("product");
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, translated: 0, totalFields: 0 });
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntities = useCallback(async (type: EntityType) => {
    setLoading(true);
    setExpandedId(null);
    try {
      const res = await fetch(`/api/translations/entities?type=${type}&locale=${LOCALE}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }
      const data: EntitiesResponse = await res.json();
      setEntities(data.entities);
      setStats({
        total: data.totalEntities,
        translated: data.fullyTranslated,
        totalFields: data.totalFields,
      });
    } catch (error) {
      console.error("[translations] Failed to load entities:", error);
      toast.error(t("toasts.loadEntitiesFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchEntities(activeTab);
  }, [activeTab, fetchEntities]);

  const filtered = search
    ? entities.filter(
        (e) =>
          e.label.toLowerCase().includes(search.toLowerCase()) ||
          e.subLabel?.toLowerCase().includes(search.toLowerCase())
      )
    : entities;

  const overallProgress =
    stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Languages className="h-8 w-8" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("arabicBadge")}
          </Badge>
        </div>
      </div>

      {/* Overall progress card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("overallProgress", { type: t(`entityTabs.${activeTab}`) })}
                </span>
                <span className="font-medium">
                  {t("fullyTranslated", { translated: stats.translated, total: stats.total })}
                </span>
              </div>
              <Progress value={overallProgress} className="h-2.5" />
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t("total")}</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.translated}</p>
                <p className="text-xs text-muted-foreground">{t("complete")}</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.total - stats.translated}</p>
                <p className="text-xs text-muted-foreground">{t("pending")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs + Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <TabsList className="h-10">
            {ENTITY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 px-3">
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(`entityTabs.${tab.value}`)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {ENTITY_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {loading ? (
              <Card>
                <CardContent className="space-y-4 py-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-[30%]" />
                      <Skeleton className="h-4 w-[50%]" />
                      <Skeleton className="h-4 w-[15%]" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16 text-muted-foreground">
                  {search ? t("noMatchingItems") : t("noEntitiesYet", { type: t(`entityTabs.${tab.value}`).toLowerCase() })}
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg divide-y">
                {filtered.map((entity) => (
                  <EntityRow
                    key={entity.id}
                    entity={entity}
                    entityType={activeTab}
                    isExpanded={expandedId === entity.id}
                    onToggle={() =>
                      setExpandedId(expandedId === entity.id ? null : entity.id)
                    }
                    onSaved={() => fetchEntities(activeTab)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Entity Row Component ────────────────────────────────────

interface EntityRowProps {
  entity: EntityItem;
  entityType: EntityType;
  isExpanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}

function EntityRow({ entity, entityType, isExpanded, onToggle, onSaved }: EntityRowProps) {
  const t = useTranslations("admin.translationsPage");
  const isComplete = entity.progress === 100;

  return (
    <div>
      {/* Row Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entity.label}</p>
          {entity.subLabel && (
            <p className="text-xs text-muted-foreground">{entity.subLabel}</p>
          )}
        </div>

        {entity.status && (
          <Badge
            variant={
              entity.status === "ACTIVE" || entity.status === "PUBLISHED"
                ? "default"
                : "secondary"
            }
            className="text-[10px] px-1.5 py-0 shrink-0"
          >
            {entity.status}
          </Badge>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : entity.translatedFields > 0 ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground/40" />
          )}
          <span className="text-xs text-muted-foreground w-16 text-right">
            {t("fields", { translated: entity.translatedFields, total: entity.totalFields })}
          </span>
          <Progress value={entity.progress} className="w-16 h-1.5" />
        </div>
      </button>

      {/* Expanded Translation Editor */}
      {isExpanded && (
        <InlineTranslationEditor
          entityType={entityType}
          entityId={entity.id}
          entityLabel={entity.label}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

// ─── Inline Translation Editor ───────────────────────────────

interface InlineEditorProps {
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  onSaved: () => void;
}

function InlineTranslationEditor({ entityType, entityId, entityLabel, onSaved }: InlineEditorProps) {
  const t = useTranslations("admin.translationsPage");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch current translations
        const res = await fetch(
          `/api/translations?entityType=${entityType}&entityId=${entityId}&locale=${LOCALE}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setTranslations(data.translations);

        // Fetch original entity for reference values
        let originalUrl = "";
        switch (entityType) {
          case "product":
            originalUrl = `/api/products/${entityId}`;
            break;
          case "category":
            originalUrl = `/api/categories?id=${entityId}`;
            break;
          case "page":
            originalUrl = `/api/pages?id=${entityId}`;
            break;
          case "blogPost":
            originalUrl = `/api/blog?id=${entityId}`;
            break;
          case "smartCollection":
            originalUrl = `/api/smart-collections?id=${entityId}`;
            break;
        }

        if (originalUrl) {
          try {
            const origRes = await fetch(originalUrl);
            if (origRes.ok) {
              const origData = await origRes.json();
              // The API might return either the entity directly or in a wrapper
              const entity = origData.product || origData.category || origData.page || origData.post || origData;
              if (!cancelled && entity) {
                const vals: Record<string, string> = {};
                for (const field of Object.keys(data.translations)) {
                  // Try common field name patterns
                  const val = entity[field] || entity[field === "title" ? "name" : ""] || "";
                  if (typeof val === "string") vals[field] = val;
                }
                setOriginalValues(vals);
              }
            }
          } catch {
            // Original values are optional, just for reference
          }
        }
      } catch {
        toast.error(t("toasts.loadTranslationsFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [entityType, entityId, t]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          locale: LOCALE,
          translations,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("toasts.saved", { label: entityLabel }));
      onSaved();
    } catch {
      toast.error(t("toasts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setTranslations((prev) => ({ ...prev, [field]: value }));
  };

  const filledCount = Object.values(translations).filter((v) => v && v.trim()).length;
  const totalCount = Object.keys(translations).length;

  if (loading) {
    return (
      <div className="px-4 py-8 border-t bg-accent/20 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-accent/20 px-4 py-5 space-y-4">
      {/* Field grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(translations).map(([field, value]) => {
          const isTextarea = TEXTAREA_FIELDS.has(field);
          const originalVal = originalValues[field];

          return (
            <div
              key={field}
              className={`space-y-1.5 ${isTextarea && (field === "content" || field === "description") ? "lg:col-span-2" : ""}`}
            >
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t.has(`fieldLabels.${field}`) ? t(`fieldLabels.${field}`) : field}
                </Label>
                {value && value.trim() ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : null}
              </div>
              {originalVal && (
                <p className="text-[11px] text-muted-foreground/80 line-clamp-1 bg-background rounded px-2 py-0.5 border">
                  EN: {originalVal}
                </p>
              )}
              {isTextarea ? (
                <Textarea
                  dir="rtl"
                  value={value}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`${t.has(`fieldLabels.${field}`) ? t(`fieldLabels.${field}`) : field}...`}
                  rows={field === "content" ? 6 : 3}
                  className="font-[family-name:var(--font-arabic)] text-sm"
                />
              ) : (
                <Input
                  dir="rtl"
                  value={value}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`${t.has(`fieldLabels.${field}`) ? t(`fieldLabels.${field}`) : field}...`}
                  className="font-[family-name:var(--font-arabic)] text-sm"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {t("fieldsTranslated", { filled: filledCount, total: totalCount })}
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          {saving ? t("saving") : t("saveTranslations")}
        </Button>
      </div>
    </div>
  );
}
