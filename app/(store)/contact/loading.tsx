import { Skeleton } from "@/components/ui/skeleton";

export default function ContactLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Header */}
      <div className="mb-10">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-5 w-96 max-w-full mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border p-6 space-y-5">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <div className="rounded-xl border p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
