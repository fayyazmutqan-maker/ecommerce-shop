import { Skeleton } from "@/components/ui/skeleton";

export default function GiftCardsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <Skeleton className="h-12 w-12 mx-auto mb-4 rounded" />
        <Skeleton className="h-9 w-36 mx-auto mb-2" />
        <Skeleton className="h-5 w-80 max-w-full mx-auto" />
      </div>

      {/* Tab buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-2 mb-8">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>

      {/* Form Card */}
      <div className="max-w-xl mx-auto rounded-xl border p-6 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Amount buttons */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20 rounded-md" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-10 w-48 rounded-md" />
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Recipient fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>

        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
