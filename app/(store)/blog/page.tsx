import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/helpers";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | ShopFlow",
  description: "Read the latest news, tips, and updates from our store",
};

export default async function BlogPage() {
  const rawPosts = await db.query.blogPosts.findMany({
    where: eq(blogPosts.isPublished, true),
    orderBy: desc(blogPosts.publishedAt),
    with: { author: { columns: { id: true, name: true, image: true } } },
  });

  // Apply locale translations
  const locale = await getLocale();
  const posts = await applyTranslationsBatch("blogPost", rawPosts as Record<string, unknown>[], locale) as typeof rawPosts;

  // Extract unique tags
  const allTags = [...new Set(
    posts.flatMap((p) => p.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [])
  )];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: "Blog" }]} />

      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="text-lg text-muted-foreground mt-2">Latest news, tips, and updates</p>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {allTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-accent">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">No blog posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="group overflow-hidden border shadow-none hover:shadow-md transition-all h-full">
                {post.featuredImage && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags?.split(",").slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px]">{tag.trim()}</Badge>
                    ))}
                  </div>
                  <h2 className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    {post.author?.name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {post.author.name}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDate(post.publishedAt)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
