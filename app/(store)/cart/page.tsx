"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } =
    useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    discount: number;
  } | null>(null);

  const subtotal = getTotal();

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid coupon code");
        return;
      }
      setAppliedCoupon({
        code: data.coupon.code,
        type: data.coupon.type,
        discount: data.discount,
      });
      toast.success(`Coupon "${data.coupon.code}" applied! You save SAR ${data.discount.toFixed(2)}`);
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
  }

  const displayTotal = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discount) : subtotal;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-28 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mx-auto mb-6" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Your cart is empty
        </h1>
        <p className="text-muted-foreground text-base mb-8 max-w-sm mx-auto">
          Looks like you haven&apos;t added any products to your cart yet.
        </p>
        <Button className="h-12 px-8 text-[15px]" asChild>
          <Link href="/products">
            Continue Shopping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Cart</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight mb-10">
        Shopping Cart
        <span className="text-muted-foreground font-normal text-lg ml-3">
          ({getItemCount()} {getItemCount() === 1 ? "item" : "items"})
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="shadow-none border">
              <CardContent className="p-5 flex gap-5">
                <div className="h-28 w-28 rounded-lg bg-accent/50 overflow-hidden flex-shrink-0 relative">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-[15px]">{item.name}</h3>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-sm font-bold mt-1.5">
                        SAR {item.price.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-r-none"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-12 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-l-none"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="font-bold text-[15px]">
                      SAR {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-between items-center pt-4">
            <Button variant="outline" className="h-11 px-6" asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive h-11"
              onClick={clearCart}
            >
              Clear Cart
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-28 shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({getItemCount()} items)
                  </span>
                  <span className="font-medium">SAR {getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium text-foreground">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-muted-foreground">
                    Calculated at checkout
                  </span>
                </div>
              </div>

              <Separator />

              {/* Coupon */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-accent/50 rounded-lg px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{appliedCoupon.code}</span>
                    <span className="text-muted-foreground ml-2">
                      -SAR {appliedCoupon.discount.toFixed(2)}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeCoupon}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    className="h-10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  />
                  <Button
                    variant="outline"
                    className="h-10 px-5 flex-shrink-0"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>SAR {displayTotal.toFixed(2)}</span>
              </div>

              <Button className="w-full h-12 text-[15px] font-semibold" asChild>
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
