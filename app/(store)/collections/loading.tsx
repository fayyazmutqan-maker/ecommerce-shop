import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="space-y-2 mb-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <Skeleton className="h-6 w-32 bg-white/30" />
              <Skeleton className="h-4 w-24 bg-white/20 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
