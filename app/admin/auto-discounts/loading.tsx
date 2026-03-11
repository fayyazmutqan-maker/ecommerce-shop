import { Skeleton } from "@/components/ui/skeleton";

export default function AutoDiscountsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Name", "Type", "Value", "Conditions", "Status", "Actions"].map((h) => (
                  <th key={h} className="p-3 text-left"><Skeleton className="h-4 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
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
