import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-[440px] rounded-xl border p-6 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-40 mx-auto" />
          <Skeleton className="h-5 w-56 mx-auto" />
        </div>

        {/* Google button */}
        <Skeleton className="h-11 w-full rounded-md" />

        {/* Separator */}
        <div className="relative flex items-center">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-4 w-40 mx-3" />
          <Skeleton className="h-px flex-1" />
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>

        {/* Footer */}
        <Skeleton className="h-4 w-52 mx-auto" />
      </div>
    </div>
  );
}
