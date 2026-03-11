import { Skeleton } from "@/components/ui/skeleton";

export default function StoreLoading() {
  return (
    <div>
      {/* Hero Section Skeleton */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/60 via-background to-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-2xl space-y-8">
            <Skeleton className="h-7 w-44 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-14 md:h-16 lg:h-20 w-80 md:w-[420px]" />
              <Skeleton className="h-14 md:h-16 lg:h-20 w-64 md:w-[340px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-96 max-w-full" />
              <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-12 w-36 rounded-md" />
              <Skeleton className="h-12 w-44 rounded-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar Skeleton */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-4 px-3 sm:py-6 sm:px-6 border-b lg:border-b-0 lg:border-l lg:first:border-l-0"
              >
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Skeleton */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-56" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-40 space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Skeleton */}
      <section className="py-20 lg:py-24 bg-accent/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-52" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner Skeleton */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Skeleton className="w-full h-64 md:h-80 rounded-2xl" />
        </div>
      </section>

      {/* New Arrivals Skeleton */}
      <section className="py-20 lg:py-24 bg-accent/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-44" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Skeleton */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center space-y-4">
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-9 w-64 mx-auto" />
            <Skeleton className="h-5 w-80 mx-auto max-w-full" />
            <div className="flex gap-3 mt-8 max-w-md mx-auto">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
