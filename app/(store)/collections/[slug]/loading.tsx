import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Collection header */}
      <div className="space-y-3 mb-10">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        {/* Filter Sidebar */}
        <div className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
