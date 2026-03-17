"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Star, Check, X, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useFetch } from "@/hooks/use-fetch";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
  product: { id: string; name: string; slug: string } | null;
}

export default function ReviewsPage() {
  const t = useTranslations("admin.reviews");
  const { data: reviews, loading, setData: setReviews, refetch: fetchReviews } = useFetch<Review[]>(
    "/api/reviews?admin=true",
    [],
    { errorMessage: "Failed to load reviews" }
  );
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  async function toggleApproval(id: string, approve: boolean) {
    try {
      const res = await fetch("/api/reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isApproved: approve }),
      });
      if (!res.ok) throw new Error();
      toast.success(approve ? t("toasts.reviewApproved") : t("toasts.reviewRejected"));
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, isApproved: approve } : r));
    } catch {
      toast.error(t("toasts.updateFailed"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("toasts.reviewDeleted"));
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error(t("toasts.deleteFailed"));
    }
  }

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.isApproved;
    if (filter === "approved") return r.isApproved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.isApproved).length;
  const approvedCount = reviews.filter((r) => r.isApproved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">{t("total", { count: reviews.length })}</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 text-yellow-600">{t("pending", { count: pendingCount })}</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 text-green-600">{t("approvedCount", { count: approvedCount })}</Badge>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">{t("all", { count: reviews.length })}</TabsTrigger>
          <TabsTrigger value="pending">{t("pendingTab", { count: pendingCount })}</TabsTrigger>
          <TabsTrigger value="approved">{t("approvedTab", { count: approvedCount })}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[20%]" />
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[10%]" />
                  <Skeleton className="h-4 w-[25%]" />
                  <Skeleton className="h-4 w-[10%]" />
                  <Skeleton className="h-4 w-[12%]" />
                  <Skeleton className="h-4 w-[8%]" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{t("noReviewsFound")}</div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("rating")}</TableHead>
                  <TableHead className="max-w-[300px]">{t("review")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="w-[140px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      {review.product ? (
                        <Link href={`/admin/products/${review.product.slug}`} className="text-sm font-medium hover:underline flex items-center gap-1">
                          {review.product.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : <span className="text-muted-foreground text-sm">{t("deletedProduct")}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{review.user?.name || t("anonymous")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {review.title && <p className="font-medium text-sm">{review.title}</p>}
                      {review.comment && <p className="text-xs text-muted-foreground line-clamp-2">{review.comment}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={review.isApproved ? "default" : "secondary"}>
                        {review.isApproved ? t("approved") : t("pendingReview")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!review.isApproved && (
                          <Button size="icon" variant="ghost" className="text-green-600" onClick={() => toggleApproval(review.id, true)} title="Approve">
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {review.isApproved && (
                          <Button size="icon" variant="ghost" className="text-yellow-600" onClick={() => toggleApproval(review.id, false)} title="Reject">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(review.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
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
