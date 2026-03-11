import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-10">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-5 flex gap-5">
              <Skeleton className="h-20 w-20 sm:h-28 sm:w-28 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Skeleton className="h-9 w-28 rounded-lg" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
            <Skeleton className="h-11 w-40 rounded-md" />
            <Skeleton className="h-11 w-28 rounded-md" />
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="rounded-xl border p-6 space-y-5">
            <Skeleton className="h-6 w-36" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
