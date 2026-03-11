"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, LogOut, User, Settings, Package, AlertTriangle, Users, Star, RotateCcw, CheckCheck, Loader2 } from "lucide-react";
import { getInitials } from "@/lib/helpers";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  NEW_ORDER: Package,
  LOW_STOCK: AlertTriangle,
  NEW_CUSTOMER: Users,
  RETURN_REQUEST: RotateCcw,
  NEW_REVIEW: Star,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function AdminHeader() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications?.slice(0, 5) || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white dark:bg-neutral-900 px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <ThemeToggle />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                      !notif.isRead ? "bg-accent/30" : ""
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${!notif.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!notif.isRead ? "font-semibold" : ""}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t px-4 py-2">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline w-full block text-center"
            >
              View all notifications
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={session?.user?.image || ""}
                alt={session?.user?.name || ""}
              />
              <AvatarFallback className="text-xs">
                {getInitials(session?.user?.name || "A")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {session?.user?.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {session?.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/admin/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
