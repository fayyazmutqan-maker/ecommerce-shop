import { Skeleton } from "@/components/ui/skeleton";

export default function GiftCardsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Code", "Balance", "Status", "Recipient", "Created", "Actions"].map((h) => (
                  <th key={h} className="p-3 text-left"><Skeleton className="h-4 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-36 font-mono" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3"><Skeleton className="h-8 w-8 rounded-md" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
