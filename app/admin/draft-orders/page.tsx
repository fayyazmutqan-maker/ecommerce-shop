"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FileCheck,
  Send,
  Loader2,
  Search,
  XCircle,
  Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface DraftItem {
  productId: string;
  variantId?: string | null;
  name: string;
  sku?: string | null;
  price: number;
  quantity: number;
  variantName?: string | null;
}

interface DraftOrder {
  id: string;
  draftNumber: string;
  customerId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  items: DraftItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  status: string;
  orderId?: string | null;
  createdBy: string;
  createdAt: string;
}

interface ProductResult {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  variants: { id: string; name: string; sku: string | null; price: number; quantity: number }[];
}

export default function DraftOrdersPage() {
  const t = useTranslations("admin.draftOrders");
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<DraftOrder | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerEmail, setFormCustomerEmail] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formShipping, setFormShipping] = useState(0);
  const [formDiscount, setFormDiscount] = useState(0);
  const [formItems, setFormItems] = useState<DraftItem[]>([]);

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const fetchDrafts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/draft-orders?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t("failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const searchProducts = async (query: string) => {
    setProductSearch(query);
    if (query.length < 2) { setProductResults([]); return; }

    setSearchingProducts(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProductResults(data.products || []);
    } catch {
      setProductResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const addItemFromProduct = (product: ProductResult, variant?: ProductResult["variants"][0]) => {
    const existing = formItems.findIndex(i =>
      i.productId === product.id && (variant ? i.variantId === variant.id : !i.variantId)
    );

    if (existing >= 0) {
      setFormItems(formItems.map((item, i) =>
        i === existing ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setFormItems([...formItems, {
        productId: product.id,
        variantId: variant?.id || null,
        name: product.name,
        sku: variant?.sku || product.sku || null,
        price: variant?.price || product.price,
        quantity: 1,
        variantName: variant?.name || null,
      }]);
    }
    setProductSearch("");
    setProductResults([]);
  };

  const updateItem = (idx: number, updates: Partial<DraftItem>) => {
    setFormItems(formItems.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const removeItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setFormCustomerName("");
    setFormCustomerEmail("");
    setFormCustomerPhone("");
    setFormNotes("");
    setFormShipping(0);
    setFormDiscount(0);
    setFormItems([]);
    setEditingDraft(null);
    setProductSearch("");
    setProductResults([]);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (draft: DraftOrder) => {
    setEditingDraft(draft);
    setFormCustomerName(draft.customerName || "");
    setFormCustomerEmail(draft.customerEmail || "");
    setFormCustomerPhone(draft.customerPhone || "");
    setFormNotes(draft.notes || "");
    setFormShipping(draft.shippingAmount);
    setFormDiscount(draft.discountAmount);
    setFormItems(draft.items);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (formItems.length === 0) { toast.error(t("addOneItem")); return; }

    setSaving(true);
    try {
      const body = {
        ...(editingDraft ? { id: editingDraft.id } : {}),
        customerName: formCustomerName.trim() || null,
        customerEmail: formCustomerEmail.trim() || null,
        customerPhone: formCustomerPhone.trim() || null,
        notes: formNotes.trim() || null,
        shippingAmount: formShipping,
        discountAmount: formDiscount,
        items: formItems,
      };

      const res = await fetch("/api/draft-orders", {
        method: editingDraft ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(editingDraft ? t("draftUpdated") : t("draftCreated"));
      setDialogOpen(false);
      resetForm();
      fetchDrafts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("failedSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (draft: DraftOrder) => {
    if (!confirm(t("confirmConvert", { number: draft.draftNumber }))) return;

    setConverting(draft.id);
    try {
      const res = await fetch("/api/draft-orders/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, paymentMethod: "cod" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert");

      toast.success(t("orderCreated", { number: data.orderNumber }));
      fetchDrafts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("failedConvert"));
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (draft: DraftOrder) => {
    if (!confirm(t("confirmDelete", { number: draft.draftNumber }))) return;
    try {
      const res = await fetch(`/api/draft-orders?id=${draft.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("draftDeleted"));
      fetchDrafts();
    } catch {
      toast.error(t("failedDelete"));
    }
  };

  const formSubtotal = formItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const formTax = formSubtotal * 0.15;
  const formTotal = Math.max(0, formSubtotal + formTax + formShipping - formDiscount);

  const statusBadge = (status: string) => {
    switch (status) {
      case "OPEN": return <Badge>{t("statusOpen")}</Badge>;
      case "INVOICE_SENT": return <Badge variant="outline" className="border-blue-500 text-blue-500">{t("statusInvoiceSent")}</Badge>;
      case "COMPLETED": return <Badge variant="outline" className="border-green-500 text-green-500">{t("statusCompleted")}</Badge>;
      case "CANCELLED": return <Badge variant="secondary">{t("statusCancelled")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-44" /><Skeleton className="h-4 w-80 mt-2" /></div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Card><CardContent className="pt-6"><div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[25%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[10%]" /></div>))}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t("createDraft")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchDrafts")}
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("draftNumber")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("items")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("createdBy")}</TableHead>
                <TableHead className="w-28">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="font-mono font-medium">{draft.draftNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{draft.customerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{draft.customerEmail || ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>{draft.items.length !== 1 ? t("itemsCount", { count: draft.items.length }) : t("itemCount", { count: draft.items.length })}</TableCell>
                  <TableCell className="font-medium">SAR {draft.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(draft.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{draft.createdBy}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {draft.status === "OPEN" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={t("convertToOrder")}
                            onClick={() => handleConvert(draft)}
                            disabled={converting === draft.id}
                          >
                            {converting === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(draft)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {draft.status !== "COMPLETED" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(draft)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {drafts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Send className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground">{t("noDrafts")}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDraft ? t("editDraft", { number: editingDraft.draftNumber }) : t("createDraftOrder")}</DialogTitle>
            <DialogDescription>
              {t("dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">{t("customerInfo")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("customerName")}</Label>
                  <Input placeholder={t("namePlaceholder")} value={formCustomerName} onChange={(e) => setFormCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("customerEmail")}</Label>
                  <Input type="email" placeholder={t("emailPlaceholder")} value={formCustomerEmail} onChange={(e) => setFormCustomerEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("customerPhone")}</Label>
                  <Input placeholder={t("phonePlaceholder")} value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> {t("lineItems")}
              </h4>

              {/* Product Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchProducts")}
                  className="pl-10"
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                />
                {searchingProducts && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}

                {productResults.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-60 overflow-y-auto">
                    <CardContent className="p-2">
                      {productResults.map((product) => (
                        <div key={product.id}>
                          {product.variants.length > 0 ? (
                            product.variants.map((variant) => (
                              <button
                                key={variant.id}
                                className="w-full flex items-center justify-between p-2 hover:bg-accent rounded text-left"
                                onClick={() => addItemFromProduct(product, variant)}
                              >
                                <div>
                                  <p className="text-sm font-medium">{product.name} — {variant.name}</p>
                                  <p className="text-xs text-muted-foreground">{variant.sku || product.sku || t("noSku")} · {t("stock", { count: variant.quantity })}</p>
                                </div>
                                <span className="text-sm font-medium">SAR {variant.price.toFixed(2)}</span>
                              </button>
                            ))
                          ) : (
                            <button
                              className="w-full flex items-center justify-between p-2 hover:bg-accent rounded text-left"
                              onClick={() => addItemFromProduct(product)}
                            >
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.sku || t("noSku")} · {t("stock", { count: product.quantity })}</p>
                              </div>
                              <span className="text-sm font-medium">SAR {product.price.toFixed(2)}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Item List */}
              {formItems.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("product")}</TableHead>
                      <TableHead className="w-24">{t("price")}</TableHead>
                      <TableHead className="w-24">{t("qty")}</TableHead>
                      <TableHead className="w-24">{t("total")}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <p className="font-medium text-sm">{item.name}</p>
                          {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" step="0.01" className="h-8 w-20" value={item.price} onChange={(e) => updateItem(idx, { price: parseFloat(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="1" className="h-8 w-16" value={item.quantity} onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                        </TableCell>
                        <TableCell className="font-medium">SAR {(item.price * item.quantity).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("noItems")}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Adjustments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t("shippingSar")}</Label>
                <Input type="number" min="0" step="0.01" value={formShipping} onChange={(e) => setFormShipping(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("discountSar")}</Label>
                <Input type="number" min="0" step="0.01" value={formDiscount} onChange={(e) => setFormDiscount(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-xs">{t("notes")}</Label>
              <Textarea placeholder={t("notesPlaceholder")} rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>

            {/* Totals */}
            <Card className="shadow-none bg-accent/30">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>SAR {formSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("vat15")}</span>
                  <span>SAR {formTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("shipping")}</span>
                  <span>SAR {formShipping.toFixed(2)}</span>
                </div>
                {formDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t("discount")}</span>
                    <span>-SAR {formDiscount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("total")}</span>
                  <span>SAR {formTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingDraft ? t("updateDraft") : t("createDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
