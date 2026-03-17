"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, X,
  ShoppingBag, Barcode, User, Pause, Play, Gift, Wallet, Printer,
  Hash, Keyboard, ChevronDown, Package, Wifi, WifiOff, Volume2, VolumeX,
  ArrowRightLeft, DollarSign, LogIn, LogOut, ClipboardList,
  AlertCircle, CheckCircle2, ScanLine, Settings2,
  Maximize, Minimize, CloudOff, CloudUpload, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useReceiptPrinter } from "@/hooks/use-receipt-printer";
import { playSound, initAudio } from "@/lib/pos/sounds";
import { generateZatcaQR } from "@/lib/pos/zatca";
import { savePendingOrder, syncPendingOrders, getPendingCount } from "@/lib/pos/offline-sync";
import type { ReceiptData } from "@/lib/pos/receipt-printer";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PosVariant {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  barcode: string | null;
  quantity: number;
}

interface PosProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  quantity: number;
  image: string | null;
  category: string | null;
  variants: PosVariant[];
}

interface CartItem {
  id: string;
  product: PosProduct;
  variant: PosVariant | null;
  quantity: number;
  discount: number;
  linePrice: number;
}

interface HeldSale {
  id: string;
  name: string;
  cart: CartItem[];
  customerEmail: string;
  discount: number;
  createdAt: Date;
}

interface CustomerResult {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  storeCredit: number;
}

interface PosSession {
  id: string;
  staffId: string;
  staffName: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number | null;
  totalSales: number;
  totalOrders: number;
  notes: string | null;
  status: string;
}

interface StoreConfig {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  currency: string;
  vatNumber: string;
  zatcaEnabled: boolean;
  taxRate: number;
  taxIncluded: boolean;
}

type PaymentMethodType = "cash" | "card" | "split";

// ── Refund Types ──
interface RefundOrderItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  price: number | string;
  totalPrice: number | string;
  variant?: { id: string; name: string } | null;
  product?: { id: string; name: string; slug: string; images?: { url: string }[] } | null;
}

interface RefundOrder {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  totalAmount: number | string;
  currency: string;
  source: string;
  createdAt: string;
  items: RefundOrderItem[];
}

interface RefundSelection {
  orderItemId: string;
  quantity: number;
  maxQuantity: number;
  amount: number;
  unitPrice: number;
  name: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function PosPage() {
  const t = useTranslations("admin.pos");
  // ── Core State ──
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // ── Payment ──
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");

  // ── Customer ──
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);

  // ── Discounts & Gift Cards ──
  const [discount, setDiscount] = useState(0);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [useStoreCredit, setUseStoreCredit] = useState(false);

  // ── Dialogs ──
  const [variantDialog, setVariantDialog] = useState<PosProduct | null>(null);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [manualBarcodeOpen, setManualBarcodeOpen] = useState(false);
  const [manualBarcodeValue, setManualBarcodeValue] = useState("");

