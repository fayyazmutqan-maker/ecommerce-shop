import { Skeleton } from "@/components/ui/skeleton";

export default function TranslationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
