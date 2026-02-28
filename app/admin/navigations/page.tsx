"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  children?: NavItem[];
}

interface NavMenu {
  id: string;
  title: string;
  slug: string;
  items: NavItem[];
  createdAt: string;
  updatedAt: string;
}

export default function NavigationsPage() {
  const [menus, setMenus] = useState<NavMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NavMenu | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [items, setItems] = useState<NavItem[]>([{ title: "", url: "" }]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/navigations");
      if (res.ok) {
        setMenus(await res.json());
      }
    } catch {
      toast.error("Failed to load navigation menus");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setSlug("");
    setItems([{ title: "", url: "" }]);
    setExpandedItems(new Set());
    setOpen(true);
  }

  function openEdit(menu: NavMenu) {
    setEditing(menu);
    setTitle(menu.title);
    setSlug(menu.slug);
    setItems(menu.items.length > 0 ? menu.items : [{ title: "", url: "" }]);
    setExpandedItems(new Set());
    setOpen(true);
  }

  function addItem() {
    setItems([...items, { title: "", url: "" }]);
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated.length > 0 ? updated : [{ title: "", url: "" }]);
  }

  function updateItem(index: number, field: keyof NavItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  function addChild(parentIndex: number) {
    const updated = [...items];
    if (!updated[parentIndex].children) {
      updated[parentIndex].children = [];
    }
    updated[parentIndex].children!.push({ title: "", url: "" });
    setItems(updated);
    setExpandedItems(new Set([...expandedItems, parentIndex]));
  }

  function removeChild(parentIndex: number, childIndex: number) {
    const updated = [...items];
    updated[parentIndex].children = updated[parentIndex].children?.filter((_, i) => i !== childIndex);
    if (updated[parentIndex].children?.length === 0) {
      delete updated[parentIndex].children;
    }
    setItems(updated);
  }

  function updateChild(parentIndex: number, childIndex: number, field: keyof NavItem, value: string) {
    const updated = [...items];
    if (updated[parentIndex].children) {
      updated[parentIndex].children![childIndex] = {
        ...updated[parentIndex].children![childIndex],
        [field]: value,
      };
    }
    setItems(updated);
  }

  function toggleExpanded(index: number) {
    const next = new Set(expandedItems);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.title.trim() && i.url.trim()).map((i) => ({
      ...i,
      children: i.children?.filter((c) => c.title.trim() && c.url.trim()),
    }));
    if (validItems.length === 0) {
      toast.error("At least one menu item is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { title, slug, items: validItems, ...(editing ? { id: editing.id } : {}) };
      const res = await fetch("/api/navigations", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success(editing ? "Navigation updated" : "Navigation created");
      setOpen(false);
      fetchMenus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this navigation menu?")) return;
    try {
      const res = await fetch(`/api/navigations?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Navigation deleted");
      fetchMenus();
    } catch {
      toast.error("Failed to delete navigation");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Navigation Menus</h1>
          <p className="text-muted-foreground">Manage your store&apos;s navigation menus</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Menu</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : menus.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="mb-2">No navigation menus yet</p>
              <Button variant="outline" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create your first menu</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menus.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell className="font-medium">{menu.title}</TableCell>
                    <TableCell><Badge variant="secondary">{menu.slug}</Badge></TableCell>
                    <TableCell>{menu.items.length} items</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(menu.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(menu)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(menu.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Create"} Navigation Menu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Main Menu" required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="main-menu" required pattern="[a-z0-9-]+" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Menu Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Add Item</Button>
              </div>
              {items.map((item, i) => (
                <Card key={i} className="p-0">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      {item.children && item.children.length > 0 && (
                        <button type="button" onClick={() => toggleExpanded(i)} className="text-muted-foreground hover:text-foreground">
                          {expandedItems.has(i) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      )}
                      <Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} placeholder="Link title" className="flex-1" />
                      <Input value={item.url} onChange={(e) => updateItem(i, "url", e.target.value)} placeholder="/page-url" className="flex-1" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => addChild(i)} className="text-xs shrink-0">+ Sub</Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} className="shrink-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    {expandedItems.has(i) && item.children?.map((child, ci) => (
                      <div key={ci} className="flex items-center gap-2 ml-10">
                        <span className="text-xs text-muted-foreground w-4">↳</span>
                        <Input value={child.title} onChange={(e) => updateChild(i, ci, "title", e.target.value)} placeholder="Sub-link title" className="flex-1" />
                        <Input value={child.url} onChange={(e) => updateChild(i, ci, "url", e.target.value)} placeholder="/sub-url" className="flex-1" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeChild(i, ci)} className="shrink-0 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"} Menu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
