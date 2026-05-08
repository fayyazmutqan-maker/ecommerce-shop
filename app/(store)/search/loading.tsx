import { Skeleton } from "@/components/ui/skeleton";
import { StoreProductCardGridSkeleton } from "@/components/store/store-skeletons";

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

      <StoreProductCardGridSkeleton />
    </div>
  );
}
