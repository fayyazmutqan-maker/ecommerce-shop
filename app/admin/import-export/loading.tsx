import { Skeleton } from "@/components/ui/skeleton";

export default function ImportExportLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <div className="rounded-xl border p-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-40 w-full rounded-lg border-2 border-dashed" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        {/* Export */}
        <div className="rounded-xl border p-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
