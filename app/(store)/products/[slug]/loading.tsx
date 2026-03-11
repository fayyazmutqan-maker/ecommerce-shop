import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-8">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Product Detail: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* Image Gallery */}
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-lg shrink-0" />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-9 w-4/5" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          <Skeleton className="h-px w-full" />

          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>

          {/* Variant options */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 rounded-md" />
              ))}
            </div>
          </div>

          {/* Add to cart */}
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-11 w-28 rounded-md" />
            <Skeleton className="h-11 flex-1 rounded-md" />
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg border">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs placeholder */}
      <div className="mt-16 space-y-6">
        <div className="flex gap-6 border-b">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      {/* Related products */}
      <div className="mt-20 space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
