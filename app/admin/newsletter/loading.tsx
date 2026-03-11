import { Skeleton } from "@/components/ui/skeleton";

export default function NewsletterLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="flex gap-1 border-b pb-0">
        <Skeleton className="h-9 w-28 rounded-t-md" />
        <Skeleton className="h-9 w-32 rounded-t-md" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Email", "Status", "Subscribed", "Actions"].map((h) => (
                  <th key={h} className="p-3 text-left"><Skeleton className="h-4 w-20" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
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
