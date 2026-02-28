"use client";

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
  { value: "tags", label: "Product Tags" },
  { value: "vendor", label: "Vendor" },
  { value: "productType", label: "Product Type" },
  { value: "price", label: "Price" },
  { value: "name", label: "Product Name" },
  { value: "status", label: "Status" },
];

const RULE_OPERATORS: Record<string, { value: string; label: string }[]> = {
  tags: [
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
  ],
  vendor: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "contains", label: "Contains" },
  ],
  productType: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
  ],
  price: [
    { value: "greater_than", label: "Greater than" },
    { value: "less_than", label: "Less than" },
    { value: "equals", label: "Equals" },
  ],
  name: [
    { value: "contains", label: "Contains" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
  ],
  status: [
    { value: "equals", label: "Equals" },
  ],
};

export default function SmartCollectionsPage() {
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
        setCollections(await res.json());
      }
    } catch {
      toast.error("Failed to load smart collections");
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
      toast.error("Name is required");
      return;
    }
    const validRules = form.rules.filter((r) => r.value.trim());
    if (validRules.length === 0) {
      toast.error("At least one rule with a value is required");
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
        toast.error(err.error || "Failed to save");
        return;
      }

      toast.success(editing ? "Collection updated" : "Collection created");
      setDialogOpen(false);
      resetForm();
      fetchCollections();
    } catch {
      toast.error("Failed to save collection");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this smart collection?")) return;
    try {
      const res = await fetch(`/api/smart-collections?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Collection deleted");
        fetchCollections();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete collection");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Collections</h1>
          <p className="text-muted-foreground">
            Auto-populate collections based on product rules
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Smart Collection" : "Create Smart Collection"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Sale" />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rules *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRule}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Rule
                  </Button>
                </div>
                {form.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={rule.field} onValueChange={(v) => updateRule(idx, "field", v)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={(v) => updateRule(idx, "operator", v)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(RULE_OPERATORS[rule.field] || []).map((op) => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(idx, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1"
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
                <Label>Active</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>SEO Description</Label>
                  <Input value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Collections ({collections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : collections.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No smart collections yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rules</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {c.isActive ? "Active" : "Inactive"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
