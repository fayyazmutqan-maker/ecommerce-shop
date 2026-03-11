import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart + Recent orders */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-xl border bg-card lg:col-span-4">
          <div className="p-6 pb-3 space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="p-6 pt-0">
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border bg-card lg:col-span-3">
          <div className="p-6 pb-3 space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6 pt-0 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-xl border bg-card">
        <div className="p-6 pb-3 space-y-1">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="p-6 pt-0 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="text-right space-y-1.5">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-14 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
