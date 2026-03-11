"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, X,
  ShoppingBag, Barcode, User, Pause, Play, Gift, Wallet, Printer,
  Hash, Keyboard, ChevronDown, Package, Wifi, WifiOff, Volume2, VolumeX,
  ArrowRightLeft, DollarSign, LogIn, LogOut, ClipboardList,
  AlertCircle, CheckCircle2, ScanLine, Settings2,
  Maximize, Minimize, CloudOff, CloudUpload,
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
  taxRate: number;
  taxIncluded: boolean;
}

type PaymentMethodType = "cash" | "card" | "split";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function PosPage() {
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
        toast.error(`${result.failed} order${result.failed > 1 ? "s" : ""} failed to sync — will retry`);
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
      toast.error(`Product not found: ${code}`, {
        description: "Check the barcode or add the product to your inventory.",
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
    toast.success(`Scanned: ${product.name}`);
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
      toast.error("Failed to load products");
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
      toast.success("Register opened", {
        description: `Opening balance: ${storeConfig.currency} ${balance.toFixed(2)}`,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to open register");
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
      toast.success("Register closed", {
        description: `Closing balance: ${storeConfig.currency} ${balance.toFixed(2)}`,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to close register");
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
        toast.success("Cash drawer opened");
      }
      if (e.key === "F10" && receiptData) { e.preventDefault(); setReceiptData(null); }
      if (e.key === "F11") { e.preventDefault(); toggleFullscreen(); }
      if (e.key === "F12" && receiptData) { e.preventDefault(); printer.printReceipt(receiptData); }
      if (e.key === "Escape" && search) { setSearch(""); }
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
          toast.success(`Gift card balance: ${storeConfig.currency} ${Number(card.balance).toFixed(2)}`);
        } else {
          toast.error("Gift card has no balance or not found");
          setGiftCardBalance(null);
        }
      } else {
        toast.error("Gift card not found");
        setGiftCardBalance(null);
      }
    } catch {
      toast.error("Failed to check gift card");
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
    toast.success("Sale held");
  }

  function recallSale(held: HeldSale) {
    if (cart.length > 0) holdSale();
    setCart(held.cart);
    setCustomerEmail(held.customerEmail);
    setDiscount(held.discount);
    setHeldSales((prev) => prev.filter((h) => h.id !== held.id));
    setHoldDialogOpen(false);
    toast.success("Sale recalled");
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
      toast.error("Cannot create POS order with only custom items");
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
      paymentMethod: paymentMethod === "cash" || paymentMethod === "split" ? "cod" : "tap",
      notes: payNotes,
      ...(giftCardCode && giftCardDeduction > 0 ? { giftCardCode } : {}),
    };

    // Generate ZATCA QR code for Saudi e-invoicing compliance
    const zatcaQr = storeConfig.vatNumber
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
      footerMessage: "Thank you for your purchase!",
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

    toast.success("Sale completed!", {
      description: `${curr} ${total.toFixed(2)} — syncing in background`,
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
  // Render: Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading POS...</p>
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
              placeholder="Search by name, SKU, barcode, or category… (F1)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title="Manual barcode entry (F6)" onClick={() => setManualBarcodeOpen(true)}>
            <Barcode className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" title="Custom item (F8)" onClick={() => setCustomItemOpen(true)}>
            <Hash className="h-4 w-4" />
          </Button>

          {/* POS Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="POS Settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Device Status</div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5" /> Barcode Scanner</span>
                <Badge variant={scannerReady ? "default" : "secondary"} className="text-[10px]">
                  {scannerReady ? "Ready" : "Off"}
                </Badge>
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Printer className="h-3.5 w-3.5" /> Receipt Printer</span>
                <Badge
                  variant={printer.connected ? "default" : "secondary"}
                  className="text-[10px] cursor-pointer"
                  onClick={printer.connected ? printer.disconnect : printer.connect}
                >
                  {printer.connected ? "Connected" : printer.serialSupported ? "Connect" : "Browser"}
                </Badge>
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {isOnline ? <Wifi className="h-3.5 w-3.5 text-green-500" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                  Network
                </span>
                <Badge variant={isOnline ? "default" : "destructive"} className="text-[10px]">
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              {pendingOrderCount > 0 && (
                <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><CloudOff className="h-3.5 w-3.5 text-amber-500" /> Pending Orders</span>
                  <Badge variant="outline" className="text-[10px] text-amber-600">
                    {pendingOrderCount}
                  </Badge>
                </div>
              )}
              <DropdownMenuSeparator />
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Options</div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <Label htmlFor="sound-toggle" className="flex items-center gap-2 cursor-pointer">
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  Sound Effects
                </Label>
                <Switch id="sound-toggle" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
              <div className="px-3 py-1.5 flex items-center justify-between text-sm">
                <Label htmlFor="autoprint-toggle" className="flex items-center gap-2 cursor-pointer">
                  <Printer className="h-3.5 w-3.5" /> Auto-Print Receipt
                </Label>
                <Switch id="autoprint-toggle" checked={autoPrint} onCheckedChange={setAutoPrint} />
              </div>
              {printer.connected && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => printer.testPrint()}>
                    <Printer className="h-3.5 w-3.5 mr-2" /> Test Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { printer.openCashDrawer(); if (soundEnabled) playSound("drawer"); }}>
                    <DollarSign className="h-3.5 w-3.5 mr-2" /> Open Cash Drawer (F9)
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRegisterOpen(true)}>
                {posSession
                  ? <><LogOut className="h-3.5 w-3.5 mr-2" /> Close Register</>
                  : <><LogIn className="h-3.5 w-3.5 mr-2" /> Open Register</>
                }
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" title={isFullscreen ? "Exit fullscreen" : "Fullscreen (F11)"} onClick={toggleFullscreen}>
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
                Offline mode — orders will be saved locally and synced when internet returns
              </>
            ) : syncing ? (
              <>
                <CloudUpload className="h-3.5 w-3.5 animate-pulse" />
                Syncing {pendingOrderCount} pending order{pendingOrderCount !== 1 ? "s" : ""}…
              </>
            ) : (
              <>
                <CloudOff className="h-3.5 w-3.5" />
                {pendingOrderCount} pending order{pendingOrderCount !== 1 ? "s" : ""} to sync
              </>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts Bar */}
        <div className="hidden md:flex px-3 py-1.5 border-b bg-muted/30 items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F1</kbd> Search</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F2</kbd> Cash</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F3</kbd> Card</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F4</kbd> Hold</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F5</kbd> Recall</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F6</kbd> Barcode</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F7</kbd> Split</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F8</kbd> Custom</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F9</kbd> Drawer</span>
          <span className="ml-auto flex items-center gap-1.5">
            {isOnline
              ? <><Wifi className="h-3 w-3 text-green-500" /> Online</>
              : <><WifiOff className="h-3 w-3 text-destructive" /> Offline</>
            }
            <span className="mx-1">|</span>
            {printer.connected
              ? <><Printer className="h-3 w-3 text-green-500" /> Printer</>
              : <><Printer className="h-3 w-3" /> No Printer</>
            }
            <span className="mx-1">|</span>
            <Barcode className="h-3 w-3" /> Scanner {lastScan ? "✓" : "Ready"}
            {posSession && (
              <>
                <span className="mx-1">|</span>
                <span className="text-green-600">● Register Open</span>
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
                    {cat === "ALL" ? "All Products" : cat}
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
                <p>No products found</p>
                {search && <p className="text-xs mt-1">Try a different search term or scan a barcode</p>}
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
                        <Badge variant="destructive" className="absolute top-1 right-1 text-[10px]">Out</Badge>
                      )}
                      {product.variants.length > 0 && (
                        <Badge variant="secondary" className="absolute bottom-1 left-1 text-[10px]">
                          {product.variants.length} variants
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
                        {product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}
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
            <Receipt className="h-4 w-4" /> Current Sale
            {heldSales.length > 0 && <Badge variant="secondary" className="ml-1">{heldSales.length} held</Badge>}
          </h2>
          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={holdSale} title="Hold (F4)">
                <Pause className="h-3 w-3 mr-1" /> Hold
              </Button>
            )}
            {heldSales.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setHoldDialogOpen(true)} title="Recall (F5)">
                <Play className="h-3 w-3 mr-1" /> Recall
              </Button>
            )}
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={clearCart}>
                <X className="h-3 w-3 mr-1" /> Clear
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
                    <p className="text-[10px] text-green-600">Credit: {curr} {selectedCustomer.storeCredit.toFixed(2)}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setSelectedCustomer(null); setCustomerEmail(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <Input
                  placeholder="Search customer…"
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
              <p className="text-sm">No items in cart</p>
              <p className="text-xs mt-1">Click products or scan barcodes</p>
              <div className="mt-3 flex items-center justify-center gap-1 text-[10px]">
                <Keyboard className="h-3 w-3" /> Keyboard shortcuts available
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
                        <p className="text-xs text-muted-foreground">{curr} {unitPrice.toFixed(2)} each</p>
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
                          <ChevronDown className="h-3 w-3 mr-0.5" /> Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          const disc = prompt("Item discount %", String(item.discount));
                          if (disc !== null) updateItemDiscount(item.id, parseFloat(disc) || 0);
                        }}>Set Item Discount</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => removeFromCart(item.id)}>Remove Item</DropdownMenuItem>
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
                <Input placeholder="Gift card code" className="h-9 text-sm flex-1" value={giftCardCode} onChange={(e) => setGiftCardCode(e.target.value)} />
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={checkGiftCard}>Apply</Button>
              </div>
              {selectedCustomer && selectedCustomer.storeCredit > 0 && (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={useStoreCredit} onChange={(e) => setUseStoreCredit(e.target.checked)} className="rounded" />
                  <Wallet className="h-3.5 w-3.5" /> Use store credit ({curr} {selectedCustomer.storeCredit.toFixed(2)})
                </label>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="numeric" placeholder="Discount %" className="h-9 text-sm w-24" value={discount || ""} onChange={(e) => setDiscount(Math.min(100, Math.max(0, +e.target.value)))} />
              <span className="text-xs text-muted-foreground">% off entire order</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>{curr} {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Order Discount ({discount}%)</span>
                  <span>-{curr} {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT ({(taxRate * 100).toFixed(0)}%)</span>
                <span>{curr} {tax.toFixed(2)}</span>
              </div>
              {giftCardDeduction > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Gift Card</span>
                  <span>-{curr} {giftCardDeduction.toFixed(2)}</span>
                </div>
              )}
              {storeCreditDeduction > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Store Credit</span>
                  <span>-{curr} {storeCreditDeduction.toFixed(2)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{curr} {total.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button className="w-full" onClick={() => { setPaymentMethod("cash"); setPaymentOpen(true); }}>
                <Banknote className="h-4 w-4 mr-1" /> Cash
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => { setPaymentMethod("card"); setPaymentOpen(true); }}>
                <CreditCard className="h-4 w-4 mr-1" /> Card
              </Button>
              <Button className="w-full" variant="outline" onClick={() => { setPaymentMethod("split"); setPaymentOpen(true); }}>
                <ArrowRightLeft className="h-4 w-4 mr-1" /> Split
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
              <SheetTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Cart — {curr} {total.toFixed(2)}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 px-4 py-2">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Cart is empty</p>
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
                  <span>Total</span>
                  <span>{curr} {total.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => { setPaymentMethod("cash"); setPaymentOpen(true); }}>
                    <Banknote className="h-4 w-4 mr-1" /> Cash
                  </Button>
                  <Button variant="secondary" onClick={() => { setPaymentMethod("card"); setPaymentOpen(true); }}>
                    <CreditCard className="h-4 w-4 mr-1" /> Card
                  </Button>
                  <Button variant="outline" onClick={() => { setPaymentMethod("split"); setPaymentOpen(true); }}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Split
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
            <DialogTitle>Select Variant</DialogTitle>
            <DialogDescription>{variantDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {variantDialog?.variants.map((v) => (
              <Button key={v.id} variant="outline" className="justify-between h-auto py-3" onClick={() => addToCartDirect(variantDialog!, v)}>
                <div className="text-left">
                  <p className="font-medium">{v.name}</p>
                  {v.sku && <p className="text-xs text-muted-foreground">SKU: {v.sku}</p>}
                  {v.barcode && <p className="text-xs text-muted-foreground flex items-center gap-1"><Barcode className="h-3 w-3" />{v.barcode}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold">{curr} {v.price.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{v.quantity} in stock</p>
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
              {paymentMethod === "cash" && <><Banknote className="h-5 w-5" /> Cash Payment</>}
              {paymentMethod === "card" && <><CreditCard className="h-5 w-5" /> Card Payment</>}
              {paymentMethod === "split" && <><ArrowRightLeft className="h-5 w-5" /> Split Payment</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Due</p>
              <p className="text-3xl font-bold">{curr} {total.toFixed(2)}</p>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Amount Tendered</Label>
                  <Input
                    type="number" step="0.01" inputMode="decimal" value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="0.00" className="text-lg" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && parseFloat(amountTendered) >= total) handleCheckout(); }}
                  />
                </div>
                {change > 0 && (
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Change</p>
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
                  Exact Amount — {curr} {total.toFixed(2)}
                </Button>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="text-center py-4">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tap, insert, or swipe the card</p>
                <p className="text-xs text-muted-foreground mt-1">Press &quot;Complete Sale&quot; to process</p>
              </div>
            )}

            {paymentMethod === "split" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Split payment between cash and card</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Cash Amount</Label>
                    <Input type="number" step="0.01" inputMode="decimal" value={splitCash} onChange={(e) => { setSplitCash(e.target.value); setSplitCard(Math.max(0, total - (parseFloat(e.target.value) || 0)).toFixed(2)); }} placeholder="0.00" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Card Amount</Label>
                    <Input type="number" step="0.01" inputMode="decimal" value={splitCard} onChange={(e) => { setSplitCard(e.target.value); setSplitCash(Math.max(0, total - (parseFloat(e.target.value) || 0)).toFixed(2)); }} placeholder="0.00" />
                  </div>
                </div>
                {(() => {
                  const splitTotal = (parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0);
                  const diff = Math.abs(splitTotal - total);
                  return diff > 0.01
                    ? <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Split amounts must equal {curr} {total.toFixed(2)} (diff: {curr} {diff.toFixed(2)})</p>
                    : <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Split amounts match total</p>;
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCheckout}
              disabled={
                (paymentMethod === "cash" && (!amountTendered || parseFloat(amountTendered) < total)) ||
                (paymentMethod === "split" && Math.abs(((parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0)) - total) > 0.01)
              }
            >
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Held Sales Dialog ═══════════ */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Held Sales ({heldSales.length})</DialogTitle>
          </DialogHeader>
          {heldSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No held sales</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {heldSales.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.cart.length} items — {curr} {h.cart.reduce((s, i) => s + (i.variant ? i.variant.price : i.product.price) * i.quantity, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => recallSale(h)}>Recall</Button>
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
          <DialogHeader><DialogTitle>Add Custom Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Item Name</Label>
              <Input value={customItemName} onChange={(e) => setCustomItemName(e.target.value)} placeholder="e.g. Alterations" />
            </div>
            <div className="space-y-1.5">
              <Label>Price ({curr})</Label>
              <Input type="number" value={customItemPrice} onChange={(e) => setCustomItemPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomItemOpen(false)}>Cancel</Button>
            <Button onClick={addCustomItem} disabled={!customItemName || !customItemPrice}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Manual Barcode Dialog ═══════════ */}
      <Dialog open={manualBarcodeOpen} onOpenChange={setManualBarcodeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Barcode className="h-5 w-5" /> Manual Barcode Entry</DialogTitle>
            <DialogDescription>Type or paste a barcode, SKU, or QR code value</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={manualBarcodeValue}
              onChange={(e) => setManualBarcodeValue(e.target.value)}
              placeholder="Enter barcode or SKU…"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleManualBarcode(); }}
            />
            <p className="text-xs text-muted-foreground">Supports: EAN-13, UPC-A, Code 128, Code 39, QR codes</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualBarcodeOpen(false)}>Cancel</Button>
            <Button onClick={handleManualBarcode} disabled={!manualBarcodeValue.trim()}>
              <ScanLine className="h-4 w-4 mr-1.5" /> Look Up
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
              {posSession ? "Close Register" : "Open Register"}
            </DialogTitle>
            <DialogDescription>
              {posSession
                ? "Count your cash drawer and close the register for this session."
                : "Enter the opening cash float to start your POS session."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {posSession ? (
              <>
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opened</span>
                    <span>{new Date(posSession.openedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opening Balance</span>
                    <span>{curr} {Number(posSession.openingBalance).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Sales</span>
                    <span>{curr} {Number(posSession.totalSales).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Orders</span>
                    <span>{posSession.totalOrders}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Expected in Drawer</span>
                    <span>{curr} {(Number(posSession.openingBalance) + Number(posSession.totalSales)).toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Cash Count ({curr})</Label>
                  <Input type="number" step="0.01" inputMode="decimal" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="0.00" className="text-lg" autoFocus />
                  {closingBalance && (() => {
                    const expected = Number(posSession.openingBalance) + Number(posSession.totalSales);
                    const actual = parseFloat(closingBalance) || 0;
                    const variance = actual - expected;
                    return (
                      <p className={`text-xs mt-1 ${Math.abs(variance) > 0.01 ? "text-destructive" : "text-green-600"}`}>
                        {Math.abs(variance) <= 0.01 ? "✓ Cash matches expected amount" : `${variance > 0 ? "+" : ""}${curr} ${variance.toFixed(2)} variance`}
                      </p>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>Opening Cash Float ({curr})</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" className="text-lg" autoFocus />
                <p className="text-xs text-muted-foreground mt-1">Count the cash in your drawer before starting</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            {posSession ? (
              <Button onClick={closeRegister} disabled={!closingBalance} variant="destructive">
                <LogOut className="h-4 w-4 mr-1.5" /> Close Register
              </Button>
            ) : (
              <Button onClick={openRegister}>
                <LogIn className="h-4 w-4 mr-1.5" /> Open Register
              </Button>
            )}
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
