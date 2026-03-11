import { Skeleton } from "@/components/ui/skeleton";

export default function StoreCreditLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center gap-4 mb-10">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Balance Card */}
      <div className="rounded-xl border p-6 text-center mb-8">
        <Skeleton className="h-4 w-28 mx-auto mb-2" />
        <Skeleton className="h-10 w-40 mx-auto" />
      </div>
      {/* Transaction History */}
      <div className="rounded-xl border">
        <div className="p-6 pb-4">
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="px-6 pb-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
