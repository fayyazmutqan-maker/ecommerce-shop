import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Navbar placeholder */}
      <div className="h-16 border-b bg-background flex items-center px-6 gap-4">
        <Skeleton className="h-8 w-28" />
        <div className="hidden md:flex gap-6 ml-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
        <div className="ml-auto flex gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      {/* Hero placeholder */}
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl space-y-6">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-12 w-96 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-11 w-36 rounded-md" />
            <Skeleton className="h-11 w-36 rounded-md" />
          </div>
        </div>
      </div>
      {/* Content grid placeholder */}
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
