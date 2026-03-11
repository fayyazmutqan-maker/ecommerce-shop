import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-[440px] rounded-xl border p-6 space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-44 mx-auto" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <Skeleton className="h-4 w-36 mx-auto" />
      </div>
    </div>
  );
}
