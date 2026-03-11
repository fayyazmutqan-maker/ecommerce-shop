import { Skeleton } from "@/components/ui/skeleton";

export default function WishlistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-4 mb-10">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
