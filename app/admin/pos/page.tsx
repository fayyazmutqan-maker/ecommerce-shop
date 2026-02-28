"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  X,
  ShoppingBag,
  Barcode,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface PosProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  quantity: number;
  image: string | null;
  category: string | null;
}

interface CartItem {
  product: PosProduct;
  quantity: number;
  discount: number;
}

export default function PosPage() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [processing, setProcessing] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?status=ACTIVE");
      const data = await res.json();
      const mapped = (data.products || data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        price: p.price,
        quantity: p.quantity,
        image: p.images?.[0]?.url || null,
        category: p.categories?.[0]?.category?.name || null,
      }));
      setProducts(mapped);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
  }, [products, search]);

  function addToCart(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, quantity: qty } : i
        )
      );
    }
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const taxRate = 0.15;
  const tax = subtotal * taxRate;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + tax - discountAmount;
  const change =
    paymentMethod === "cash" && amountTendered
      ? parseFloat(amountTendered) - total
      : 0;

  async function handleCheckout() {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const orderPayload = {
        email: customerEmail || "pos@store.local",
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        shippingAddress: {
          firstName: "POS",
          lastName: "Customer",
          address1: "In-Store",
          city: "Riyadh",
          postalCode: "00000",
          country: "Saudi Arabia",
        },
        paymentMethod: paymentMethod === "cash" ? "cod" : "tap",
        notes: `POS Sale — ${paymentMethod === "cash" ? "Cash" : "Card"} payment${discount > 0 ? ` (${discount}% discount)` : ""}`,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }

      const order = await res.json();
      toast.success("Transaction completed!", {
        description: `Order ${order.orderNumber} — SAR ${total.toFixed(2)} — ${paymentMethod === "cash" ? "Cash" : "Card"} payment`,
      });
      setCart([]);
      setPaymentOpen(false);
      setAmountTendered("");
      setDiscount(0);
      setCustomerEmail("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Product Grid - Left */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title="Scan barcode">
            <Barcode className="h-4 w-4" />
          </Button>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4">
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
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-square bg-muted relative">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                          No Image
                        </div>
                      )}
                      {product.quantity <= 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute top-1 right-1 text-[10px]"
                        >
                          Out
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium line-clamp-1">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold">
                          SAR {product.price.toFixed(2)}
                        </span>
                        {product.sku && (
                          <span className="text-[10px] text-muted-foreground">
                            {product.sku}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Cart - Right */}
      <div className="w-[380px] border-l flex flex-col bg-card">
        {/* Cart Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Current Sale
          </h2>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive"
              onClick={() => setCart([])}
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Customer */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Customer email (optional)"
              className="h-8 text-sm"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items in cart</p>
              <p className="text-xs mt-1">Click products to add them</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SAR {item.product.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        updateCartQty(item.product.id, item.quantity - 1)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        updateCartQty(item.product.id, item.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">
                    SAR {(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Discount %"
                className="h-8 text-sm w-24"
                value={discount || ""}
                onChange={(e) =>
                  setDiscount(Math.min(100, Math.max(0, +e.target.value)))
                }
              />
              <span className="text-xs text-muted-foreground">% off</span>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>SAR {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discount}%)</span>
                  <span>-SAR {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span>SAR {tax.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>SAR {total.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setPaymentMethod("cash");
                  setPaymentOpen(true);
                }}
              >
                <Banknote className="h-4 w-4 mr-1.5" />
                Cash
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  setPaymentMethod("card");
                  setPaymentOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Card
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentMethod === "cash" ? "Cash Payment" : "Card Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Due</p>
              <p className="text-3xl font-bold">SAR {total.toFixed(2)}</p>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label>Amount Tendered</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                  autoFocus
                />
                {change > 0 && (
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p className="text-2xl font-bold text-green-600">
                      SAR {change.toFixed(2)}
                    </p>
                  </div>
                )}
                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    Math.ceil(total),
                    Math.ceil(total / 5) * 5,
                    Math.ceil(total / 10) * 10,
                    Math.ceil(total / 20) * 20,
                  ]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .slice(0, 4)
                    .map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setAmountTendered(amount.toFixed(2))
                        }
                      >
                        SAR {amount}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="text-center py-4">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Tap, insert, or swipe the card
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={
                processing ||
                (paymentMethod === "cash" &&
                  (!amountTendered || parseFloat(amountTendered) < total))
              }
            >
              {processing ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
