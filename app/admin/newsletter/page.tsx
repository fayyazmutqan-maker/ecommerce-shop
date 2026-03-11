"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Download, Mail, Users } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface SubscriberData {
  subscribers: Subscriber[];
  counts: { active: number; unsubscribed: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function NewsletterPage() {
  const [data, setData] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/newsletter?status=${status}&page=${page}&limit=50`);
      if (res.ok) setData(await res.json());
    } catch {
      toast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  function exportCSV() {
    if (!data?.subscribers.length) return;
    const csv = ["Email,Status,Subscribed At,Unsubscribed At"];
    data.subscribers.forEach((s) => {
      csv.push(`${s.email},${s.status},${s.subscribedAt},${s.unsubscribedAt || ""}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${status.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter Subscribers</h1>
          <p className="text-muted-foreground">Manage your email subscriber list</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!data?.subscribers.length}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.counts.active ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Subscribers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.counts.unsubscribed ?? 0}</p>
              <p className="text-xs text-muted-foreground">Unsubscribed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="ACTIVE">Active ({data?.counts.active ?? 0})</TabsTrigger>
          <TabsTrigger value="UNSUBSCRIBED">Unsubscribed ({data?.counts.unsubscribed ?? 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !data?.subscribers.length ? (
            <div className="text-center py-20 text-muted-foreground">No subscribers found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribed At</TableHead>
                    <TableHead>Unsubscribed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.subscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>
                        <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sub.subscribedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.unsubscribedAt ? new Date(sub.unsubscribedAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
