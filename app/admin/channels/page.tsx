"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Facebook,
  Instagram,
  Plus,
  Trash2,
  RefreshCw,
  Settings2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/helpers";

// ─── Types ───────────────────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  platform: string;
  status: string;
  externalAccountId?: string;
  externalPageId?: string;
  externalCatalogId?: string;
  pixelId?: string;
  settings?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  syncedProductCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ChannelDetails extends Channel {
  stats: { syncedProducts: number; importedOrders: number };
  parsedSettings: {
    autoSync?: boolean;
    syncInventory?: boolean;
    syncOrders?: boolean;
    pages?: { id: string; name: string }[];
    businesses?: { id: string; name: string }[];
    catalogs?: { id: string; name: string }[];
  };
  recentLogs: SyncLog[];
}

interface SyncLog {
  id: string;
  type: string;
  status: string;
  totalItems: number;
  successCount: number;
  failureCount: number;
  errors?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

interface DiscoveryData {
  pages: { id: string; name: string; category: string }[];
  businesses: { businessId: string; businessName: string; catalogs: { id: string; name: string; product_count: number }[] }[];
  instagramAccounts: { id: string; name: string; username: string }[];
}

// ─── Component ───────────────────────────────────────────────

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDetails | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Settings form
  const [channelName, setChannelName] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels/meta");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChannels(data);
    } catch {
      toast.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/channels/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "oauth" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start connection");
      }
      const { oauthUrl } = await res.json();
      window.location.href = oauthUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
      setConnecting(false);
    }
  };

  const openSettings = async (channel: Channel) => {
    setSettingsOpen(true);
    setLoadingDetails(true);
    setDiscovery(null);

    try {
      // Fetch channel details + discovery in parallel
      const [detailsRes, discoveryRes] = await Promise.all([
        fetch(`/api/channels/meta/${channel.id}`),
        fetch(`/api/channels/meta/${channel.id}/discover`, { method: "POST" }),
      ]);

      if (detailsRes.ok) {
        const details: ChannelDetails = await detailsRes.json();
        setSelectedChannel(details);
        setChannelName(details.name);
        setSelectedPageId(details.externalPageId || "");
        setSelectedCatalogId(details.externalCatalogId || "");
        setPixelId(details.pixelId || "");
        setAutoSync(details.parsedSettings.autoSync ?? true);
        setSyncInventory(details.parsedSettings.syncInventory ?? true);
        setSyncOrders(details.parsedSettings.syncOrders ?? true);
      }

      if (discoveryRes.ok) {
        setDiscovery(await discoveryRes.json());
      }
    } catch {
      toast.error("Failed to load channel details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!selectedChannel) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/channels/meta/${selectedChannel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName,
          pageId: selectedPageId || undefined,
          catalogId: selectedCatalogId || undefined,
          pixelId: pixelId || undefined,
          settings: { autoSync, syncInventory, syncOrders },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      toast.success("Channel settings saved");
      setSettingsOpen(false);
      fetchChannels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (channel: Channel) => {
    if (!confirm(`Disconnect ${channel.name}? This will remove all sync data.`)) return;
    try {
      const res = await fetch(`/api/channels/meta/${channel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Channel disconnected");
      fetchChannels();
    } catch {
      toast.error("Failed to disconnect channel");
    }
  };

  const handleSync = async () => {
    if (!selectedChannel) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/channels/meta/${selectedChannel.id}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }
      const result = await res.json();
      toast.success(`Sync started: ${result.totalProducts} products queued`);
      // Refresh details
      const detailsRes = await fetch(`/api/channels/meta/${selectedChannel.id}`);
      if (detailsRes.ok) setSelectedChannel(await detailsRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleTogglePause = async (channel: Channel) => {
    const newStatus = channel.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/channels/meta/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Channel ${newStatus === "ACTIVE" ? "activated" : "paused"}`);
      fetchChannels();
    } catch {
      toast.error("Failed to update channel status");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return <CheckCircle2 className="size-4 text-green-500" />;
      case "PAUSED": return <Clock className="size-4 text-yellow-500" />;
      case "ERROR": return <XCircle className="size-4 text-red-500" />;
      default: return <AlertCircle className="size-4 text-muted-foreground" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    return platform === "INSTAGRAM"
      ? <Instagram className="size-5" />
      : <Facebook className="size-5" />;
  };

  // ─── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Channels</h1>
          <p className="text-muted-foreground">
            Connect your store to Facebook, Instagram, and other platforms
          </p>
        </div>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          Connect Facebook
        </Button>
      </div>

      {/* Empty State */}
      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Facebook className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No channels connected</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Connect your Facebook or Instagram account to sync products,
              manage orders, and track conversions from social commerce.
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Facebook className="mr-2 size-4" />
              )}
              Connect Facebook Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Channel Cards */
        <div className="grid gap-4">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(channel.platform)}
                  <div>
                    <CardTitle className="text-base">{channel.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {getStatusIcon(channel.status)}
                      <span className="capitalize">{channel.status.toLowerCase()}</span>
                      {channel.lastSyncAt && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span>Last sync: {formatDate(channel.lastSyncAt)}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(channel.status)}>
                    {channel.syncedProductCount || 0} products synced
                  </Badge>
                  <Switch
                    checked={channel.status === "ACTIVE"}
                    onCheckedChange={() => handleTogglePause(channel)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSettings(channel)}
                  >
                    <Settings2 className="mr-1 size-4" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect(channel)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              {channel.lastSyncStatus === "FAILED" && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="size-4" />
                    Last sync failed. Open settings to retry.
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChannel && getPlatformIcon(selectedChannel.platform)}
              Channel Settings
            </DialogTitle>
            <DialogDescription>
              Configure sync settings and manage your Meta Commerce connection
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedChannel ? (
            <div className="space-y-6 py-2">
              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="channelName">Channel Name</Label>
                <Input
                  id="channelName"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="My Facebook Shop"
                />
              </div>

              {/* Page Selection */}
              {discovery?.pages && discovery.pages.length > 0 && (
                <div className="space-y-2">
                  <Label>Facebook Page</Label>
                  <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a page" />
                    </SelectTrigger>
                    <SelectContent>
                      {discovery.pages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.name} ({page.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Catalog Selection */}
              {discovery?.businesses && discovery.businesses.length > 0 && (
                <div className="space-y-2">
                  <Label>Product Catalog</Label>
                  <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {discovery.businesses.flatMap((biz) =>
                        biz.catalogs.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.product_count} products) — {biz.businessName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pixel ID */}
              <div className="space-y-2">
                <Label htmlFor="pixelId">Meta Pixel ID</Label>
                <Input
                  id="pixelId"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="Enter your Meta Pixel ID for conversion tracking"
                />
                <p className="text-xs text-muted-foreground">
                  Required for Conversions API server-side event tracking
                </p>
              </div>

              {/* Sync Settings */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Sync Settings</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSync">Auto Sync Products</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically push product changes to Meta catalog
                      </p>
                    </div>
                    <Switch id="autoSync" checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="syncInventory">Sync Inventory</Label>
                      <p className="text-xs text-muted-foreground">
                        Keep stock levels in sync with Meta catalog
                      </p>
                    </div>
                    <Switch id="syncInventory" checked={syncInventory} onCheckedChange={setSyncInventory} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="syncOrders">Import Meta Orders</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically import orders from Facebook/Instagram shops
                      </p>
                    </div>
                    <Switch id="syncOrders" checked={syncOrders} onCheckedChange={setSyncOrders} />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{selectedChannel.stats.syncedProducts}</p>
                    <p className="text-xs text-muted-foreground">Products Synced</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{selectedChannel.stats.importedOrders}</p>
                    <p className="text-xs text-muted-foreground">Orders Imported</p>
                  </CardContent>
                </Card>
              </div>

              {/* Manual Sync */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Sync Products Now
              </Button>

              {/* Recent Sync Logs */}
              {selectedChannel.recentLogs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Recent Sync Activity</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedChannel.recentLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="capitalize">{log.type.toLowerCase()}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(log.status)}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.successCount}/{log.totalItems}
                            {log.failureCount > 0 && (
                              <span className="text-destructive ml-1">
                                ({log.failureCount} failed)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
