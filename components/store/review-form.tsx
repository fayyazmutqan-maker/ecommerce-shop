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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("review");

  if (status === "loading") return null;

  if (!session?.user) {
    return (
      <div className="border rounded-xl p-6 text-center space-y-3 bg-accent/30">
        <p className="text-sm text-muted-foreground">
          {t("signInToReview")}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="border rounded-xl p-6 text-center space-y-3 bg-green-50 dark:bg-green-950/20">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
        <p className="text-sm font-medium">{t("thankYou")}</p>
        <p className="text-xs text-muted-foreground">
          {t("pendingApproval")}
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="border rounded-xl p-6 text-center space-y-3 bg-accent/30">
        <p className="text-sm text-muted-foreground">
          {t("haveYouUsed")}
        </p>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          {t("writeReview")}
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error(t("selectRating"));
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
          toast.error(t("alreadyReviewed"));
        } else {
          throw new Error(err.error || "Failed to submit review");
        }
        return;
      }

      setSubmitted(true);
      toast.success(t("reviewSubmitted"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t("failedSubmit")
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
        <h3 className="text-sm font-semibold">{t("writeReview")}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setIsOpen(false)}
        >
          {t("cancel")}
        </Button>
      </div>

      {/* Star Rating */}
      <div className="space-y-2">
        <Label>{t("ratingRequired")}</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-2 transition-colors"
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
              {rating === 1 && t("poor")}
              {rating === 2 && t("fair")}
              {rating === 3 && t("good")}
              {rating === 4 && t("veryGood")}
              {rating === 5 && t("excellent")}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>{t("titleOptional")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={200}
        />
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label>{t("reviewOptional")}</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("reviewPlaceholder")}
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
        {t("submitReview")}
      </Button>
    </form>
  );
}
