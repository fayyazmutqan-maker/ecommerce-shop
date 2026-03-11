import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-9 w-36" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div className="rounded-xl border p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border p-6 space-y-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="rounded-xl border p-6 space-y-5">
            <Skeleton className="h-5 w-32" />

            {/* Items */}
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16 flex-shrink-0" />
                </div>
              ))}
            </div>

            <Skeleton className="h-px w-full" />

            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <Skeleton className="h-px w-full" />

            {/* Coupon */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1 rounded-md" />
                <Skeleton className="h-10 w-20 rounded-md" />
              </div>
            </div>

            <Skeleton className="h-px w-full" />

            <div className="flex justify-between">
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-6 w-24" />
            </div>

            <Skeleton className="h-12 w-full rounded-md" />

            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
