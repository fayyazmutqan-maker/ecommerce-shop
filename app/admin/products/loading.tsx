import { AdminPageHeaderSkeleton, AdminTableSkeleton } from "@/components/admin/admin-skeletons";

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeaderSkeleton titleClassName="w-36" subtitleClassName="w-56" actionClassName="w-36" />
      <AdminTableSkeleton columns={7} rows={8} />
    </div>
  );
}
