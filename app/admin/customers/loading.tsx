import { AdminPageHeaderSkeleton, AdminTableSkeleton } from "@/components/admin/admin-skeletons";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeaderSkeleton titleClassName="w-36" subtitleClassName="w-56" />
      <AdminTableSkeleton columns={5} rows={8} />
    </div>
  );
}
