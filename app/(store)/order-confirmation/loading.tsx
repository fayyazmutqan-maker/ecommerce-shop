import { Skeleton } from "@/components/ui/skeleton";

export default function OrderConfirmationLoading() {
  return (
    <div className="mx-auto max-w-2xl px-6 lg:px-8 py-28 text-center">
      <Skeleton className="h-16 w-16 rounded-full mx-auto mb-6" />
      <Skeleton className="h-9 w-56 mx-auto mb-3" />
      <Skeleton className="h-5 w-72 mx-auto mb-2" />
      <Skeleton className="h-7 w-32 mx-auto mb-4" />
      <Skeleton className="h-6 w-40 mx-auto mb-8" />
      <Skeleton className="h-4 w-80 max-w-full mx-auto mb-8" />
      <Skeleton className="h-12 w-44 mx-auto rounded-md" />
    </div>
  );
}
