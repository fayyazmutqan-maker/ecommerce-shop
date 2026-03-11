import { Skeleton } from "@/components/ui/skeleton";

export default function BlogPostLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Title */}
      <Skeleton className="h-12 w-full max-w-2xl" />
      <Skeleton className="h-12 w-3/4 mt-2" />

      {/* Excerpt */}
      <Skeleton className="h-5 w-full max-w-xl mt-4" />

      {/* Author & Date */}
      <div className="flex items-center gap-4 mt-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Featured Image */}
      <Skeleton className="aspect-video w-full rounded-lg mt-8 mb-8" />

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="h-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="h-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Separator */}
      <Skeleton className="h-px w-full my-12" />

      {/* Related Posts */}
      <Skeleton className="h-7 w-32 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Back link */}
      <Skeleton className="h-4 w-28 mt-12" />
    </div>
  );
}
