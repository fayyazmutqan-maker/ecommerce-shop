import { Skeleton } from "@/components/ui/skeleton";
import { StoreProductCardGridSkeleton } from "@/components/store/store-skeletons";

export default function ProductsLoading() {
  return (
    <>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <StoreProductCardGridSkeleton count={12} />

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-10">
        <Skeleton className="h-9 w-9 rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-md" />
        ))}
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </>
  );
}
