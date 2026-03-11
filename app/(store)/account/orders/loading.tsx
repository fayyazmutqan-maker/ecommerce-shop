import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Order Cards */}
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border">
            <div className="p-6 pb-4 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-44" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-0">
                <div className="grid grid-cols-3 py-2 border-b">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8 mx-auto" />
                  <Skeleton className="h-4 w-14 ml-auto" />
                </div>
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="grid grid-cols-3 py-3 border-b last:border-0">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-4 mx-auto" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
