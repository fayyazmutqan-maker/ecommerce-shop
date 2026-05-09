import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminPageHeaderSkeleton({
  titleClassName = "w-40",
  subtitleClassName = "w-64",
  actionClassName,
}: {
  titleClassName?: string;
  subtitleClassName?: string;
  actionClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="space-y-2">
        <Skeleton className={`h-9 ${titleClassName}`} />
        <Skeleton className={`h-4 ${subtitleClassName}`} />
      </div>
      {actionClassName && <Skeleton className={`h-10 rounded-md ${actionClassName}`} />}
    </div>
  );
}

export function AdminStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="pt-6 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({
  columns,
  rows = 8,
  showSearch = true,
  showPagination = true,
}: {
  columns: number;
  rows?: number;
  showSearch?: boolean;
  showPagination?: boolean;
}) {
  return (
    <Card>
      {showSearch && (
        <CardHeader className="pb-3">
          <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        </CardHeader>
      )}
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {Array.from({ length: columns }).map((_, index) => (
                  <th key={index} className="p-3 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-0">
                  {Array.from({ length: columns }).map((_, columnIndex) => (
                    <td key={columnIndex} className="p-3">
                      {columnIndex === 0 ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      ) : columnIndex === columns - 1 ? (
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8 rounded-md" />
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                      ) : columnIndex === 2 || columnIndex === 3 ? (
                        <Skeleton className="h-5 w-20 rounded-full" />
                      ) : (
                        <Skeleton className="h-4 w-24" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showPagination && (
          <div className="flex items-center justify-between pt-4">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminOrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-44 sm:w-56" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-6 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="hidden grid-cols-[minmax(0,1fr)_64px_96px_96px] gap-4 border-b pb-3 md:grid">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-10 justify-self-center" />
                  <Skeleton className="h-4 w-16 justify-self-end" />
                  <Skeleton className="h-4 w-16 justify-self-end" />
                </div>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 border-b pb-4 last:border-0 md:grid-cols-[minmax(0,1fr)_64px_96px_96px] md:items-center"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full max-w-64" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-4 w-8 justify-self-end md:justify-self-center" />
                    <Skeleton className="hidden h-4 w-20 justify-self-end md:block" />
                    <Skeleton className="h-4 w-20 justify-self-end" />
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="ml-auto max-w-sm space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex justify-between gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between gap-4">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>

          {Array.from({ length: 2 }).map((_, cardIndex) => (
            <Card key={cardIndex}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-full max-w-sm" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-6 w-36" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
