import { AdminPageHeaderSkeleton, AdminStatsSkeleton, AdminTableSkeleton } from "@/components/admin/admin-skeletons";

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeaderSkeleton titleClassName="w-28" subtitleClassName="w-72" />
      <AdminStatsSkeleton />
      <AdminTableSkeleton columns={8} rows={8} />
    </div>
  );
}
