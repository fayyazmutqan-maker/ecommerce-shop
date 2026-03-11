"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck, Lock, Banknote, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import { PhoneInputField } from "@/components/ui/phone-input";

interface PaymentSettings {
  tapEnabled: boolean;
  codEnabled: boolean;
}

interface ShippingRateOption {
  id: string;
  zoneId: string;
  zoneName: string;
  name: string;
  type: string;
  price: number;
  estimatedDays: string | null;
}

interface AutoDiscountApplied {
  id: string;
  name: string;
  type: string;
  savedAmount: number;
  description: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"tap" | "cod">("cod");
  const [selectedShippingRate, setSelectedShippingRate] = useState<string>("");
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [region, setRegion] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [autoDiscounts, setAutoDiscounts] = useState<AutoDiscountApplied[]>([]);
  const [autoDiscountTotal, setAutoDiscountTotal] = useState(0);
  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponFreeShipping, setCouponFreeShipping] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
  });
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    tapEnabled: false,
    codEnabled: true,
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch payment settings to know which methods are available
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const settings: PaymentSettings = {
            tapEnabled: data.tapEnabled ?? false,
            codEnabled: data.codEnabled ?? true,
          };
          setPaymentSettings(settings);
          // Default to Tap if enabled, otherwise COD
          if (settings.tapEnabled) {
            setPaymentMethod("tap");
          } else {
            setPaymentMethod("cod");
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch shipping rates when region changes
  useEffect(() => {
    if (!region) return;
    setLoadingShipping(true);
    const totalWeight = items.reduce((s, i) => s + (i.quantity * 0.5), 0);
    fetch("/api/shipping-zones/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: "Saudi Arabia", region, totalWeight, orderAmount: getTotal() }),
    })
      .then((res) => res.json())
      .then((data) => {
        const rates: ShippingRateOption[] = data.rates || [];
        setShippingRates(rates);
        if (rates.length > 0) {
          setSelectedShippingRate(rates[0].id);
        }
      })
      .catch(() => setShippingRates([]))
      .finally(() => setLoadingShipping(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Evaluate auto discounts
  useEffect(() => {
    if (items.length === 0) return;
    fetch("/api/auto-discounts/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: (i as unknown as Record<string, string>).productId || i.id, variantId: (i as unknown as Record<string, string>).variantId, name: i.name, price: i.price, quantity: i.quantity })),
        orderAmount: getTotal(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAutoDiscounts(data.discounts || []);
        setAutoDiscountTotal(data.totalSaved || 0);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-28 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          No items to checkout
        </h1>
        <p className="text-muted-foreground text-base mb-8">
          Add products to your cart first.
        </p>
        <Button className="h-12 px-8" asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const subtotal = getTotal();
  const selectedRate = shippingRates.find((r) => r.id === selectedShippingRate);
  const shipping = couponFreeShipping ? 0 : (selectedRate?.price ?? 0);
  const tax = subtotal * 0.15;
  const total = Math.max(0, subtotal + shipping + tax - autoDiscountTotal - couponDiscount);

  // ── Coupon validation handler ──
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon");
        setCouponDiscount(0);
        setCouponFreeShipping(false);
        setAppliedCoupon(null);
        return;
      }
      setCouponDiscount(data.discountAmount || 0);
      setCouponFreeShipping(data.freeShipping || false);
      setAppliedCoupon(data.coupon.code);
      toast.success(`Coupon "${data.coupon.code}" applied!`);
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponFreeShipping(false);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handlePlaceOrder = async () => {
    setErrors({});
    
    const { email, firstName, lastName, address1, address2, city, postalCode } = form;

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email";
    if (!firstName) newErrors.firstName = "First name is required";
    if (!lastName) newErrors.lastName = "Last name is required";
    if (!address1) newErrors.address1 = "Address is required";
    if (!city) newErrors.city = "City is required";
    if (!region) newErrors.region = "Region is required";
    if (!postalCode) newErrors.postalCode = "Postal code is required";
    if (!agreeTerms) newErrors.terms = "You must agree to the terms and conditions";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone || undefined,
          items: items.map((item) => ({
            productId: item.productId || item.id,
            variantId: item.variantId || null,
            quantity: item.quantity,
          })),
          shippingAddress: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            address1: address1.trim(),
            address2: address2?.trim() || undefined,
            city: city.trim(),
            state: region,
            postalCode: postalCode.trim(),
            country: "Saudi Arabia",
            phone: phone || undefined,
          },
          shippingMethod: selectedRate?.name || "Standard",
          paymentMethod,
          couponCode: appliedCoupon || undefined,
          shippingRateId: selectedShippingRate || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to place order");
        setLoading(false);
        return;
      }

      // If payment method is Tap, create a charge and redirect
      if (paymentMethod === "tap") {
        const chargeRes = await fetch("/api/payments/create-charge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId, email: form.email.trim() }),
        });

        const chargeData = await chargeRes.json();

        if (!chargeRes.ok) {
          // Charge creation failed but order exists — tell user to retry
          toast.error(
            chargeData.error || "Failed to initiate payment. Your order has been saved — you can retry payment later."
          );
          clearCart();
          router.push(`/order-confirmation?order=${data.orderNumber}&status=failed`);
          return;
        }

        // Redirect to Tap payment page
        clearCart();
        window.location.href = chargeData.paymentUrl;
        return;
      }

      // COD flow — go directly to confirmation
      clearCart();
      toast.success(`Order ${data.orderNumber} placed successfully!`);
      router.push(`/order-confirmation?order=${data.orderNumber}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex items-center gap-3 mb-10">
        <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
          <Link href="/cart">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="h-11"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    required
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </Label>
                  <PhoneInputField
                    value={phone}
                    onChange={setPhone}
                    id="phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </Label>
                  <Input id="firstName" placeholder="Mohammed" className="h-11" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} required />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <Input id="lastName" placeholder="Al-Salem" className="h-11" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} required />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address1" className="text-sm font-medium">
                  Address
                </Label>
                <Input
                  id="address1"
                  placeholder="King Fahd Road, Building 12"
                  className="h-11"
                  value={form.address1}
                  onChange={(e) => updateForm("address1", e.target.value)}
                  required
                />
                {errors.address1 && <p className="text-xs text-destructive">{errors.address1}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2" className="text-sm font-medium">
                  Apartment, suite, etc.
                </Label>
                <Input id="address2" placeholder="Floor 3, Office 301" className="h-11" value={form.address2} onChange={(e) => updateForm("address2", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">
                    City
                  </Label>
                  <Input id="city" placeholder="Riyadh" className="h-11" value={form.city} onChange={(e) => updateForm("city", e.target.value)} required />
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm font-medium">
                    Region
                  </Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Riyadh">Riyadh</SelectItem>
                      <SelectItem value="Makkah">Makkah</SelectItem>
                      <SelectItem value="Madinah">Madinah</SelectItem>
                      <SelectItem value="Eastern Province">Eastern Province</SelectItem>
                      <SelectItem value="Asir">Asir</SelectItem>
                      <SelectItem value="Tabuk">Tabuk</SelectItem>
                      <SelectItem value="Hail">Hail</SelectItem>
                      <SelectItem value="Northern Borders">Northern Borders</SelectItem>
                      <SelectItem value="Jazan">Jazan</SelectItem>
                      <SelectItem value="Najran">Najran</SelectItem>
                      <SelectItem value="Al Baha">Al Baha</SelectItem>
                      <SelectItem value="Al Jawf">Al Jawf</SelectItem>
                      <SelectItem value="Qassim">Qassim</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.region && <p className="text-xs text-destructive">{errors.region}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-sm font-medium">
                    Postal Code
                  </Label>
                  <Input id="postalCode" placeholder="12345" className="h-11" value={form.postalCode} onChange={(e) => updateForm("postalCode", e.target.value)} required />
                  {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Country</Label>
                <Input value="Saudi Arabia" disabled className="h-11 bg-muted" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="sameAsBilling" defaultChecked />
                <Label
                  htmlFor="sameAsBilling"
                  className="text-sm text-muted-foreground"
                >
                  Billing address is the same as shipping
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Method */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                Shipping Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!region && (
                <p className="text-sm text-muted-foreground py-4 text-center">Select your region above to see available shipping options.</p>
              )}
              {region && loadingShipping && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {region && !loadingShipping && shippingRates.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No shipping options available for your region. Standard rate will be applied.</p>
              )}
              {shippingRates.map((rate) => (
                <label
                  key={rate.id}
                  className={`flex items-center justify-between border-2 rounded-lg p-4 cursor-pointer transition-colors ${selectedShippingRate === rate.id ? "border-foreground bg-accent/50" : "border-border hover:bg-accent/30"}`}
                  onClick={() => setSelectedShippingRate(rate.id)}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShippingRate === rate.id}
                      onChange={() => setSelectedShippingRate(rate.id)}
                      className="accent-foreground h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-semibold">{rate.name}</p>
                      {rate.estimatedDays && (
                        <p className="text-xs text-muted-foreground mt-0.5">{rate.estimatedDays}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {rate.price === 0 ? "Free" : `SAR ${rate.price.toFixed(2)}`}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Auto Discounts Applied */}
          {autoDiscounts.length > 0 && (
            <Card className="shadow-none border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Tag className="h-4 w-4" /> Automatic Discounts Applied
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {autoDiscounts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">{d.name}</p>
                      <p className="text-xs text-green-600/70 dark:text-green-500/70">{d.description}</p>
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-400">-SAR {d.savedAmount.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Method
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Lock className="h-3 w-3" /> Secure 256-bit SSL encryption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tap Payments — Online Payment */}
              {paymentSettings.tapEnabled && (
                <label
                  className={`flex items-center justify-between border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === "tap"
                      ? "border-foreground bg-accent/50"
                      : "border-border hover:bg-accent/30"
                  }`}
                  onClick={() => setPaymentMethod("tap")}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="tap"
                      checked={paymentMethod === "tap"}
                      onChange={() => setPaymentMethod("tap")}
                      className="accent-foreground h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-semibold">Online Payment</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Visa, Mastercard, mada, Apple Pay, STC Pay
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">Secure</span>
                  </div>
                </label>
              )}

              {/* Cash on Delivery */}
              {paymentSettings.codEnabled && (
                <label
                  className={`flex items-center justify-between border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === "cod"
                      ? "border-foreground bg-accent/50"
                      : "border-border hover:bg-accent/30"
                  }`}
                  onClick={() => setPaymentMethod("cod")}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="accent-foreground h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-semibold">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pay when your order is delivered
                      </p>
                    </div>
                  </div>
                  <Banknote className="h-5 w-5 text-muted-foreground" />
                </label>
              )}

              {/* If Tap is selected, show what will happen */}
              {paymentMethod === "tap" && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    You will be redirected to a secure payment page to complete your purchase.
                  </p>
                </div>
              )}

              {/* No payment methods available */}
              {!paymentSettings.tapEnabled && !paymentSettings.codEnabled && (
                <div className="flex items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg bg-accent/30">
                  <p className="text-sm text-muted-foreground">
                    No payment methods available. Please contact the store.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <Card className="sticky top-28 shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-16 w-16 rounded-lg bg-accent/50 overflow-hidden flex-shrink-0 relative">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                      <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        SAR {item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0">
                      SAR {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">SAR {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping{selectedRate ? ` (${selectedRate.name})` : ""}</span>
                  <span className="font-medium">
                    {shipping === 0 ? "Free" : `SAR ${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (15%)</span>
                  <span className="font-medium">SAR {tax.toFixed(2)}</span>
                </div>
                {autoDiscountTotal > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Auto Discounts</span>
                    <span className="font-medium">-SAR {autoDiscountTotal.toFixed(2)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Coupon ({appliedCoupon})</span>
                    <span className="font-medium">-SAR {couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {couponFreeShipping && !couponDiscount && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Coupon ({appliedCoupon})</span>
                    <span className="font-medium">Free Shipping</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Coupon Code Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Coupon Code
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">{appliedCoupon}</span>
                    <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="h-7 text-xs text-red-600 hover:text-red-700">
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      className="h-10 uppercase"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                    <Button variant="outline" className="h-10 px-4" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>SAR {total.toFixed(2)}</span>
              </div>

              <Button
                className="w-full h-12 text-[15px] font-semibold"
                onClick={handlePlaceOrder}
                disabled={loading || (!paymentSettings.tapEnabled && !paymentSettings.codEnabled)}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : paymentMethod === "tap" ? (
                  `Pay SAR ${total.toFixed(2)}`
                ) : (
                  `Place Order — SAR ${total.toFixed(2)}`
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure checkout powered by ShopFlow
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <Checkbox id="agreeTerms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} className="mt-0.5" />
                <Label htmlFor="agreeTerms" className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/pages/terms" className="underline hover:text-foreground">Terms &amp; Conditions</Link>{" "}and{" "}
                  <Link href="/pages/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
                </Label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                All prices are in Saudi Riyal (SAR) and include VAT as per ZATCA regulations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
