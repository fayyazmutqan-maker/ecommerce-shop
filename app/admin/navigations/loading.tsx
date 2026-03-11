import { Skeleton } from "@/components/ui/skeleton";

export default function NavigationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-36" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <div className="space-y-2 pl-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
