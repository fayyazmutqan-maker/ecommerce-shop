import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {["Overview", "Financials", "Top Products", "Customers", "Abandoned Carts"].map((tab) => (
          <Skeleton key={tab} className="h-9 w-28 rounded-t-md" />
        ))}
      </div>

      {/* Chart area */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-xl border p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="lg:col-span-3 rounded-xl border p-6 space-y-4">
          <Skeleton className="h-6 w-32 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
