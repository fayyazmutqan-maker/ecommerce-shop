"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/image-upload";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Plus, Loader2, Pencil, Trash2, FileText, ArrowLeft, Eye, FolderPlus, X,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/helpers";
import { useFetch } from "@/hooks/use-fetch";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}

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
  categories?: BlogCategory[];
}

const emptyForm = {
  title: "",
  content: "",
  excerpt: "",
  featuredImage: "",
  tags: "",
  categoryIds: [] as string[],
  isPublished: false,
  seoTitle: "",
  seoDescription: "",
};

// ─── Post List View ─────────────────────────────────────────
function PostList({
  posts,
  loading,
  onEdit,
  onDelete,
  onNew,
}: {
  posts: BlogPost[];
  loading: boolean;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">Manage your blog posts and categories</p>
        </div>
        <Button onClick={onNew}><Plus className="mr-2 h-4 w-4" /> New Post</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[30%]" />
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[10%]" />
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[10%]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id} className="cursor-pointer" onClick={() => onEdit(post)}>
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
                          {post.categories?.slice(0, 3).map((cat) => (
                            <Badge key={cat.id} variant="outline" className="text-xs">{cat.name}</Badge>
                          ))}
                          {!post.categories?.length && <span className="text-xs text-muted-foreground">—</span>}
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => onEdit(post)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(post.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {posts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No blog posts yet. Click &quot;New Post&quot; to create one.
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

// ─── Post Editor View (WordPress-style) ─────────────────────
function PostEditor({
  editingId,
  form,
  setForm,
  saving,
  onSave,
  onBack,
  categories,
  onCategoryCreated,
}: {
  editingId: string | null;
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
  categories: BlogCategory[];
  onCategoryCreated: () => void;
}) {
  const [seoOpen, setSeoOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  const toggleCategory = (id: string) => {
    setForm((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id)
        ? p.categoryIds.filter((c) => c !== id)
        : [...p.categoryIds, id],
    }));
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch("/api/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (res.ok) {
        const cat = await res.json();
        setForm((p) => ({ ...p, categoryIds: [...p.categoryIds, cat.id] }));
        setNewCatName("");
        setShowCatForm(false);
        onCategoryCreated();
        toast.success("Category created");
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch {
      toast.error("Failed to create category");
    } finally {
      setAddingCat(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> All Posts
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingId ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ─── Main Content Area ─── */}
        <div className="space-y-4">
          {/* Title */}
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Post title"
            className="text-2xl h-14 border-0 shadow-none px-4 focus-visible:ring-0 placeholder:text-muted-foreground/50 bg-white dark:bg-zinc-950 text-foreground"
          />

          {/* Rich Text Editor */}
          <RichTextEditor
            content={form.content}
            onChange={(html) => setForm((p) => ({ ...p, content: html }))}
            placeholder="Start writing your post..."
          />

          {/* Excerpt */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Excerpt</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <Textarea
                rows={3}
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                placeholder="Brief summary of the post (displayed in listings)..."
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setSeoOpen((o) => !o)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">SEO Settings</CardTitle>
                {seoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </CardHeader>
            {seoOpen && (
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">SEO Title</Label>
                  <Input
                    value={form.seoTitle}
                    onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                    placeholder={form.title || "Post title"}
                  />
                  <p className="text-xs text-muted-foreground">{(form.seoTitle || form.title).length}/60</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta Description</Label>
                  <Textarea
                    rows={2}
                    value={form.seoDescription}
                    onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                    placeholder="Description for search engines..."
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{form.seoDescription.length}/160</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* ─── Sidebar ─── */}
        <div className="space-y-4">
          {/* Publish */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Publish</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Status</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isPublished}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, isPublished: checked }))}
                  />
                  <span className="text-sm">{form.isPublished ? "Published" : "Draft"}</span>
                </div>
              </div>
              <Separator />
              <Button className="w-full" onClick={onSave} disabled={saving || !form.title.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Update Post" : form.isPublished ? "Publish" : "Save Draft"}
              </Button>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {categories.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={form.categoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No categories yet</p>
              )}
              <Separator />
              {showCatForm ? (
                <div className="space-y-2">
                  <Input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category name"
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCatForm(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" onClick={addCategory} disabled={addingCat || !newCatName.trim()}>
                      {addingCat ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => setShowCatForm(true)}>
                  <FolderPlus className="h-3 w-3 mr-1" /> Add New Category
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              <Input
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="news, updates, tips"
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">Separate with commas</p>
              {form.tags && (
                <div className="flex flex-wrap gap-1">
                  {form.tags.split(",").filter(Boolean).map((tag) => (
                    <Badge key={tag.trim()} variant="secondary" className="text-xs">
                      {tag.trim()}
                      <button
                        type="button"
                        className="ml-1"
                        onClick={() => {
                          const tags = form.tags.split(",").map((t) => t.trim()).filter((t) => t !== tag.trim()).join(", ");
                          setForm((p) => ({ ...p, tags }));
                        }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <ImageUpload
                value={form.featuredImage ? [form.featuredImage] : []}
                onChange={(urls) => setForm((p) => ({ ...p, featuredImage: urls[0] || "" }))}
                folder="blog"
                maxImages={1}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function BlogAdminPage() {
  const { data, loading, refetch: fetchPosts } = useFetch<{ posts: BlogPost[]; total: number }>(
    "/api/blog?admin=true",
    { posts: [], total: 0 },
    { errorMessage: "Failed to fetch posts" }
  );
  const posts = data.posts;

  const { data: categories, refetch: fetchCategories } = useFetch<BlogCategory[]>(
    "/api/blog/categories",
    [],
    { errorMessage: "Failed to fetch categories" }
  );

  const [view, setView] = useState<"list" | "editor">("list");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setView("editor");
  }

  function openEdit(post: BlogPost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      content: post.content || "",
      excerpt: post.excerpt || "",
      featuredImage: post.featuredImage || "",
      tags: post.tags || "",
      categoryIds: post.categories?.map((c) => c.id) || [],
      isPublished: post.isPublished,
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
    });
    setView("editor");
  }

  async function handleSave() {
    if (!form.title.trim()) return;
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
        setView("list");
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

  if (view === "editor") {
    return (
      <PostEditor
        editingId={editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onBack={() => setView("list")}
        categories={categories}
        onCategoryCreated={fetchCategories}
      />
    );
  }

  return (
    <PostList
      posts={posts}
      loading={loading}
      onEdit={openEdit}
      onDelete={handleDelete}
      onNew={openCreate}
    />
  );
}
