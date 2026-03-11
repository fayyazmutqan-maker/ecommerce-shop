"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Loader2, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string } | null;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchReviews() {
    try {
      const res = await fetch("/api/reviews?mine=true");
      if (!res.ok) {
        if (res.status === 401) { router.push("/login"); return; }
        throw new Error();
      }
      setReviews(await res.json());
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReviews(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete() {
    if (!deletingReview) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews?id=${deletingReview.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete review");
        return;
      }
      toast.success("Review deleted");
      setDeleteDialogOpen(false);
      setDeletingReview(null);
      fetchReviews();
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setDeleting(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Reviews" },
      ]} />

      <div className="flex items-center gap-4 mb-10">
        <Button variant="outline" size="icon" asChild className="h-10 w-10">
          <Link href="/account">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            Account
          </p>
          <h1 className="text-3xl font-bold">My Reviews</h1>
        </div>
      </div>

      {reviews.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-3 font-medium">
              No reviews yet
            </p>
            <p className="text-sm text-muted-foreground">
              Reviews you submit on products will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="shadow-none border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {renderStars(review.rating)}
                      <Badge variant={review.isApproved ? "secondary" : "outline"} className="text-xs">
                        {review.isApproved ? "Published" : "Pending Approval"}
                      </Badge>
                    </div>
                    {review.product && (
                      <Link
                        href={`/products/${review.product.slug}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {review.product.name}
                      </Link>
                    )}
                    {review.title && (
                      <p className="font-medium mt-1">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.createdAt).toLocaleDateString("en-SA", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => { setDeletingReview(review); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
