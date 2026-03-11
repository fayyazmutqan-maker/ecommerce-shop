import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
      {/* Search Header */}
      <div className="max-w-2xl mx-auto mb-10">
        <Skeleton className="h-9 w-48 mx-auto mb-6" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>

      {/* Results count */}
      <Skeleton className="h-4 w-40 mb-6" />

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-20" />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
