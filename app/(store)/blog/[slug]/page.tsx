import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslations, applyTranslationsBatch } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/helpers";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)),
  });

  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.seoTitle || post.title} | Blog | ShopFlow`,
    description: post.seoDescription || post.excerpt || post.content?.slice(0, 160),
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const rawPost = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.isPublished, true)),
    with: { author: { columns: { id: true, name: true, image: true } } },
  });

  if (!rawPost) notFound();

  // Get related posts
  const rawRelated = await db.query.blogPosts.findMany({
    where: and(eq(blogPosts.isPublished, true), ne(blogPosts.id, rawPost.id)),
    orderBy: desc(blogPosts.publishedAt),
    limit: 3,
  });

  // Apply locale translations
  const locale = await getLocale();
  const post = await applyTranslations("blogPost", rawPost as Record<string, unknown>, locale) as typeof rawPost;
  const relatedPosts = await applyTranslationsBatch("blogPost", rawRelated as Record<string, unknown>[], locale) as typeof rawRelated;

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Blog", href: "/blog" },
        { label: post.title },
      ]} />

      <article>
        {/* Header */}
        <header className="mb-8">
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.split(",").map((tag) => (
                <Badge key={tag} variant="secondary">{tag.trim()}</Badge>
              ))}
            </div>
          )}
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">{post.title}</h1>
          {post.excerpt && (
            <p className="text-lg text-muted-foreground mt-4">{post.excerpt}</p>
          )}
          <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
            {post.author?.name && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" /> {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {formatDate(post.publishedAt)}
              </span>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="aspect-video rounded-lg overflow-hidden mb-8">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <>
          <Separator className="my-12" />
          <section>
            <h2 className="text-2xl font-bold mb-6">More Posts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link key={related.id} href={`/blog/${related.slug}`}
                  className="group block space-y-2">
                  {related.featuredImage && (
                    <div className="aspect-video rounded-lg overflow-hidden relative">
                      <Image src={related.featuredImage} alt={related.title}
                        fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw" />
                    </div>
                  )}
                  <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                  {related.publishedAt && (
                    <p className="text-xs text-muted-foreground">{formatDate(related.publishedAt)}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Back to blog */}
      <div className="mt-12">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    </div>
  );
}
