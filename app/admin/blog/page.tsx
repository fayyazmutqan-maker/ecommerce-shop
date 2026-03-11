"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { formatDate } from "@/lib/helpers";
import { useFetch } from "@/hooks/use-fetch";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featuredImage: string | null;
  tags: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  author?: { id: string; name: string | null; image: string | null };
}

const emptyForm = {
  title: "",
  content: "",
  excerpt: "",
  featuredImage: "",
  tags: "",
  isPublished: false,
  seoTitle: "",
  seoDescription: "",
};

export default function BlogAdminPage() {
  const { data: posts, loading, setData: setPosts, refetch: fetchPosts } = useFetch<BlogPost[]>(
    "/api/blog?admin=true",
    [],
    { errorMessage: "Failed to fetch posts" }
  );
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(post: BlogPost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      content: post.content || "",
      excerpt: post.excerpt || "",
      featuredImage: post.featuredImage || "",
      tags: post.tags || "",
      isPublished: post.isPublished,
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
    });
    setShowDialog(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch("/api/blog", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingId ? "Post updated" : "Post created");
        setShowDialog(false);
        fetchPosts();
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch {
      toast.error("Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch(`/api/blog?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Post deleted");
        fetchPosts();
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">Manage your blog posts for content marketing</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Post</Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Post" : "Create Post"}</DialogTitle>
              <DialogDescription>Write and publish blog content</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input required value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Excerpt</Label>
                <Textarea rows={2} value={form.excerpt} placeholder="Brief summary..."
                  onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea rows={12} value={form.content} placeholder="Write your post..."
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Featured Image URL</Label>
                <Input value={form.featuredImage} placeholder="https://..."
                  onChange={(e) => setForm((p) => ({ ...p, featuredImage: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input value={form.tags} placeholder="news, updates, tips"
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isPublished}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, isPublished: checked }))} />
                <Label>Published</Label>
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">SEO</p>
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input value={form.seoTitle}
                    onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>SEO Description</Label>
                  <Textarea rows={2} value={form.seoDescription}
                    onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {post.featuredImage ? (
                          <Image src={post.featuredImage} alt="" width={32} height={32} className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{post.title}</p>
                          <p className="text-xs text-muted-foreground">/{post.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{post.author?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {post.tags?.split(",").slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.isPublished ? "default" : "secondary"}>
                        {post.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {post.publishedAt ? formatDate(post.publishedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(post)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {posts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No blog posts yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
