import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full max-w-sm rounded-md" />

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Customer", "Email", "Orders", "Total Spent", "Joined"].map((h) => (
                  <th key={h} className="p-3 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="p-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}
