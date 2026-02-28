"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Star, CheckCircle } from "lucide-react";
import Link from "next/link";

interface ReviewFormProps {
  productId: string;
}

export function ReviewForm({ productId }: ReviewFormProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="border rounded-xl p-6 text-center space-y-3 bg-accent/30">
        <p className="text-sm text-muted-foreground">
          Sign in to leave a review
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="border rounded-xl p-6 text-center space-y-3 bg-green-50 dark:bg-green-950/20">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
        <p className="text-sm font-medium">Thank you for your review!</p>
        <p className="text-xs text-muted-foreground">
          Your review has been submitted and is pending approval.
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="border rounded-xl p-6 text-center space-y-3 bg-accent/30">
        <p className="text-sm text-muted-foreground">
          Have you used this product?
        </p>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Write a Review
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          toast.error("You have already reviewed this product");
        } else {
          throw new Error(err.error || "Failed to submit review");
        }
        return;
      }

      setSubmitted(true);
      toast.success("Review submitted successfully!");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit review"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-xl p-6 space-y-4 bg-accent/30"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Write a Review</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>

      {/* Star Rating */}
      <div className="space-y-2">
        <Label>Rating *</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-0.5 transition-colors"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Title (optional)</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={200}
        />
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label>Review (optional)</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/2000
        </p>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Submit Review
      </Button>
    </form>
  );
}
