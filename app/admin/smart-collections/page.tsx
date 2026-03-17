"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, FolderKanban, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SmartCollectionRule {
  field: string;
  operator: string;
  value: string;
}

interface SmartCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  rules: SmartCollectionRule[];
  sortOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
}

const RULE_FIELDS = [
  { value: "tags" },
  { value: "vendor" },
  { value: "productType" },
  { value: "price" },
  { value: "name" },
  { value: "status" },
];

const RULE_OPERATORS: Record<string, { value: string }[]> = {
  tags: [
    { value: "contains" },
    { value: "not_contains" },
  ],
  vendor: [
    { value: "equals" },
    { value: "not_equals" },
    { value: "contains" },
  ],
  productType: [
    { value: "equals" },
    { value: "not_equals" },
  ],
  price: [
    { value: "greater_than" },
    { value: "less_than" },
    { value: "equals" },
  ],
  name: [
    { value: "contains" },
    { value: "starts_with" },
    { value: "ends_with" },
  ],
  status: [
    { value: "equals" },
  ],
};

export default function SmartCollectionsPage() {
  const t = useTranslations("admin.smartCollections");
  const [collections, setCollections] = useState<SmartCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SmartCollection | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    rules: [{ field: "tags", operator: "contains", value: "" }] as SmartCollectionRule[],
    sortOrder: 0,
    isActive: true,
    seoTitle: "",
    seoDescription: "",
  });

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/smart-collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(
          data.map((c: any) => ({
            ...c,
            rules: typeof c.rules === "string" ? JSON.parse(c.rules) : c.rules,
          }))
        );
      }
    } catch {
      toast.error(t("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      description: "",
      image: "",
      rules: [{ field: "tags", operator: "contains", value: "" }],
      sortOrder: 0,
      isActive: true,
      seoTitle: "",
      seoDescription: "",
    });
    setEditing(null);
  };

  const handleEdit = (c: SmartCollection) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      image: c.image || "",
      rules: c.rules.length > 0 ? c.rules : [{ field: "tags", operator: "contains", value: "" }],
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      seoTitle: c.seoTitle || "",
      seoDescription: c.seoDescription || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(t("toasts.nameRequired"));
      return;
    }
    const validRules = form.rules.filter((r) => r.value.trim());
    if (validRules.length === 0) {
      toast.error(t("toasts.ruleRequired"));
      return;
    }

    const slug = form.slug.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const payload = {
      ...form,
      slug,
      rules: validRules,
      description: form.description || null,
      image: form.image || null,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
    };

    try {
      const res = editing
        ? await fetch("/api/smart-collections", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id, ...payload }),
          })
        : await fetch("/api/smart-collections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t("toasts.saveFailed"));
        return;
      }

      toast.success(editing ? t("toasts.updated") : t("toasts.created"));
      setDialogOpen(false);
      resetForm();
      fetchCollections();
    } catch {
      toast.error(t("toasts.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("toasts.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/smart-collections?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("toasts.deleted"));
        fetchCollections();
      } else {
        toast.error(t("toasts.deleteFailed"));
      }
    } catch {
      toast.error(t("toasts.deleteFailed"));
    }
  };

  const addRule = () => {
    setForm((f) => ({
      ...f,
      rules: [...f.rules, { field: "tags", operator: "contains", value: "" }],
    }));
  };

  const removeRule = (idx: number) => {
    setForm((f) => ({
      ...f,
      rules: f.rules.filter((_, i) => i !== idx),
    }));
  };

  const updateRule = (idx: number, key: keyof SmartCollectionRule, value: string) => {
    setForm((f) => ({
      ...f,
      rules: f.rules.map((r, i) =>
        i === idx
          ? {
              ...r,
              [key]: value,
              ...(key === "field" ? { operator: RULE_OPERATORS[value]?.[0]?.value || "equals" } : {}),
            }
          : r
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("createCollection")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? t("editTitle") : t("createTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("nameLabel")}</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("namePlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("slugLabel")}</Label>
                  <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder={t("slugPlaceholder")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t("rulesLabel")}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRule}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t("addRule")}
                  </Button>
                </div>
                {form.rules.map((rule, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <Select value={rule.field} onValueChange={(v) => updateRule(idx, "field", v)}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{t(`ruleFields.${f.value}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={(v) => updateRule(idx, "operator", v)}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(RULE_OPERATORS[rule.field] || []).map((op) => (
                          <SelectItem key={op.value} value={op.value}>{t(`ruleOperators.${op.value}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(idx, "value", e.target.value)}
                      placeholder={t("value")}
                      className="flex-1 min-w-[120px]"
                    />
                    {form.rules.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                <Label>{t("active")}</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("seoTitle")}</Label>
                  <Input value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("seoDescription")}</Label>
                  <Input value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>{t("cancel")}</Button>
              <Button onClick={handleSave}>{editing ? t("update") : t("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            {t("collectionsCount", { count: collections.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[30%]" />
                  <Skeleton className="h-4 w-[35%]" />
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[15%]" />
                </div>
              ))}
            </div>
          ) : collections.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">{t("noCollectionsYet")}</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("rules")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">/{c.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.rules.map((r, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {r.field} {r.operator} &quot;{r.value}&quot;
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
