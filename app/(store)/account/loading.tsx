import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-xl border p-5 flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full flex-shrink-0" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>

          <nav className="space-y-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-[18px] w-[18px] rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-9 w-36" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-5 text-center space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div className="rounded-xl border">
            <div className="flex items-center justify-between p-6 pb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="px-6 pb-6 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 border-b last:border-0">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
