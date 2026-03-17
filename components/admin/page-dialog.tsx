"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type PageItem = {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
};

function PageForm({
  page,
  onClose,
}: {
  page?: PageItem;
  onClose: () => void;
}) {
  const t = useTranslations("admin.pages");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(page?.title || "");
  const [content, setContent] = useState(page?.content || "");
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? true);
  const [metaTitle, setMetaTitle] = useState(page?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(page?.metaDescription || "");

  const isEdit = !!page;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }
    if (!content.trim()) {
      toast.error(t("contentRequired"));
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        isPublished,
        metaTitle: metaTitle.trim() || null,
        metaDescription: metaDescription.trim() || null,
      };

      if (isEdit) body.id = page.id;

      const res = await fetch("/api/pages", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("toasts.saveFailed"));
        return;
      }

      toast.success(isEdit ? t("toasts.pageUpdated") : t("toasts.pageCreated"));
      onClose();
      router.refresh();
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("pageTitle")}</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">{t("content")}</Label>
        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("contentPlaceholder")} rows={8} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="metaTitle">{t("seoTitle")}</Label>
          <Input id="metaTitle" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={t("seoTitlePlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metaDesc">{t("seoDescription")}</Label>
          <Input id="metaDesc" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder={t("seoDescPlaceholder")} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
        <Label>{t("published")}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
        <Button type="submit" disabled={loading}>{loading ? t("saving") : isEdit ? t("update") : t("create")}</Button>
      </DialogFooter>
    </form>
  );
}

export function PageCreateButton() {
  const t = useTranslations("admin.pages");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("createPage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createPageTitle")}</DialogTitle>
          <DialogDescription>{t("createPageDesc")}</DialogDescription>
        </DialogHeader>
        <PageForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function PageEditButton({ page }: { page: PageItem }) {
  const t = useTranslations("admin.pages");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("editPageTitle")}</DialogTitle>
          <DialogDescription>{t("editPageDesc")}</DialogDescription>
        </DialogHeader>
        <PageForm page={page} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function PageDeleteButton({ pageId, title }: { pageId: string; title: string }) {
  const t = useTranslations("admin.pages");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(t("deleteConfirm", { pageTitle: title }))) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/pages?id=${pageId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("toasts.deleteFailed"));
        return;
      }
      toast.success(t("toasts.pageDeleted"));
      router.refresh();
    } catch {
      toast.error(t("toasts.deleteFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
