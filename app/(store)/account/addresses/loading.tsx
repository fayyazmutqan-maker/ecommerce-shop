import { Skeleton } from "@/components/ui/skeleton";

export default function AddressesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
