import { Skeleton } from "@/components/ui/skeleton";

function PosProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-2">
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function PosPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[560px] overflow-hidden rounded-lg border bg-background md:h-[calc(100vh-7rem)]">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex gap-2 border-b p-3">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>

        <div className="hidden flex-wrap items-center gap-3 border-b bg-muted/30 px-3 py-2 md:flex">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Skeleton className="h-5 w-7 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        <div className="border-b px-3 py-2">
          <div className="flex gap-1 overflow-hidden">
            <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, index) => (
              <PosProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>

      <aside className="hidden w-100 flex-col overflow-hidden border-l bg-card md:flex">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>

        <div className="border-b p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-8 flex-1 rounded-md" />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-hidden p-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-lg border bg-background p-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        </div>
      </aside>

      <Skeleton className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg md:hidden" />
    </div>
  );
}
