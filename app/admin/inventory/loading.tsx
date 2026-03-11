import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Product", "SKU", "Current", "Adjust", "New Qty", "Status"].map((h) => (
                  <th key={h} className="p-3 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20 font-mono" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-10" /></td>
                  <td className="p-3"><Skeleton className="h-9 w-20 rounded-md" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-10" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
