import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {["All", "Pending", "Approved"].map((tab) => (
          <Skeleton key={tab} className="h-9 w-28 rounded-t-md" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Product", "Customer", "Rating", "Review", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="p-3 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="p-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-4 rounded" />
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </td>
                  <td className="p-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
