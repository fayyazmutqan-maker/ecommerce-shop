import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 flex items-start gap-4">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-full max-w-md" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
