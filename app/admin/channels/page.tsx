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
  MessageSquare,
  Music,
  Plus,
  Trash2,
  RefreshCw,
  Settings2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingBag,
  Store,
  Camera,
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
  parsedSettings: Record<string, unknown>;
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

interface MetaDiscoveryData {
  pages: { id: string; name: string; category: string }[];
  businesses: { businessId: string; businessName: string; catalogs: { id: string; name: string; product_count: number }[] }[];
  instagramAccounts: { id: string; name: string; username: string }[];
}

interface GoogleDiscoveryData {
  accounts: { id: string; name: string; websiteUrl?: string }[];
  productStatusSummary?: { approved: number; disapproved: number; pending: number };
}

interface WhatsAppDiscoveryData {
  catalogs: { id: string; name: string; product_count?: number }[];
  phoneNumbers: { id: string; display_phone_number: string; verified_name: string; quality_rating?: string }[];
  profile: { about?: string; address?: string; description?: string; vertical?: string; websites?: string[] } | null;
}

interface TikTokDiscoveryData {
  shops: { id: string; name: string; region: string; sellerType?: string }[];
  categories: { id: string; name: string; parentId?: string; isLeaf?: boolean }[];
  warehouses: { id: string; name: string; type?: string }[];
}

interface SnapchatDiscoveryData {
  organizations: { id: string; name: string; country?: string }[];
  catalogs: { id: string; name: string }[];
  adAccounts: { id: string; name: string; status: string; currency: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────

function getApiBase(platform: string): string {
  if (platform === "GOOGLE") return "/api/channels/google";
  if (platform === "WHATSAPP") return "/api/channels/whatsapp";
  if (platform === "TIKTOK") return "/api/channels/tiktok";
  if (platform === "SNAPCHAT") return "/api/channels/snapchat";
  return "/api/channels/meta";
}

function isGoogleChannel(platform: string): boolean {
  return platform === "GOOGLE";
}

function isMetaChannel(platform: string): boolean {
  return platform === "FACEBOOK" || platform === "INSTAGRAM";
}

function isWhatsAppChannel(platform: string): boolean {
  return platform === "WHATSAPP";
}

function isTikTokChannel(platform: string): boolean {
  return platform === "TIKTOK";
}

function isSnapchatChannel(platform: string): boolean {
  return platform === "SNAPCHAT";
}

// ─── Component ───────────────────────────────────────────────

export default function ChannelsPage() {
  const [metaChannels, setMetaChannels] = useState<Channel[]>([]);
  const [googleChannels, setGoogleChannels] = useState<Channel[]>([]);
  const [whatsAppChannels, setWhatsAppChannels] = useState<Channel[]>([]);
  const [tiktokChannels, setTiktokChannels] = useState<Channel[]>([]);
  const [snapchatChannels, setSnapchatChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [connectingTikTok, setConnectingTikTok] = useState(false);
  const [connectingSnapchat, setConnectingSnapchat] = useState(false);
  const [whatsAppConnectOpen, setWhatsAppConnectOpen] = useState(false);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDetails | null>(null);
  const [metaDiscovery, setMetaDiscovery] = useState<MetaDiscoveryData | null>(null);
  const [googleDiscovery, setGoogleDiscovery] = useState<GoogleDiscoveryData | null>(null);
  const [whatsAppDiscovery, setWhatsAppDiscovery] = useState<WhatsAppDiscoveryData | null>(null);
  const [tiktokDiscovery, setTiktokDiscovery] = useState<TikTokDiscoveryData | null>(null);
  const [snapchatDiscovery, setSnapchatDiscovery] = useState<SnapchatDiscoveryData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Meta settings form
  const [channelName, setChannelName] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);

  // Google settings form
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [contentLanguage, setContentLanguage] = useState("en");
  const [targetCountry, setTargetCountry] = useState("SA");

  // WhatsApp connect form
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");

  // WhatsApp settings form
  const [selectedWaCatalogId, setSelectedWaCatalogId] = useState("");

  // TikTok settings form
  const [selectedTikTokShopId, setSelectedTikTokShopId] = useState("");
  const [selectedTikTokCategoryId, setSelectedTikTokCategoryId] = useState("");
  const [selectedTikTokWarehouseId, setSelectedTikTokWarehouseId] = useState("");

  // Snapchat settings form
  const [selectedSnapchatOrgId, setSelectedSnapchatOrgId] = useState("");
  const [selectedSnapchatCatalogId, setSelectedSnapchatCatalogId] = useState("");

  const fetchChannels = useCallback(async () => {
    try {
      const [metaRes, googleRes, waRes, tiktokRes, snapchatRes] = await Promise.all([
        fetch("/api/channels/meta"),
        fetch("/api/channels/google"),
        fetch("/api/channels/whatsapp"),
        fetch("/api/channels/tiktok"),
        fetch("/api/channels/snapchat"),
      ]);
      if (metaRes.ok) setMetaChannels(await metaRes.json());
      if (googleRes.ok) setGoogleChannels(await googleRes.json());
      if (waRes.ok) setWhatsAppChannels(await waRes.json());
      if (tiktokRes.ok) setTiktokChannels(await tiktokRes.json());
      if (snapchatRes.ok) setSnapchatChannels(await snapchatRes.json());
    } catch {
      toast.error("Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleConnectMeta = async () => {
    setConnectingMeta(true);
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
      setConnectingMeta(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const res = await fetch("/api/channels/google", {
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
      setConnectingGoogle(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!waAccessToken || !waBusinessAccountId || !waPhoneNumberId) {
      toast.error("All WhatsApp fields are required");
      return;
    }
    setConnectingWhatsApp(true);
    try {
      const res = await fetch("/api/channels/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: waAccessToken,
          wabaId: waBusinessAccountId,
          phoneNumberId: waPhoneNumberId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to connect WhatsApp");
      }
      toast.success("WhatsApp Business connected successfully");
      setWhatsAppConnectOpen(false);
      setWaAccessToken("");
      setWaBusinessAccountId("");
      setWaPhoneNumberId("");
      fetchChannels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleConnectTikTok = async () => {
    setConnectingTikTok(true);
    try {
      const res = await fetch("/api/channels/tiktok", {
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
      setConnectingTikTok(false);
    }
  };

  const handleConnectSnapchat = async () => {
    setConnectingSnapchat(true);
    try {
      const res = await fetch("/api/channels/snapchat", {
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
      setConnectingSnapchat(false);
    }
  };

  const openSettings = async (channel: Channel) => {
    setSettingsOpen(true);
    setLoadingDetails(true);
    setMetaDiscovery(null);
    setGoogleDiscovery(null);
    setWhatsAppDiscovery(null);
    setTiktokDiscovery(null);
    setSnapchatDiscovery(null);

    const base = getApiBase(channel.platform);

    try {
      const [detailsRes, discoveryRes] = await Promise.all([
        fetch(`${base}/${channel.id}`),
        fetch(`${base}/${channel.id}/discover`, { method: "POST" }),
      ]);

      if (detailsRes.ok) {
        const details: ChannelDetails = await detailsRes.json();
        setSelectedChannel(details);
        setChannelName(details.name);
        setAutoSync((details.parsedSettings.autoSync as boolean) ?? true);
        setSyncInventory((details.parsedSettings.syncInventory as boolean) ?? true);

        if (isMetaChannel(channel.platform)) {
          setSelectedPageId(details.externalPageId || "");
          setSelectedCatalogId(details.externalCatalogId || "");
          setPixelId(details.pixelId || "");
          setSyncOrders((details.parsedSettings.syncOrders as boolean) ?? true);
        }

        if (isGoogleChannel(channel.platform)) {
          setSelectedMerchantId(details.externalAccountId || "");
          setContentLanguage((details.parsedSettings.contentLanguage as string) || "en");
          setTargetCountry((details.parsedSettings.targetCountry as string) || "SA");
        }

        if (isWhatsAppChannel(channel.platform)) {
          setSelectedWaCatalogId(details.externalCatalogId || "");
        }

        if (isTikTokChannel(channel.platform)) {
          setSelectedTikTokShopId(details.externalAccountId || "");
          setSelectedTikTokCategoryId((details.parsedSettings.defaultCategoryId as string) || "");
          setSelectedTikTokWarehouseId((details.parsedSettings.warehouseId as string) || "");
          setSyncOrders((details.parsedSettings.syncOrders as boolean) ?? true);
        }

        if (isSnapchatChannel(channel.platform)) {
          setSelectedSnapchatOrgId(details.externalAccountId || "");
          setSelectedSnapchatCatalogId(details.externalCatalogId || "");
        }
      }

      if (discoveryRes.ok) {
        const discoveryData = await discoveryRes.json();
        if (isMetaChannel(channel.platform)) {
          setMetaDiscovery(discoveryData);
        } else if (isGoogleChannel(channel.platform)) {
          setGoogleDiscovery(discoveryData);
        } else if (isWhatsAppChannel(channel.platform)) {
          setWhatsAppDiscovery(discoveryData);
        } else if (isTikTokChannel(channel.platform)) {
          setTiktokDiscovery(discoveryData);
        } else if (isSnapchatChannel(channel.platform)) {
          setSnapchatDiscovery(discoveryData);
        }
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

    const base = getApiBase(selectedChannel.platform);
    const isGoogle = isGoogleChannel(selectedChannel.platform);
    const isWhatsApp = isWhatsAppChannel(selectedChannel.platform);
    const isTikTok = isTikTokChannel(selectedChannel.platform);
    const isSnapchat = isSnapchatChannel(selectedChannel.platform);

    try {
      const body = isGoogle
        ? {
            name: channelName,
            merchantId: selectedMerchantId || undefined,
            settings: { autoSync, syncInventory, contentLanguage, targetCountry },
          }
        : isWhatsApp
        ? {
            name: channelName,
            catalogId: selectedWaCatalogId || undefined,
            settings: { autoSync, syncInventory },
          }
        : isTikTok
        ? {
            name: channelName,
            shopId: selectedTikTokShopId || undefined,
            settings: {
              autoSync,
              syncInventory,
              syncOrders,
              defaultCategoryId: selectedTikTokCategoryId || undefined,
              warehouseId: selectedTikTokWarehouseId || undefined,
            },
          }
        : isSnapchat
        ? {
            name: channelName,
            organizationId: selectedSnapchatOrgId || undefined,
            catalogId: selectedSnapchatCatalogId || undefined,
            settings: { autoSync, syncInventory },
          }
        : {
            name: channelName,
            pageId: selectedPageId || undefined,
            catalogId: selectedCatalogId || undefined,
            pixelId: pixelId || undefined,
            settings: { autoSync, syncInventory, syncOrders },
          };

      const res = await fetch(`${base}/${selectedChannel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    const base = getApiBase(channel.platform);
    try {
      const res = await fetch(`${base}/${channel.id}`, { method: "DELETE" });
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
    const base = getApiBase(selectedChannel.platform);
    try {
      const res = await fetch(`${base}/${selectedChannel.id}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }
      const result = await res.json();
      toast.success(`Sync complete: ${result.synced}/${result.totalProducts} products synced`);
      // Refresh details
      const detailsRes = await fetch(`${base}/${selectedChannel.id}`);
      if (detailsRes.ok) setSelectedChannel(await detailsRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleTogglePause = async (channel: Channel) => {
    const newStatus = channel.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const base = getApiBase(channel.platform);
    try {
      const res = await fetch(`${base}/${channel.id}`, {
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
    switch (platform) {
      case "INSTAGRAM": return <Instagram className="size-5" />;
      case "GOOGLE": return <Store className="size-5" />;
      case "WHATSAPP": return <MessageSquare className="size-5" />;
      case "TIKTOK": return <Music className="size-5" />;
      case "SNAPCHAT": return <Camera className="size-5" />;
      default: return <Facebook className="size-5" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "INSTAGRAM": return "Instagram";
      case "GOOGLE": return "Google Merchant";
      case "WHATSAPP": return "WhatsApp Business";
      case "TIKTOK": return "TikTok Shop";
      case "SNAPCHAT": return "Snapchat";
      case "FACEBOOK": return "Facebook";
      default: return platform;
    }
  };

  const allChannels = [...metaChannels, ...googleChannels, ...whatsAppChannels, ...tiktokChannels, ...snapchatChannels];

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
            Connect your store to Facebook, Instagram, Google Shopping, WhatsApp, TikTok Shop, Snapchat, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleConnectMeta} disabled={connectingMeta} variant="outline">
            {connectingMeta ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Facebook className="mr-2 size-4" />
            )}
            Connect Meta
          </Button>
          <Button onClick={handleConnectGoogle} disabled={connectingGoogle}>
            {connectingGoogle ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Store className="mr-2 size-4" />
            )}
            Connect Google
          </Button>
          <Button onClick={() => setWhatsAppConnectOpen(true)} variant="outline">
            <MessageSquare className="mr-2 size-4" />
            Connect WhatsApp
          </Button>
          <Button onClick={handleConnectTikTok} disabled={connectingTikTok} variant="outline">
            {connectingTikTok ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Music className="mr-2 size-4" />
            )}
            Connect TikTok
          </Button>
          <Button onClick={handleConnectSnapchat} disabled={connectingSnapchat} variant="outline">
            {connectingSnapchat ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Camera className="mr-2 size-4" />
            )}
            Connect Snapchat
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {allChannels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No channels connected</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Connect your store to Facebook, Instagram, Google Merchant Center, WhatsApp Business,
              TikTok Shop, or Snapchat to sync products and reach more customers.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button onClick={handleConnectMeta} disabled={connectingMeta} variant="outline">
                {connectingMeta ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Facebook className="mr-2 size-4" />
                )}
                Connect Meta
              </Button>
              <Button onClick={handleConnectGoogle} disabled={connectingGoogle}>
                {connectingGoogle ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Store className="mr-2 size-4" />
                )}
                Connect Google Merchant
              </Button>
              <Button onClick={() => setWhatsAppConnectOpen(true)} variant="outline">
                <MessageSquare className="mr-2 size-4" />
                Connect WhatsApp
              </Button>
              <Button onClick={handleConnectTikTok} disabled={connectingTikTok} variant="outline">
                {connectingTikTok ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Music className="mr-2 size-4" />
                )}
                Connect TikTok Shop
              </Button>
              <Button onClick={handleConnectSnapchat} disabled={connectingSnapchat} variant="outline">
                {connectingSnapchat ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 size-4" />
                )}
                Connect Snapchat
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Channel Cards */
        <div className="grid gap-4">
          {allChannels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(channel.platform)}
                  <div>
                    <CardTitle className="text-base">{channel.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {getStatusIcon(channel.status)}
                      <Badge variant="outline" className="text-xs">
                        {getPlatformLabel(channel.platform)}
                      </Badge>
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
              {selectedChannel ? `${getPlatformLabel(selectedChannel.platform)} Settings` : "Channel Settings"}
            </DialogTitle>
            <DialogDescription>
              {selectedChannel && isGoogleChannel(selectedChannel.platform)
                ? "Configure sync settings for your Google Merchant Center connection"
                : selectedChannel && isWhatsAppChannel(selectedChannel.platform)
                ? "Configure catalog sync and messaging for your WhatsApp Business connection"
                : selectedChannel && isTikTokChannel(selectedChannel.platform)
                ? "Configure shop, categories, and sync settings for your TikTok Shop connection"
                : selectedChannel && isSnapchatChannel(selectedChannel.platform)
                ? "Configure organization, catalog, and sync settings for your Snapchat connection"
                : "Configure sync settings and manage your Meta Commerce connection"}
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
                  placeholder={isGoogleChannel(selectedChannel.platform) ? "My Google Shop" : isWhatsAppChannel(selectedChannel.platform) ? "My WhatsApp Catalog" : isTikTokChannel(selectedChannel.platform) ? "My TikTok Shop" : isSnapchatChannel(selectedChannel.platform) ? "My Snapchat Catalog" : "My Facebook Shop"}
                />
              </div>

              {/* ─── Meta-specific Settings ─── */}
              {isMetaChannel(selectedChannel.platform) && (
                <>
                  {/* Page Selection */}
                  {metaDiscovery?.pages && metaDiscovery.pages.length > 0 && (
                    <div className="space-y-2">
                      <Label>Facebook Page</Label>
                      <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a page" />
                        </SelectTrigger>
                        <SelectContent>
                          {metaDiscovery.pages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.name} ({page.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Catalog Selection */}
                  {metaDiscovery?.businesses && metaDiscovery.businesses.length > 0 && (
                    <div className="space-y-2">
                      <Label>Product Catalog</Label>
                      <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {metaDiscovery.businesses.flatMap((biz) =>
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
                </>
              )}

              {/* ─── Google-specific Settings ─── */}
              {isGoogleChannel(selectedChannel.platform) && (
                <>
                  {/* Merchant Account Selection */}
                  {googleDiscovery?.accounts && googleDiscovery.accounts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Merchant Account</Label>
                      <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a merchant account" />
                        </SelectTrigger>
                        <SelectContent>
                          {googleDiscovery.accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.id})
                              {acc.websiteUrl ? ` — ${acc.websiteUrl}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Content Language */}
                  <div className="space-y-2">
                    <Label>Content Language</Label>
                    <Select value={contentLanguage} onValueChange={setContentLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Language for your product listings in Google Shopping
                    </p>
                  </div>

                  {/* Target Country */}
                  <div className="space-y-2">
                    <Label>Target Country</Label>
                    <Select value={targetCountry} onValueChange={setTargetCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SA">Saudi Arabia</SelectItem>
                        <SelectItem value="AE">United Arab Emirates</SelectItem>
                        <SelectItem value="KW">Kuwait</SelectItem>
                        <SelectItem value="BH">Bahrain</SelectItem>
                        <SelectItem value="QA">Qatar</SelectItem>
                        <SelectItem value="OM">Oman</SelectItem>
                        <SelectItem value="EG">Egypt</SelectItem>
                        <SelectItem value="JO">Jordan</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Country where your products will be shown in Google Shopping
                    </p>
                  </div>

                  {/* Product Status Summary */}
                  {googleDiscovery?.productStatusSummary && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Product Status (Google)</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border p-3 text-center">
                          <p className="text-lg font-bold text-green-600">
                            {googleDiscovery.productStatusSummary.approved}
                          </p>
                          <p className="text-xs text-muted-foreground">Approved</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <p className="text-lg font-bold text-yellow-600">
                            {googleDiscovery.productStatusSummary.pending}
                          </p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="rounded-lg border p-3 text-center">
                          <p className="text-lg font-bold text-red-600">
                            {googleDiscovery.productStatusSummary.disapproved}
                          </p>
                          <p className="text-xs text-muted-foreground">Disapproved</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── WhatsApp-specific Settings ─── */}
              {isWhatsAppChannel(selectedChannel.platform) && (
                <>
                  {/* Catalog Selection */}
                  {whatsAppDiscovery?.catalogs && whatsAppDiscovery.catalogs.length > 0 && (
                    <div className="space-y-2">
                      <Label>Product Catalog</Label>
                      <Select value={selectedWaCatalogId} onValueChange={setSelectedWaCatalogId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {whatsAppDiscovery.catalogs.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name} {cat.product_count != null ? `(${cat.product_count} products)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the Meta Commerce catalog to sync products with WhatsApp
                      </p>
                    </div>
                  )}

                  {/* Phone Number Info */}
                  {whatsAppDiscovery?.phoneNumbers && whatsAppDiscovery.phoneNumbers.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Connected Phone Numbers</Label>
                      <div className="space-y-2">
                        {whatsAppDiscovery.phoneNumbers.map((phone) => (
                          <div key={phone.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium">{phone.display_phone_number}</p>
                              <p className="text-sm text-muted-foreground">{phone.verified_name}</p>
                            </div>
                            {phone.quality_rating && (
                              <Badge variant="outline">{phone.quality_rating}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Profile Info */}
                  {whatsAppDiscovery?.profile && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Business Profile</Label>
                      <div className="rounded-lg border p-3 space-y-1 text-sm">
                        {whatsAppDiscovery.profile.about && (
                          <p><span className="font-medium">About:</span> {whatsAppDiscovery.profile.about}</p>
                        )}
                        {whatsAppDiscovery.profile.description && (
                          <p><span className="font-medium">Description:</span> {whatsAppDiscovery.profile.description}</p>
                        )}
                        {whatsAppDiscovery.profile.address && (
                          <p><span className="font-medium">Address:</span> {whatsAppDiscovery.profile.address}</p>
                        )}
                        {whatsAppDiscovery.profile.vertical && (
                          <p><span className="font-medium">Category:</span> {whatsAppDiscovery.profile.vertical}</p>
                        )}
                        {whatsAppDiscovery.profile.websites && whatsAppDiscovery.profile.websites.length > 0 && (
                          <p><span className="font-medium">Websites:</span> {whatsAppDiscovery.profile.websites.join(", ")}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── TikTok-specific Settings ─── */}
              {selectedChannel && isTikTokChannel(selectedChannel.platform) && (
                <>
                  {/* Shop Selection */}
                  {tiktokDiscovery?.shops && tiktokDiscovery.shops.length > 0 && (
                    <div className="space-y-2">
                      <Label>TikTok Shop</Label>
                      <Select value={selectedTikTokShopId} onValueChange={setSelectedTikTokShopId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a shop" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiktokDiscovery.shops.map((shop) => (
                            <SelectItem key={shop.id} value={shop.id}>
                              {shop.name} ({shop.region})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the TikTok Shop to sync products with
                      </p>
                    </div>
                  )}

                  {/* Default Category Selection */}
                  {tiktokDiscovery?.categories && tiktokDiscovery.categories.length > 0 && (
                    <div className="space-y-2">
                      <Label>Default Product Category</Label>
                      <Select value={selectedTikTokCategoryId} onValueChange={setSelectedTikTokCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a default category" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiktokDiscovery.categories
                            .filter((cat) => cat.isLeaf !== false)
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        TikTok Shop requires a category for every product. This default will be used when no specific category is mapped.
                      </p>
                    </div>
                  )}

                  {/* Warehouse Selection */}
                  {tiktokDiscovery?.warehouses && tiktokDiscovery.warehouses.length > 0 && (
                    <div className="space-y-2">
                      <Label>Warehouse</Label>
                      <Select value={selectedTikTokWarehouseId} onValueChange={setSelectedTikTokWarehouseId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiktokDiscovery.warehouses.map((wh) => (
                            <SelectItem key={wh.id} value={wh.id}>
                              {wh.name} {wh.type ? `(${wh.type})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Warehouse for inventory and fulfillment tracking
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ─── Snapchat-specific Settings ─── */}
              {selectedChannel && isSnapchatChannel(selectedChannel.platform) && (
                <>
                  {/* Organization Selection */}
                  {snapchatDiscovery?.organizations && snapchatDiscovery.organizations.length > 0 && (
                    <div className="space-y-2">
                      <Label>Organization</Label>
                      <Select value={selectedSnapchatOrgId} onValueChange={setSelectedSnapchatOrgId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapchatDiscovery.organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name} {org.country ? `(${org.country})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the Snapchat organization to sync products with
                      </p>
                    </div>
                  )}

                  {/* Catalog Selection */}
                  {snapchatDiscovery?.catalogs && snapchatDiscovery.catalogs.length > 0 && (
                    <div className="space-y-2">
                      <Label>Product Catalog</Label>
                      <Select value={selectedSnapchatCatalogId} onValueChange={setSelectedSnapchatCatalogId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a catalog" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapchatDiscovery.catalogs.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the catalog for product sync
                      </p>
                    </div>
                  )}

                  {/* Ad Accounts Info */}
                  {snapchatDiscovery?.adAccounts && snapchatDiscovery.adAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Ad Accounts</Label>
                      <div className="space-y-2">
                        {snapchatDiscovery.adAccounts.map((acc) => (
                          <div key={acc.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium">{acc.name}</p>
                              <p className="text-sm text-muted-foreground">{acc.currency}</p>
                            </div>
                            <Badge variant="outline">{acc.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Sync Settings (common) */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Sync Settings</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoSync">Auto Sync Products</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically push product changes to {isGoogleChannel(selectedChannel.platform) ? "Google Merchant Center" : isWhatsAppChannel(selectedChannel.platform) ? "WhatsApp catalog" : isTikTokChannel(selectedChannel.platform) ? "TikTok Shop" : isSnapchatChannel(selectedChannel.platform) ? "Snapchat catalog" : "Meta catalog"}
                      </p>
                    </div>
                    <Switch id="autoSync" checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="syncInventory">Sync Inventory</Label>
                      <p className="text-xs text-muted-foreground">
                        Keep stock levels in sync
                      </p>
                    </div>
                    <Switch id="syncInventory" checked={syncInventory} onCheckedChange={setSyncInventory} />
                  </div>
                  {(isMetaChannel(selectedChannel.platform) || isTikTokChannel(selectedChannel.platform)) && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="syncOrders">Import Orders</Label>
                        <p className="text-xs text-muted-foreground">
                          {isTikTokChannel(selectedChannel.platform)
                            ? "Automatically import orders from TikTok Shop"
                            : "Automatically import orders from Facebook/Instagram shops"}
                        </p>
                      </div>
                      <Switch id="syncOrders" checked={syncOrders} onCheckedChange={setSyncOrders} />
                    </div>
                  )}
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
                          <TableCell className="capitalize">{log.type.replace(/_/g, " ").toLowerCase()}</TableCell>
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

      {/* WhatsApp Connect Dialog */}
      <Dialog open={whatsAppConnectOpen} onOpenChange={setWhatsAppConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Connect WhatsApp Business
            </DialogTitle>
            <DialogDescription>
              Enter your WhatsApp Business API credentials. You can find these in your
              Meta Business Suite under WhatsApp &gt; API Setup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="waAccessToken">Access Token</Label>
              <Input
                id="waAccessToken"
                type="password"
                value={waAccessToken}
                onChange={(e) => setWaAccessToken(e.target.value)}
                placeholder="Permanent System User access token"
              />
              <p className="text-xs text-muted-foreground">
                Generate a permanent token from Meta Business Suite &gt; System Users
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waBusinessAccountId">Business Account ID</Label>
              <Input
                id="waBusinessAccountId"
                value={waBusinessAccountId}
                onChange={(e) => setWaBusinessAccountId(e.target.value)}
                placeholder="e.g. 123456789012345"
              />
              <p className="text-xs text-muted-foreground">
                Your WhatsApp Business Account (WABA) ID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waPhoneNumberId">Phone Number ID</Label>
              <Input
                id="waPhoneNumberId"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                placeholder="e.g. 123456789012345"
              />
              <p className="text-xs text-muted-foreground">
                The Phone Number ID to use for messaging and catalog
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsAppConnectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnectWhatsApp} disabled={connectingWhatsApp}>
              {connectingWhatsApp && <Loader2 className="mr-2 size-4 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
