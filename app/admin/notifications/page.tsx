"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Loader2, Check, CheckCheck, Trash2, Package, Users, AlertTriangle, Star, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/helpers";
import { useFetch } from "@/hooks/use-fetch";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

const typeIcons: Record<string, any> = {
  NEW_ORDER: Package,
  LOW_STOCK: AlertTriangle,
  NEW_CUSTOMER: Users,
  RETURN_REQUEST: RotateCcw,
  NEW_REVIEW: Star,
};

export default function NotificationsPage() {
  const t = useTranslations("admin.notifications");
  const { data, loading, refetch: fetchNotifications } = useFetch<{ notifications: Notification[]; unreadCount: number }>(
    "/api/notifications",
    { notifications: [], unreadCount: 0 },
    { errorMessage: "Failed to fetch notifications" }
  );
  const notifications = data.notifications;
  const unreadCount = data.unreadCount;

  async function markAsRead(id: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      fetchNotifications();
    } catch {
      toast.error(t("toasts.updateFailed"));
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("toasts.allMarkedRead"));
      fetchNotifications();
    } catch {
      toast.error(t("toasts.updateFailed"));
    }
  }

  async function deleteNotification(id: string) {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchNotifications();
    } catch {
      toast.error(t("toasts.deleteFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allCaughtUp")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> {t("markAllRead")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-3 w-[40%]" />
                </div>
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium">{t("noNotifications")}</p>
            <p className="text-sm text-muted-foreground">{t("youllSeeNew")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            return (
              <Card key={notif.id} className={`transition-colors ${!notif.isRead ? "bg-accent/30 border-primary/20" : ""}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`mt-0.5 p-2 rounded-full ${!notif.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!notif.isRead ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                      {!notif.isRead && <Badge variant="default" className="text-[10px] px-1.5 py-0">{t("new")}</Badge>}
                    </div>
                    {notif.message && <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(notif.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notif.isRead && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)} title={t("markAsRead")}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => deleteNotification(notif.id)} title={t("delete")}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
