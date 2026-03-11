import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-4 mb-10">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-xl border p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
