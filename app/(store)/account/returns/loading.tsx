import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnsLoading() {
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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-24 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
