import { Skeleton } from "@/components/ui/skeleton";
import { StoreProductCardGridSkeleton } from "@/components/store/store-skeletons";

export default function CollectionDetailLoading() {
  return (
    <>
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

      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <StoreProductCardGridSkeleton count={12} />
    </>
  );
}
