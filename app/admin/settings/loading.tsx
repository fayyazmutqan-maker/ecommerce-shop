import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {["General", "Payments & Tax", "Shipping", "Social & SEO", "Advanced"].map((tab) => (
          <Skeleton key={tab} className="h-9 w-32 rounded-t-md" />
        ))}
      </div>

      {/* Form Cards */}
      <div className="space-y-6">
        <div className="rounded-xl border p-6 space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-6 space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-full rounded-lg border-2 border-dashed" />
          </div>
        </div>
      </div>
    </div>
  );
}
