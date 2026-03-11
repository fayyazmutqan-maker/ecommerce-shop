import { Skeleton } from "@/components/ui/skeleton";

export default function ReturnsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-sm rounded-md" />
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Return", "Order", "Customer", "Items", "Reason", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="p-3 text-left"><Skeleton className="h-4 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3"><div className="flex gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
