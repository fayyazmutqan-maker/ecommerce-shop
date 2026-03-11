import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div>
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-24 w-full" /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-16" /></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-20" /></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-12" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
