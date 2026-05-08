import { AdminPageHeaderSkeleton, AdminTableSkeleton } from "@/components/admin/admin-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLogLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeaderSkeleton titleClassName="w-36" subtitleClassName="w-56" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <AdminTableSkeleton columns={5} rows={10} showSearch={false} />
    </div>
  );
}