  // ── Refund ──
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundOrderSearch, setRefundOrderSearch] = useState("");
  const [refundSearchResults, setRefundSearchResults] = useState<RefundOrder[]>([]);
  const [refundSearchLoading, setRefundSearchLoading] = useState(false);
  const [refundOrder, setRefundOrder] = useState<RefundOrder | null>(null);
  const [refundSelections, setRefundSelections] = useState<RefundSelection[]>([]);
  const [refundReason, setRefundReason] = useState("");
  const [refundRestock, setRefundRestock] = useState(true);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // ── Receipt ──
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  // ── Register Session ──
  const [posSession, setPosSession] = useState<PosSession | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Settings ──
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({
    storeName: "Store",
    storeAddress: "",
    storePhone: "",
    currency: "SAR",
    vatNumber: "",
    zatcaEnabled: true,
    taxRate: 0.15,
    taxIncluded: false,
  });

  // ── Scanner ──
  const [scannerReady, setScannerReady] = useState(true);
  const [lastScan, setLastScan] = useState<{ code: string; time: number } | null>(null);

  // ── Fullscreen & Offline ──
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const audioInitialized = useRef(false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Printer Hook
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const printer = useReceiptPrinter({ paperWidth: 48, baudRate: 9600 });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fullscreen
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const { setOpen: setSidebarOpen } = useSidebar();

  // Lock page scroll & remove parent padding so POS fills viewport exactly
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Pin the sidebar wrapper to the viewport so nothing can grow past it
    const wrapper = document.querySelector<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (wrapper) {
      wrapper.style.height = "100dvh";
      wrapper.style.maxHeight = "100dvh";
      wrapper.style.overflow = "hidden";
    }

    // Prevent the SidebarInset from overflowing
    const sidebarInset = document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]');
    if (sidebarInset) {
      sidebarInset.style.overflow = "hidden";
    }

    // Remove padding & scroll from the inner <main> content area
    const innerMain = sidebarInset?.querySelector<HTMLElement>(":scope > main");
    if (innerMain) {
      innerMain.dataset.posActive = "1";
      innerMain.style.padding = "0";
      innerMain.style.overflow = "hidden";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (wrapper) {
        wrapper.style.height = "";
        wrapper.style.maxHeight = "";
        wrapper.style.overflow = "";
      }
      if (sidebarInset) {
        sidebarInset.style.overflow = "";
      }
      if (innerMain) {
        delete innerMain.dataset.posActive;
        innerMain.style.padding = "";
        innerMain.style.overflow = "";
      }
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setSidebarOpen(false);
      } else {
        await document.exitFullscreen();
        setSidebarOpen(true);
      }
    } catch {
      // Fullscreen not supported or blocked
    }
  }, [setSidebarOpen]);

  useEffect(() => {
    const handleChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      setSidebarOpen(!fs);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [setSidebarOpen]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Offline Detection & Sync
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Refresh pending count on mount and when online status changes
  useEffect(() => {
    getPendingCount().then(setPendingOrderCount).catch(() => {});
  }, [isOnline]);

  // ── Background sync: flush pending queue to server ──
  const syncQueueRef = useRef(false);
  const flushPendingQueue = useCallback(async () => {
    if (syncQueueRef.current || !navigator.onLine) return;
    syncQueueRef.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingOrders();
      const remaining = await getPendingCount().catch(() => 0);
      setPendingOrderCount(remaining);
      if (result.failed > 0) {
        toast.error(t("toasts.syncFailed", { count: result.failed }));
      }
    } catch {
      // Sync will retry on next sale or when online status changes
    } finally {
      syncQueueRef.current = false;
      setSyncing(false);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOnline) return;
    flushPendingQueue();
  }, [isOnline, flushPendingQueue]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Barcode Scanner Hook
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleBarcodeScan = useCallback((code: string) => {
    const product = products.find(
      (p) =>
        p.barcode === code || p.sku === code ||
        p.variants.some((v) => v.sku === code || v.barcode === code)
    );

    if (!product) {
      if (soundEnabled) playSound("error");
      toast.error(t("toasts.productNotFound", { code }), {
        description: t("toasts.productNotFoundDesc"),
      });
      return;
    }

    const variant = product.variants.find((v) => v.sku === code || v.barcode === code);
    if (variant) {
      addToCartDirect(product, variant);
    } else if (product.variants.length > 0) {
      setVariantDialog(product);
    } else {
      addToCartDirect(product, null);
    }

    if (soundEnabled) playSound("scan");
    setLastScan({ code, time: Date.now() });
    toast.success(t("toasts.scanned", { name: product.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, soundEnabled]);

  const { manualScan } = useBarcodeScanner(handleBarcodeScan, {
    minLength: 4,
    maxKeystrokeInterval: 50,
    interceptInputFocus: true,
    enableSound: soundEnabled,
    preventDefault: true,
    suffix: "Enter",
    prefix: null,
  }, scannerReady);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Init Audio on first interaction
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    function handleInteraction() {
      if (!audioInitialized.current) {
        initAudio();
        audioInitialized.current = true;
      }
    }
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fetch Products + Store Config + Active Session
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    fetchProducts();
    fetchStoreConfig();
    fetchActiveSession();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?status=ACTIVE&limit=500");
      const data = await res.json();
      const mapped = (data.products || data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        sku: p.sku as string | null,
        barcode: p.barcode as string | null,
        price: Number(p.price),
        quantity: Number(p.quantity),
        image: ((p.images as Array<Record<string, unknown>>)?.[0]?.url as string) || null,
        category: ((p.categories as Array<Record<string, unknown>>)?.[0] as Record<string, unknown>)?.category
          ? (((p.categories as Array<Record<string, unknown>>)?.[0] as Record<string, unknown>)?.category as Record<string, string>)?.name || null
          : null,
        variants: ((p.variants as Array<Record<string, unknown>>) || []).map((v) => ({
          id: v.id as string,
          name: v.name as string,
          price: Number(v.price),
          sku: v.sku as string | null,
          barcode: v.barcode as string | null,
          quantity: Number(v.quantity),
        })),
      }));
      setProducts(mapped);
    } catch {
      toast.error(t("toasts.failedLoadProducts"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchStoreConfig() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || data;
        setStoreConfig({
          storeName: s.storeName || "Store",
          storeAddress: s.storeAddress || "",
          storePhone: s.storePhone || "",
          currency: s.currency || "SAR",
          vatNumber: s.vatNumber || "",
          zatcaEnabled: s.zatcaEnabled ?? true,
          taxRate: Number(s.taxRate) || 0.15,
          taxIncluded: s.taxIncluded || false,
        });
      }
    } catch { /* use defaults */ }
  }

  async function fetchActiveSession() {
    try {
      const res = await fetch("/api/pos/sessions?active=true");
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setPosSession(data.session);
        }
      }
    } catch { /* ignore */ }
    finally {
      setSessionLoading(false);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Register Session Management
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function openRegister() {
    const balance = parseFloat(openingBalance) || 0;
    try {
      const res = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: balance }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setPosSession(data.session);
      setRegisterOpen(false);
      setOpeningBalance("");
      if (soundEnabled) playSound("drawer");
      printer.openCashDrawer();
      toast.success(t("toasts.registerOpened"), {
        description: t("toasts.registerOpenedDesc", { curr: storeConfig.currency, balance: balance.toFixed(2) }),
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("toasts.failedOpenRegister"));
    }
  }

  async function closeRegister() {
    if (!posSession) return;
    const balance = parseFloat(closingBalance) || 0;
    try {
      const res = await fetch("/api/pos/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: posSession.id,
          closingBalance: balance,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setPosSession(null);
      setRegisterOpen(false);
      setClosingBalance("");
      toast.success(t("toasts.registerClosed"), {
        description: t("toasts.registerClosedDesc", { curr: storeConfig.currency, balance: balance.toFixed(2) }),
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t("toasts.failedCloseRegister"));
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Keyboard Shortcuts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    function handleShortcut(e: KeyboardEvent) {
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F2" && cart.length > 0) { e.preventDefault(); setPaymentMethod("cash"); setPaymentOpen(true); }
      if (e.key === "F3" && cart.length > 0) { e.preventDefault(); setPaymentMethod("card"); setPaymentOpen(true); }
      if (e.key === "F4" && cart.length > 0) { e.preventDefault(); holdSale(); }
      if (e.key === "F5") { e.preventDefault(); setHoldDialogOpen(true); }
      if (e.key === "F6") { e.preventDefault(); setManualBarcodeOpen(true); }
      if (e.key === "F7" && cart.length > 0) { e.preventDefault(); setPaymentMethod("split"); setPaymentOpen(true); }
      if (e.key === "F8") { e.preventDefault(); setCustomItemOpen(true); }
      if (e.key === "F9") {
        e.preventDefault();
        printer.openCashDrawer();
        if (soundEnabled) playSound("drawer");
        toast.success(t("toasts.cashDrawerOpened"));
      }
      if (e.key === "F10" && receiptData) { e.preventDefault(); setReceiptData(null); }
      if (e.key === "F11") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "F12" && receiptData) { e.preventDefault(); printer.printReceipt(receiptData); }
      if (e.key === "Escape" && search) { setSearch(""); }
      if (e.key === "r" && e.ctrlKey && !e.shiftKey) { e.preventDefault(); openRefundDialog(); }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, search, soundEnabled, receiptData]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Customer Search
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function searchCustomers(query: string) {
    setCustomerSearch(query);
    if (query.length < 2) { setCustomerResults([]); return; }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setCustomerResults((data.customers || []).map((c: Record<string, unknown>) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || null,
          storeCredit: Number(c.storeCredit || c.storeCreditBalance || 0),
        })));
      }
    } catch { /* ignore */ }
  }

  function selectCustomer(customer: CustomerResult) {
    setSelectedCustomer(customer);
    setCustomerEmail(customer.email);
    setCustomerSearch("");
    setCustomerResults([]);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Gift Card
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function checkGiftCard() {
    if (!giftCardCode) return;
    try {
      const res = await fetch(`/api/gift-cards?code=${encodeURIComponent(giftCardCode)}`);
      if (res.ok) {
        const data = await res.json();
        const card = data.giftCards?.[0] || data;
        if (card && Number(card.balance) > 0) {
          setGiftCardBalance(Number(card.balance));
          toast.success(t("toasts.giftCardBalance", { curr: storeConfig.currency, balance: Number(card.balance).toFixed(2) }));
        } else {
          toast.error(t("toasts.giftCardNoBalance"));
          setGiftCardBalance(null);
        }
      } else {
        toast.error(t("toasts.giftCardNotFound"));
        setGiftCardBalance(null);
      }
    } catch {
      toast.error(t("toasts.giftCardFailed"));
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Filtered Products & Categories
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => { if (p.category) cats.add(p.category); });
    return ["ALL", ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (categoryFilter !== "ALL") {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, search, categoryFilter]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cart Operations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function addToCart(product: PosProduct) {
    if (product.variants.length > 0) {
      setVariantDialog(product);
      return;
    }
    addToCartDirect(product, null);
  }

  function addToCartDirect(product: PosProduct, variant: PosVariant | null) {
    const cartId = variant ? `${product.id}-${variant.id}` : product.id;
    const price = variant ? variant.price : product.price;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartId);
      if (existing) {
        return prev.map((i) =>
          i.id === cartId
            ? { ...i, quantity: i.quantity + 1, linePrice: price * (i.quantity + 1) }
            : i
        );
      }
      return [...prev, { id: cartId, product, variant, quantity: 1, discount: 0, linePrice: price }];
    });
    setVariantDialog(null);
    if (soundEnabled) playSound("keypress");
  }

  function addCustomItem() {
    if (!customItemName || !customItemPrice) return;
    const price = parseFloat(customItemPrice);
    if (isNaN(price) || price <= 0) return;
    const customProduct: PosProduct = {
      id: `custom-${Date.now()}`,
      name: customItemName,
      sku: null, barcode: null, price, quantity: 9999, image: null, category: "Custom", variants: [],
    };
    setCart((prev) => [...prev, { id: customProduct.id, product: customProduct, variant: null, quantity: 1, discount: 0, linePrice: price }]);
    setCustomItemOpen(false);
    setCustomItemName("");
    setCustomItemPrice("");
  }

  function updateCartQty(cartId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== cartId));
    } else {
      setCart((prev) =>
        prev.map((i) => {
          if (i.id !== cartId) return i;
          const unitPrice = i.variant ? i.variant.price : i.product.price;
          return { ...i, quantity: qty, linePrice: unitPrice * qty };
        })
      );
    }
  }

  function updateItemDiscount(cartId: string, disc: number) {
    setCart((prev) =>
      prev.map((i) => (i.id === cartId ? { ...i, discount: Math.min(100, Math.max(0, disc)) } : i))
    );
  }

  function removeFromCart(cartId: string) {
    setCart((prev) => prev.filter((i) => i.id !== cartId));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Hold / Recall Sales
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function holdSale() {
    if (cart.length === 0) return;
    const held: HeldSale = {
      id: `hold-${Date.now()}`,
      name: selectedCustomer?.name || customerEmail || `Sale ${heldSales.length + 1}`,
      cart: [...cart], customerEmail, discount, createdAt: new Date(),
    };
    setHeldSales((prev) => [...prev, held]);
    clearCart();
    toast.success(t("toasts.saleHeld"));
  }

  function recallSale(held: HeldSale) {
    if (cart.length > 0) holdSale();
    setCart(held.cart);
    setCustomerEmail(held.customerEmail);
    setDiscount(held.discount);
    setHeldSales((prev) => prev.filter((h) => h.id !== held.id));
    setHoldDialogOpen(false);
    toast.success(t("toasts.saleRecalled"));
  }

  function clearCart() {
    setCart([]);
    setCustomerEmail("");
    setDiscount(0);
    setSelectedCustomer(null);
    setGiftCardCode("");
    setGiftCardBalance(null);
    setUseStoreCredit(false);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Totals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const subtotal = cart.reduce((sum, item) => {
    const unitPrice = item.variant ? item.variant.price : item.product.price;
    const lineTotal = unitPrice * item.quantity;
    const lineDisc = (lineTotal * item.discount) / 100;
    return sum + lineTotal - lineDisc;
  }, 0);

  const taxRate = storeConfig.taxRate;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * taxRate;
  const giftCardDeduction = giftCardBalance ? Math.min(giftCardBalance, afterDiscount + tax) : 0;
  const storeCreditDeduction = useStoreCredit && selectedCustomer
    ? Math.min(selectedCustomer.storeCredit, afterDiscount + tax - giftCardDeduction) : 0;
  const total = Math.max(0, afterDiscount + tax - giftCardDeduction - storeCreditDeduction);
  const change = paymentMethod === "cash" && amountTendered ? parseFloat(amountTendered) - total : 0;
  const curr = storeConfig.currency;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Checkout
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async function handleCheckout() {
    if (cart.length === 0) return;

    const orderItems = cart
      .filter((item) => !item.product.id.startsWith("custom-"))
      .map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id || undefined,
        quantity: item.quantity,
      }));

    const customItems = cart.filter((item) => item.product.id.startsWith("custom-"));
    const customNote = customItems.length
      ? `Custom items: ${customItems.map((i) => `${i.product.name} x${i.quantity} ${curr} ${i.product.price}`).join(", ")}`
      : "";

    let paymentDesc = "";
    const payments: Array<{ method: string; amount: number }> = [];
    if (paymentMethod === "split") {
      const cashAmt = parseFloat(splitCash) || 0;
      const cardAmt = parseFloat(splitCard) || 0;
      paymentDesc = `Split: Cash ${curr} ${cashAmt.toFixed(2)} + Card ${curr} ${cardAmt.toFixed(2)}`;
      payments.push({ method: "Cash", amount: cashAmt });
      payments.push({ method: "Card", amount: cardAmt });
    } else {
      paymentDesc = paymentMethod === "cash" ? "Cash" : "Card";
      payments.push({ method: paymentDesc, amount: total });
    }

    const payNotes = [
      `POS Sale — ${paymentDesc}`,
      posSession ? `Session: ${posSession.id}` : "",
      discount > 0 ? `(${discount}% discount)` : "",
      giftCardDeduction > 0 ? `Gift Card: -${curr} ${giftCardDeduction.toFixed(2)}` : "",
      storeCreditDeduction > 0 ? `Store Credit: -${curr} ${storeCreditDeduction.toFixed(2)}` : "",
      customNote,
    ].filter(Boolean).join(" | ");

    if (orderItems.length === 0 && customItems.length > 0) {
      toast.error(t("toasts.cannotCustomOnly"));
      return;
    }

    const orderPayload = {
      email: customerEmail || "pos@store.local",
      items: orderItems,
      source: "POS" as const,
      shippingAddress: {
        firstName: selectedCustomer?.name?.split(" ")[0] || "POS",
        lastName: selectedCustomer?.name?.split(" ").slice(1).join(" ") || "Customer",
        address1: "In-Store",
        city: "Riyadh",
        postalCode: "00000",
        country: "Saudi Arabia",
      },
      paymentMethod: paymentMethod === "cash" ? "cod" : "pos_card",
      notes: payNotes,
      ...(giftCardCode && giftCardDeduction > 0 ? { giftCardCode } : {}),
    };

    // Generate ZATCA QR code for Saudi e-invoicing compliance
    const zatcaQr = storeConfig.zatcaEnabled && storeConfig.vatNumber
      ? generateZatcaQR({
          sellerName: storeConfig.storeName,
          vatNumber: storeConfig.vatNumber,
          timestamp: new Date(),
          totalWithVat: total,
          vatAmount: tax,
        })
      : undefined;

    // Build receipt data
    const receiptItems = cart.map((item) => {
      const unitPrice = item.variant ? item.variant.price : item.product.price;
      return {
        name: item.product.name,
        variant: item.variant?.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        discount: item.discount || undefined,
      };
    });

    // ── Optimistic: queue order locally & complete sale instantly ──
    const localId = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await savePendingOrder({
        id: localId,
        payload: orderPayload,
        receiptData: {},
        createdAt: Date.now(),
        retries: 0,
      });
      const count = await getPendingCount();
      setPendingOrderCount(count);
    } catch {
      // IndexedDB failed — fall through, we still show success to cashier
    }

    // ── Immediate UI: receipt, sounds, reset — no waiting for server ──
    const receipt: ReceiptData = {
      storeName: storeConfig.storeName,
      storeAddress: storeConfig.storeAddress || undefined,
      storePhone: storeConfig.storePhone || undefined,
      vatNumber: storeConfig.vatNumber || undefined,
      orderNumber: localId,
      date: new Date(),
      cashier: posSession?.staffName || "Staff",
      items: receiptItems,
      subtotal,
      discount: discountAmount + giftCardDeduction + storeCreditDeduction,
      taxRate,
      taxAmount: tax,
      total,
      paymentMethod: paymentDesc,
      payments: payments.length > 1 ? payments : undefined,
      amountTendered: paymentMethod === "cash" ? parseFloat(amountTendered) || total : undefined,
      change: paymentMethod === "cash" ? Math.max(0, change) : undefined,
      giftCardUsed: giftCardDeduction > 0 ? giftCardDeduction : undefined,
      storeCreditUsed: storeCreditDeduction > 0 ? storeCreditDeduction : undefined,
      currency: curr,
      zatcaQrData: zatcaQr,
      footerMessage: t("toasts.thankYou"),
    };

    setReceiptData(receipt);

    if (autoPrint) {
      printer.printReceipt(receipt);
    }

    if (paymentMethod === "cash" || paymentMethod === "split") {
      printer.openCashDrawer();
      if (soundEnabled) playSound("drawer");
    }

    if (soundEnabled) playSound("success");

    toast.success(t("toasts.saleCompleted"), {
      description: t("toasts.saleCompletedDesc", { curr, total: total.toFixed(2) }),
    });

    setCart([]);
    setPaymentOpen(false);
    setAmountTendered("");
    setSplitCash("");
    setSplitCard("");
    setDiscount(0);
    setCustomerEmail("");
    setSelectedCustomer(null);
    setGiftCardCode("");
    setGiftCardBalance(null);
    setUseStoreCredit(false);

    // ── Background: flush the queue to server (non-blocking) ──
    flushPendingQueue();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Manual Barcode Entry
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function handleManualBarcode() {
    if (!manualBarcodeValue.trim()) return;
    manualScan(manualBarcodeValue.trim());
    setManualBarcodeValue("");
    setManualBarcodeOpen(false);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POS Refund
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function openRefundDialog() {
    setRefundOpen(true);
    setRefundOrderSearch("");
    setRefundSearchResults([]);
    setRefundOrder(null);
    setRefundSelections([]);
    setRefundReason("");
    setRefundRestock(true);
    setRefundProcessing(false);
  }

  async function searchRefundOrders(query: string) {
    setRefundOrderSearch(query);
    if (query.length < 2) { setRefundSearchResults([]); return; }
    setRefundSearchLoading(true);
    try {
      const res = await fetch(`/api/orders?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        const eligible = (data.orders || []).filter(
          (o: RefundOrder) => o.paymentStatus === "PAID" || o.paymentStatus === "PARTIALLY_PAID"
        );
        setRefundSearchResults(eligible);
      }
    } catch {
      toast.error(t("toasts.failedSearchOrders"));
    } finally {
      setRefundSearchLoading(false);
    }
  }

  function selectRefundOrder(order: RefundOrder) {
    setRefundOrder(order);
    setRefundSearchResults([]);
    setRefundSelections([]);
  }

  function toggleRefundItem(item: RefundOrderItem, checked: boolean) {
    if (checked) {
      const unitPrice = Number(item.totalPrice) / item.quantity;
      setRefundSelections((prev) => [
        ...prev,
        {
          orderItemId: item.id,
          quantity: item.quantity,
          maxQuantity: item.quantity,
          amount: Number(item.totalPrice),
          unitPrice,
          name: item.name,
        },
      ]);
    } else {
      setRefundSelections((prev) => prev.filter((s) => s.orderItemId !== item.id));
    }
  }

  function updateRefundItemQty(orderItemId: string, qty: number) {
    setRefundSelections((prev) =>
      prev.map((s) =>
        s.orderItemId === orderItemId
          ? { ...s, quantity: Math.max(1, Math.min(qty, s.maxQuantity)), amount: Math.max(1, Math.min(qty, s.maxQuantity)) * s.unitPrice }
          : s
      )
    );
  }

  function selectAllRefundItems() {
    if (!refundOrder) return;
    if (refundSelections.length === refundOrder.items.length) {
      setRefundSelections([]);
    } else {
      setRefundSelections(
        refundOrder.items.map((item) => {
          const unitPrice = Number(item.totalPrice) / item.quantity;
          return {
            orderItemId: item.id,
            quantity: item.quantity,
            maxQuantity: item.quantity,
            amount: Number(item.totalPrice),
            unitPrice,
            name: item.name,
          };
        })
      );
    }
  }

  const refundTotal = refundSelections.reduce((sum, s) => sum + s.amount, 0);
  const isFullRefund = refundOrder
    ? refundSelections.length === refundOrder.items.length &&
      refundSelections.every((s) => s.quantity === s.maxQuantity)
    : false;

  async function processRefund() {
    if (!refundOrder || refundSelections.length === 0) return;
    setRefundProcessing(true);
    try {
      const payload = {
        orderId: refundOrder.id,
        type: isFullRefund ? "FULL" : "PARTIAL",
        reason: refundReason || "POS Refund",
        notes: `POS Refund by ${posSession?.staffName || "Staff"}`,
        restockItems: refundRestock,
        items: refundSelections.map((s) => ({
          orderItemId: s.orderItemId,
          quantity: s.quantity,
          amount: s.amount,
        })),
      };

      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Refund failed" }));
        throw new Error(err.error || "Refund failed");
      }

      const result = await res.json();

      if (soundEnabled) playSound("success");

      // Build & show refund receipt
      const refundReceipt: ReceiptData = {
        storeName: storeConfig.storeName,
        storeAddress: storeConfig.storeAddress || undefined,
        storePhone: storeConfig.storePhone || undefined,
        vatNumber: storeConfig.vatNumber || undefined,
        orderNumber: `REFUND — ${refundOrder.orderNumber}`,
        date: new Date(),
        cashier: posSession?.staffName || "Staff",
        items: refundSelections.map((s) => ({
          name: s.name,
          quantity: s.quantity,
          unitPrice: -s.unitPrice,
          lineTotal: -s.amount,
        })),
        subtotal: -refundTotal,
        discount: 0,
        taxRate: storeConfig.taxRate,
        taxAmount: -(refundTotal * storeConfig.taxRate / (1 + storeConfig.taxRate)),
        total: -refundTotal,
        paymentMethod: `Refund (${result.refund?.status || "Completed"})`,
        currency: curr,
        footerMessage: t("toasts.refundReceipt"),
      };

      setReceiptData(refundReceipt);

      if (autoPrint) {
        printer.printReceipt(refundReceipt);
      }

      // Open cash drawer for cash refunds
      if (refundOrder.source === "POS") {
        printer.openCashDrawer();
        if (soundEnabled) playSound("drawer");
      }

      toast.success(t("toasts.refundProcessed"), {
        description: t("toasts.refundProcessedDesc", { curr, amount: refundTotal.toFixed(2), orderNumber: refundOrder.orderNumber }),
      });

      setRefundOpen(false);
    } catch (error) {
      if (soundEnabled) playSound("error");
      toast.error(error instanceof Error ? error.message : t("toasts.refundFailed"));
    } finally {
      setRefundProcessing(false);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render: Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">{t("loadingPos")}</p>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render: Main
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══════════ Product Grid — Left Panel ═══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Bar */}
        <div className="p-3 border-b flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              className="pl-9"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title={t("manualBarcodeTitle")} onClick={() => setManualBarcodeOpen(true)}>
            <Barcode className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" title={t("customItemTitle")} onClick={() => setCustomItemOpen(true)}>
            <Hash className="h-4 w-4" />
          </Button>

          {/* POS Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title={t("posSettings")}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{t("deviceStatus")}</div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5" /> {t("barcodeScanner")}</span>
                <Badge variant={scannerReady ? "default" : "secondary"} className="text-[10px]">
                  {scannerReady ? t("ready") : t("off")}
                </Badge>
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Printer className="h-3.5 w-3.5" /> {t("receiptPrinter")}</span>
                <Badge
                  variant={printer.connected ? "default" : "secondary"}
                  className="text-[10px] cursor-pointer"
                  onClick={printer.connected ? printer.disconnect : printer.connect}
                >
                  {printer.connected ? t("connected") : printer.serialSupported ? t("connect") : t("browser")}
                </Badge>
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {isOnline ? <Wifi className="h-3.5 w-3.5 text-green-500" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                  {t("network")}
                </span>
                <Badge variant={isOnline ? "default" : "destructive"} className="text-[10px]">
                  {isOnline ? t("online") : t("offline")}
                </Badge>
              </div>
              {pendingOrderCount > 0 && (
                <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><CloudOff className="h-3.5 w-3.5 text-amber-500" /> {t("pendingOrders")}</span>
                  <Badge variant="outline" className="text-[10px] text-amber-600">
                    {pendingOrderCount}
                  </Badge>
                </div>
              )}
              <DropdownMenuSeparator />
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{t("options")}</div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <Label htmlFor="sound-toggle" className="flex items-center gap-2 cursor-pointer">
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  {t("soundEffects")}
                </Label>
                <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <Label htmlFor="autoprint-toggle" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="h-3.5 w-3.5" /> {t("autoPrintReceipt")}
                </Label>
                <Switch id="autoprint-toggle" checked={autoPrint} onCheckedChange={setAutoPrint} />
              </div>
              {printer.connected && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => printer.testPrint()}>
                    <Printer className="h-3.5 w-3.5 mr-2" /> {t("testPrint")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { printer.openCashDrawer(); if (soundEnabled) playSound("drawer"); }}>
                    <DollarSign className="h-3.5 w-3.5 mr-2" /> {t("openCashDrawer")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRegisterOpen(true)}>
                {posSession
                  ? <><LogOut className="h-3.5 w-3.5 mr-2" /> {t("closeRegister")}</>
                  : <><LogIn className="h-3.5 w-3.5 mr-2" /> {t("openRegister")}</>
                }
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" title={isFullscreen ? t("exitFullscreen") : t("fullscreen")} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        {/* Offline Banner */}
        {(!isOnline || pendingOrderCount > 0) && (
          <div className={`px-3 py-1.5 flex items-center gap-2 text-xs font-medium border-b ${
            !isOnline ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          }`}>
            {!isOnline ? (
              <>
                <CloudOff className="h-3.5 w-3.5" />
                {t("offlineBanner")}
              </>
            ) : syncing ? (
              <>
                <CloudUpload className="h-3.5 w-3.5 animate-pulse" />
                {t("syncingOrders", { count: pendingOrderCount })}
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5" />
                {t("pendingToSync", { count: pendingOrderCount })}
              </>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts Bar */}
        <div className="hidden md:flex px-3 py-1.5 border-b bg-muted/30 items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F1</kbd> {t("shortcutSearch")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F2</kbd> {t("shortcutCash")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F3</kbd> {t("shortcutCard")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F4</kbd> {t("shortcutHold")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F5</kbd> {t("shortcutRecall")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F6</kbd> {t("shortcutBarcode")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F7</kbd> {t("shortcutSplit")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F8</kbd> {t("shortcutCustom")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F9</kbd> {t("shortcutDrawer")}</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">Ctrl+R</kbd> {t("shortcutRefund")}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {isOnline
              ? <><Wifi className="h-3 w-3 text-green-500" /> {t("online")}</>
              : <><WifiOff className="h-3 w-3 text-destructive" /> {t("offline")}</>
            }
            <span className="mx-1">|</span>
            {printer.connected
              ? <><Printer className="h-3 w-3 text-green-500" /> {t("printer")}</>
              : <><Printer className="h-3 w-3" /> {t("noPrinter")}</>
            }
            <span className="mx-1">|</span>
            <Barcode className="h-3 w-3" /> {t("scanner")} {lastScan ? "✓" : t("ready")}
            {posSession && (
              <>
                <span className="mx-1">|</span>
                <span className="text-green-600">● {t("registerOpen")}</span>
              </>
            )}
          </span>
        </div>

        {/* Category Quick Tabs */}
        {categories.length > 2 && (
          <div className="border-b px-3 py-1.5">
            <ScrollArea className="w-full">
              <div className="flex gap-1">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-9 shrink-0"
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === "ALL" ? t("allProducts") : cat}
                    {cat !== "ALL" && (
                      <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">
                        {products.filter((p) => p.category === cat).length}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Products Grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-t-lg" />
                    <CardContent className="p-2 space-y-2">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{t("noProducts")}</p>
                {search && <p className="text-xs mt-1">{t("tryDifferentSearch")}</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-square bg-muted relative">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 20vw" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <Package className="h-8 w-8 opacity-30" />
                        </div>
                      )}
                      {product.quantity <= 0 && (
                        <Badge variant="destructive" className="absolute top-1 right-1 text-[10px]">{t("outBadge")}</Badge>
                      )}
                      {product.variants.length > 0 && (
                        <Badge variant="secondary" className="absolute bottom-1 left-1 text-[10px]">
                          {t("variants", { count: product.variants.length })}
                        </Badge>
                      )}
                      {product.barcode && (
                        <Badge variant="outline" className="absolute bottom-1 right-1 text-[8px] bg-background/80">
                          <Barcode className="h-2.5 w-2.5 mr-0.5" />{product.barcode}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold">{curr} {product.price.toFixed(2)}</span>
                        {product.sku && <span className="text-[10px] text-muted-foreground">{product.sku}</span>}
                      </div>
                      <span className={`text-[10px] ${product.quantity > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                        {product.quantity > 0 ? t("inStock", { count: product.quantity }) : t("outOfStock")}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ═══════════ Cart — Right Panel (Desktop) ═══════════ */}
      <div className="hidden md:flex w-100 border-l flex-col bg-card overflow-hidden">
        {/* Cart Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4" /> {t("currentSale")}
            {heldSales.length > 0 && <Badge variant="secondary" className="ml-1">{t("held", { count: heldSales.length })}</Badge>}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={openRefundDialog} title="Refund (Ctrl+R)">
              <RotateCcw className="h-3 w-3 mr-1" /> {t("refund")}
            </Button>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={holdSale} title="Hold (F4)">
                <Pause className="h-3 w-3 mr-1" /> {t("hold")}
              </Button>
            )}
            {heldSales.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setHoldDialogOpen(true)} title="Recall (F5)">
                <Play className="h-3 w-3 mr-1" /> {t("recall")}
              </Button>
            )}
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={clearCart}>
                <X className="h-3 w-3 mr-1" /> {t("clear")}
              </Button>
            )}
          </div>
        </div>

        {/* Customer Section */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            {selectedCustomer ? (
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedCustomer.name || selectedCustomer.email}</p>
                  {selectedCustomer.storeCredit > 0 && (
                    <p className="text-[10px] text-green-600">{t("credit", { curr, amount: selectedCustomer.storeCredit.toFixed(2) })}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setSelectedCustomer(null); setCustomerEmail(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <Input
                  placeholder={t("searchCustomer")}
                  className="h-8 text-sm"
                  value={customerSearch || customerEmail}
                  onChange={(e) => { setCustomerEmail(e.target.value); searchCustomers(e.target.value); }}
                />
                {customerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-card border rounded-md shadow-lg mt-1">
                    {customerResults.map((c) => (
                      <button key={c.id} className="w-full text-left px-3 py-3 hover:bg-accent active:bg-accent text-sm flex justify-between" onClick={() => selectCustomer(c)}>
                        <span>{c.name || c.email}</span>
                        <span className="text-muted-foreground text-xs">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 min-h-0">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("noItemsInCart")}</p>
              <p className="text-xs mt-1">{t("clickProductsOrScan")}</p>
              <div className="mt-3 flex items-center justify-center gap-1 text-[10px]">
                <Keyboard className="h-3 w-3" /> {t("keyboardShortcuts")}
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map((item) => {
                const unitPrice = item.variant ? item.variant.price : item.product.price;
                const lineTotal = unitPrice * item.quantity;
                const lineDisc = (lineTotal * item.discount) / 100;
                return (
                  <div key={item.id} className="p-2 rounded-lg border bg-background space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        {item.variant && <p className="text-[10px] text-muted-foreground">{item.variant.name}</p>}
                        <p className="text-xs text-muted-foreground">{t("each", { curr, price: unitPrice.toFixed(2) })}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCartQty(item.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => updateCartQty(item.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold w-16 text-right">{curr} {(lineTotal - lineDisc).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.discount > 0 && (
                      <p className="text-[10px] text-green-600">-{item.discount}% ({curr} {lineDisc.toFixed(2)})</p>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-muted-foreground">
                          <ChevronDown className="h-3 w-3 mr-0.5" /> {t("options")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          const disc = prompt(t("itemDiscountPrompt"), String(item.discount));
                          if (disc !== null) updateItemDiscount(item.id, parseFloat(disc) || 0);
                        }}>{t("setItemDiscount")}</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => removeFromCart(item.id)}>{t("removeItem")}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Cart Summary & Payment */}
        {cart.length > 0 && (
          <div className="border-t p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gift className="h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={t("giftCardCode")} className="h-9 text-sm flex-1" value={giftCardCode} onChange={(e) => setGiftCardCode(e.target.value)} />
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={checkGiftCard}>{t("apply")}</Button>
              </div>
              {selectedCustomer && selectedCustomer.storeCredit > 0 && (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={useStoreCredit} onChange={(e) => setUseStoreCredit(e.target.checked)} className="rounded" />
                  <Wallet className="h-3.5 w-3.5" /> {t("useStoreCredit", { curr, amount: selectedCustomer.storeCredit.toFixed(2) })}
                </label>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="numeric" placeholder={t("discountPercent")} className="h-9 text-sm w-24" value={discount || ""} onChange={(e) => setDiscount(Math.min(100, Math.max(0, +e.target.value)))} />
              <span className="text-xs text-muted-foreground">{t("percentOffOrder")}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotalItems", { count: cart.reduce((s, i) => s + i.quantity, 0) })}</span>
                <span>{curr} {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t("orderDiscount", { pct: discount })}</span>
                  <span>-{curr} {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("vat", { pct: (taxRate * 100).toFixed(0) })}</span>
                <span>{curr} {tax.toFixed(2)}</span>
              </div>
              {giftCardDeduction > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t("giftCard")}</span>
                  <span>-{curr} {giftCardDeduction.toFixed(2)}</span>
                </div>
              )}
              {storeCreditDeduction > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t("storeCredit")}</span>
                  <span>-{curr} {storeCreditDeduction.toFixed(2)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>{t("total")}</span>
              <span>{curr} {total.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button className="w-full" onClick={() => { setPaymentMethod("cash"); setPaymentOpen(true); }}>
                <Banknote className="h-4 w-4 mr-1" /> {t("cash")}
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => { setPaymentMethod("card"); setPaymentOpen(true); }}>
                <CreditCard className="h-4 w-4 mr-1" /> {t("card")}
              </Button>
              <Button className="w-full" variant="outline" onClick={() => { setPaymentMethod("split"); setPaymentOpen(true); }}>
                <ArrowRightLeft className="h-4 w-4 mr-1" /> {t("split")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ Mobile Cart FAB ═══════════ */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full h-14 w-14 shadow-lg relative">
              <ShoppingBag className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(400px,90vw)] flex flex-col p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> {t("cartTitle", { curr, total: total.toFixed(2) })}
                </span>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={openRefundDialog}>
                  <RotateCcw className="h-3 w-3 mr-1" /> {t("refund")}
                </Button>
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 px-4 py-2">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t("cartEmpty")}</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                        <p className="text-xs font-semibold mt-0.5">{curr} {(item.variant?.price ?? item.product.price).toFixed(2)} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => updateCartQty(item.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-sm w-7 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => updateCartQty(item.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="flex justify-between font-bold">
                  <span>{t("total")}</span>
                  <span>{curr} {total.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => { setPaymentMethod("cash"); setPaymentOpen(true); }}>
                    <Banknote className="h-4 w-4 mr-1" /> {t("cash")}
                  </Button>
                  <Button variant="secondary" onClick={() => { setPaymentMethod("card"); setPaymentOpen(true); }}>
                    <CreditCard className="h-4 w-4 mr-1" /> {t("card")}
                  </Button>
                  <Button variant="outline" onClick={() => { setPaymentMethod("split"); setPaymentOpen(true); }}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> {t("split")}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* ═══════════ Variant Dialog ═══════════ */}
      <Dialog open={!!variantDialog} onOpenChange={() => setVariantDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("selectVariant")}</DialogTitle>
            <DialogDescription>{variantDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {variantDialog?.variants.map((v) => (
              <Button key={v.id} variant="outline" className="justify-between h-auto py-3" onClick={() => addToCartDirect(variantDialog!, v)}>
                <div className="text-left">
                  <p className="font-medium">{v.name}</p>
                  {v.sku && <p className="text-xs text-muted-foreground">{t("sku", { sku: v.sku })}</p>}
                  {v.barcode && <p className="text-xs text-muted-foreground flex items-center gap-1"><Barcode className="h-3 w-3" />{v.barcode}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold">{curr} {v.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{t("inStock", { count: v.quantity })}</p>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Payment Dialog ═══════════ */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentMethod === "cash" && <><Banknote className="h-5 w-5" /> {t("cashPayment")}</>}
              {paymentMethod === "card" && <><CreditCard className="h-5 w-5" /> {t("cardPayment")}</>}
              {paymentMethod === "split" && <><ArrowRightLeft className="h-5 w-5" /> {t("splitPayment")}</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t("totalDue")}</p>
              <p className="text-3xl font-bold">{curr} {total.toFixed(2)}</p>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("amountTendered")}</Label>
                  <Input
                    type="number" step="0.01" inputMode="decimal" value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="0.00" className="text-lg" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && parseFloat(amountTendered) >= total) handleCheckout(); }}
                  />
                </div>
                {change > 0 && (
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t("change")}</p>
                    <p className="text-2xl font-bold text-green-600">{curr} {change.toFixed(2)}</p>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {[Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50]
                    .filter((v, i, a) => a.indexOf(v) === i && v >= total)
                    .slice(0, 4)
                    .map((amount) => (
                      <Button key={amount} variant="outline" size="sm" onClick={() => setAmountTendered(amount.toFixed(2))}>
                        {curr} {amount}
                      </Button>
                    ))}
                </div>
                <Button variant="outline" className="w-full" size="sm" onClick={() => setAmountTendered(total.toFixed(2))}>
                  {t("exactAmount", { curr, total: total.toFixed(2) })}
                </Button>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="text-center py-4">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("tapInsertSwipe")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("pressComplete")}</p>
              </div>
            )}

            {paymentMethod === "split" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("splitDescription")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> {t("cashAmount")}</Label>
                    <Input type="number" step="0.01" inputMode="decimal" value={splitCash} onChange={(e) => { setSplitCash(e.target.value); setSplitCard(Math.max(0, total - (parseFloat(e.target.value) || 0)).toFixed(2)); }} placeholder="0.00" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> {t("cardAmount")}</Label>
                    <Input type="number" step="0.01" inputMode="decimal" value={splitCard} onChange={(e) => { setSplitCard(e.target.value); setSplitCash(Math.max(0, total - (parseFloat(e.target.value) || 0)).toFixed(2)); }} placeholder="0.00" />
                  </div>
                </div>
                {(() => {
                  const splitTotal = (parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0);
                  const diff = Math.abs(splitTotal - total);
                  return diff > 0.01
                    ? <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {t("splitMustEqual", { curr, total: total.toFixed(2), diff: diff.toFixed(2) })}</p>
                    : <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {t("splitMatch")}</p>;
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>{t("cancel")}</Button>
            <Button
              onClick={handleCheckout}
              disabled={
                (paymentMethod === "cash" && (!amountTendered || parseFloat(amountTendered) < total)) ||
                (paymentMethod === "split" && Math.abs(((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0)) - total) > 0.01)
              }
            >
              {t("completeSale")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Held Sales Dialog ═══════════ */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("heldSales", { count: heldSales.length })}</DialogTitle>
          </DialogHeader>
          {heldSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t("noHeldSales")}</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {heldSales.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("items", { count: h.cart.length })} — {curr} {h.cart.reduce((s, i) => s + (i.variant ? i.variant.price : i.product.price) * i.quantity, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => recallSale(h)}>{t("recall")}</Button>
                    <Button size="sm" variant="destructive" onClick={() => setHeldSales((prev) => prev.filter((s) => s.id !== h.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════ Custom Item Dialog ═══════════ */}
      <Dialog open={customItemOpen} onOpenChange={setCustomItemOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("addCustomItem")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("itemName")}</Label>
              <Input value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} placeholder={t("itemNamePlaceholder")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("price", { curr })}</Label>
              <Input type="number" value={customItemPrice} onChange={(e) => setCustomItemPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomItemOpen(false)}>{t("cancel")}</Button>
            <Button onClick={addCustomItem} disabled={!customItemName || !customItemPrice}>{t("addItem")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Manual Barcode Dialog ═══════════ */}
      <Dialog open={manualBarcodeOpen} onOpenChange={setManualBarcodeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Barcode className="h-5 w-5" /> {t("manualBarcodeEntry")}</DialogTitle>
            <DialogDescription>{t("manualBarcodeDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={manualBarcodeValue}
              onChange={(e) => setManualBarcodeValue(e.target.value)}
              placeholder={t("enterBarcode")}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleManualBarcode(); }}
            />
            <p className="text-xs text-muted-foreground">{t("barcodeFormats")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualBarcodeOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleManualBarcode} disabled={!manualBarcodeValue.trim()}>
              <ScanLine className="h-4 w-4 mr-1.5" /> {t("lookUp")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Register Open/Close Dialog ═══════════ */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {posSession ? t("closeRegister") : t("openRegister")}
            </DialogTitle>
            <DialogDescription>
              {posSession
                ? t("closeRegisterDesc")
                : t("openRegisterDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {posSession ? (
              <>
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("opened")}</span>
                    <span>{new Date(posSession.openedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("openingBalance")}</span>
                    <span>{curr} {Number(posSession.openingBalance).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("totalSales")}</span>
                    <span>{curr} {Number(posSession.totalSales).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("totalOrders")}</span>
                    <span>{posSession.totalOrders}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>{t("expectedInDrawer")}</span>
                    <span>{curr} {(Number(posSession.openingBalance) + Number(posSession.totalSales)).toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("actualCashCount", { curr })}</Label>
                  <Input type="number" step="0.01" inputMode="decimal" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" className="text-lg" autoFocus />
                  {closingBalance && (() => {
                    const expected = Number(posSession.openingBalance) + Number(posSession.totalSales);
                    const actual = parseFloat(closingBalance) || 0;
                    const variance = actual - expected;
                    return (
                      <p className={`text-xs mt-1 ${Math.abs(variance) > 0.01 ? "text-destructive" : "text-green-600"}`}>
                        {Math.abs(variance) <= 0.01 ? t("cashMatchesExpected") : t("variance", { sign: variance > 0 ? "+" : "", curr, amount: variance.toFixed(2) })}
                      </p>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>{t("openingCashFloat", { curr })}</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" className="text-lg" autoFocus />
                <p className="text-xs text-muted-foreground mt-1">{t("countCash")}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>{t("cancel")}</Button>
            {posSession ? (
              <Button onClick={closeRegister} disabled={!closingBalance} variant="destructive">
                <LogOut className="h-4 w-4 mr-1.5" /> {t("closeRegister")}
              </Button>
            ) : (
              <Button onClick={openRegister}>
                <LogIn className="h-4 w-4 mr-1.5" /> {t("openRegister")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ POS Refund Dialog ═══════════ */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" /> {t("posRefund")}
            </DialogTitle>
            <DialogDescription>{t("refundDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {/* Step 1: Search for order */}
            {!refundOrder && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("orderNumber")}</Label>
                  <Input
                    placeholder={t("refundSearchPlaceholder")}
                    value={refundOrderSearch}
                    onChange={(e) => searchRefundOrders(e.target.value)}
                    autoFocus
                  />
                </div>

                {refundSearchLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {refundSearchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-64 overflow-auto">
                    {refundSearchResults.map((order) => (
                      <button
                        key={order.id}
                        className="w-full text-left p-3 rounded-lg border bg-background hover:bg-muted transition-colors"
                        onClick={() => selectRefundOrder(order)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{order.orderNumber}</span>
                          <Badge variant={order.source === "POS" ? "default" : "secondary"} className="text-[10px]">
                            {order.source}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{order.email}</span>
                          <span className="text-sm font-medium">{curr} {Number(order.totalAmount).toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()} — {t("itemCount", { count: order.items.length })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {refundOrderSearch.length >= 2 && !refundSearchLoading && refundSearchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("noEligibleOrders")}</p>
                )}
              </div>
            )}

            {/* Step 2: Select items to refund */}
            {refundOrder && (
              <div className="space-y-3">
                {/* Order header */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium text-sm">{refundOrder.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {refundOrder.email} — {new Date(refundOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{curr} {Number(refundOrder.totalAmount).toFixed(2)}</p>
                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => { setRefundOrder(null); setRefundSelections([]); }}>
                      {t("changeOrder")}
                    </Button>
                  </div>
                </div>

                {/* Select all */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t("selectItemsToRefund")}</Label>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllRefundItems}>
                    {refundSelections.length === refundOrder.items.length ? t("deselectAll") : t("selectAll")}
                  </Button>
                </div>

                {/* Item list */}
                <div className="space-y-2 max-h-48 overflow-auto">
                  {refundOrder.items.map((item) => {
                    const selected = refundSelections.find((s) => s.orderItemId === item.id);
                    const unitPrice = Number(item.totalPrice) / item.quantity;
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-background">
                        <Checkbox
                          checked={!!selected}
                          onCheckedChange={(checked) => toggleRefundItem(item, !!checked)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.variant && (
                            <p className="text-[10px] text-muted-foreground">{item.variant.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {curr} {unitPrice.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        {selected && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Label className="text-[10px] text-muted-foreground">Qty:</Label>
                            <div className="flex items-center border rounded">
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => updateRefundItemQty(item.id, selected.quantity - 1)}
                                disabled={selected.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs w-6 text-center">{selected.quantity}</span>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => updateRefundItemQty(item.id, selected.quantity + 1)}
                                disabled={selected.quantity >= selected.maxQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm font-medium w-20 text-right">
                              {curr} {selected.amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Refund Options */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Reason</Label>
                    <Textarea
                      placeholder="Reason for refund (optional)"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="h-16 resize-none text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="restock-toggle" className="flex items-center gap-2 cursor-pointer text-sm">
                      <Package className="h-3.5 w-3.5" /> Restock Items
                    </Label>
                    <Switch id="restock-toggle" checked={refundRestock} onCheckedChange={setRefundRestock} />
                  </div>
                </div>

                {/* Refund Summary */}
                {refundSelections.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Refund Total</span>
                      <span className="text-lg font-bold text-destructive">{curr} {refundTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {refundSelections.length} item{refundSelections.length !== 1 ? "s" : ""} —{" "}
                      {isFullRefund ? "Full Refund" : "Partial Refund"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refundProcessing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={processRefund}
              disabled={!refundOrder || refundSelections.length === 0 || refundProcessing}
            >
              {refundProcessing ? (
                <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Processing…</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-1.5" /> Process Refund</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Receipt Dialog ═══════════ */}
      <Dialog open={!!receiptData} onOpenChange={() => setReceiptData(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transaction Complete</DialogTitle>
            <DialogDescription>Order {receiptData?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{curr} {receiptData?.total.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">{receiptData?.paymentMethod} Payment</p>
            {receiptData?.change && receiptData.change > 0 && (
              <p className="text-sm text-green-600 mt-1">Change: {curr} {receiptData.change.toFixed(2)}</p>
            )}
            {receiptData?.zatcaQrData && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(receiptData.zatcaQrData)}`}
                  alt="ZATCA QR"
                  className="mx-auto h-25 w-25"
                />
                <p className="text-[10px] text-muted-foreground mt-1">ZATCA E-Invoice QR</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setReceiptData(null)}>
              New Sale <kbd className="ml-1.5 px-1 py-0.5 rounded bg-muted border text-[9px] text-muted-foreground">F10</kbd>
            </Button>
            <Button className="flex-1" onClick={() => receiptData && printer.printReceipt(receiptData)}>
              <Printer className="h-4 w-4 mr-1.5" /> Print <kbd className="ml-1.5 px-1 py-0.5 rounded bg-primary-foreground/20 border border-primary-foreground/30 text-[9px]">F12</kbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
