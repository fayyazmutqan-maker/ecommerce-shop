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
import { isValidPhoneNumber } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import { useTranslations } from "next-intl";
import { shouldUseUnoptimizedImage } from "@/lib/image";

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

const CHECKOUT_COUNTRIES = [
  {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    labelKey: "countrySaudiArabia",
    cityPlaceholder: "Riyadh",
    postalCodePlaceholder: "12345",
    regions: [
      { name: "Riyadh", cities: ["Riyadh", "Al Kharj", "Diriyah", "Dawadmi", "Majmaah", "Wadi ad-Dawasir"] },
      { name: "Makkah", cities: ["Makkah", "Jeddah", "Taif", "Rabigh", "Al Qunfudhah", "Al Lith"] },
      { name: "Madinah", cities: ["Madinah", "Yanbu", "Al Ula", "Badr", "Khaybar"] },
      { name: "Eastern Province", cities: ["Dammam", "Khobar", "Dhahran", "Al Ahsa", "Jubail", "Qatif", "Hafar Al Batin"] },
      { name: "Asir", cities: ["Abha", "Khamis Mushait", "Bisha", "Muhayil", "Sarat Abidah"] },
      { name: "Tabuk", cities: ["Tabuk", "Tayma", "Duba", "Umluj", "Al Wajh"] },
      { name: "Hail", cities: ["Hail", "Baqaa", "Al Ghazalah", "Shinan"] },
      { name: "Northern Borders", cities: ["Arar", "Rafha", "Turaif", "Al Uwayqilah"] },
      { name: "Jazan", cities: ["Jazan", "Sabya", "Abu Arish", "Samtah", "Farasan"] },
      { name: "Najran", cities: ["Najran", "Sharurah", "Hubuna", "Badr Al Janub"] },
      { name: "Al Baha", cities: ["Al Baha", "Baljurashi", "Al Mandaq", "Al Makhwah"] },
      { name: "Al Jawf", cities: ["Sakaka", "Qurayyat", "Dumat Al Jandal", "Tabarjal"] },
      { name: "Qassim", cities: ["Buraydah", "Unaizah", "Ar Rass", "Al Mithnab", "Al Bukayriyah"] },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    labelKey: "countryUnitedArabEmirates",
    cityPlaceholder: "Dubai",
    postalCodePlaceholder: "00000",
    regions: [
      { name: "Abu Dhabi", cities: ["Abu Dhabi", "Al Ain", "Madinat Zayed", "Ruwais", "Liwa"] },
      { name: "Dubai", cities: ["Dubai", "Jebel Ali", "Hatta"] },
      { name: "Sharjah", cities: ["Sharjah", "Khor Fakkan", "Kalba", "Dibba Al Hisn", "Al Dhaid"] },
      { name: "Ajman", cities: ["Ajman", "Masfout", "Manama"] },
      { name: "Umm Al Quwain", cities: ["Umm Al Quwain", "Falaj Al Mualla"] },
      { name: "Ras Al Khaimah", cities: ["Ras Al Khaimah", "Al Rams", "Digdaga", "Khatt"] },
      { name: "Fujairah", cities: ["Fujairah", "Dibba Al Fujairah", "Masafi", "Mirbah"] },
    ],
  },
] as const;

type CheckoutCountryCode = (typeof CHECKOUT_COUNTRIES)[number]["code"];
const CHECKOUT_PHONE_COUNTRIES: CheckoutCountryCode[] = ["SA", "AE"];

export default function CheckoutPage() {
  const t = useTranslations("checkoutPage");
  const tCommon = useTranslations("common");
  const tCheckout = useTranslations("checkout");
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"tap" | "cod">("cod");
  const [selectedShippingRate, setSelectedShippingRate] = useState<string>("");
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [country, setCountry] = useState<CheckoutCountryCode>("SA");
  const [region, setRegion] = useState("");
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingCountry, setBillingCountry] = useState<CheckoutCountryCode>("SA");
  const [billingRegion, setBillingRegion] = useState("");
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
  const [billingForm, setBillingForm] = useState({
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

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const updateBillingForm = (field: string, value: string) => {
    setBillingForm((prev) => ({ ...prev, [field]: value }));
    clearError(`billing.${field}`);
  };

  const selectedCountry = CHECKOUT_COUNTRIES.find((option) => option.code === country) ?? CHECKOUT_COUNTRIES[0];
  const selectedBillingCountry = CHECKOUT_COUNTRIES.find((option) => option.code === billingCountry) ?? CHECKOUT_COUNTRIES[0];
  const selectedRegion = selectedCountry.regions.find((option) => option.name === region);
  const selectedBillingRegion = selectedBillingCountry.regions.find((option) => option.name === billingRegion);
  const checkoutCurrency = selectedCountry.currency;
  const formatCheckoutCurrency = (amount: number) => `${checkoutCurrency} ${amount.toFixed(2)}`;

  const syncCheckoutCountry = (value: string, options: { clearPhone: boolean }) => {
    const nextCountry = CHECKOUT_COUNTRIES.find((option) => option.code === value);
    if (!nextCountry) return;
    setCountry(nextCountry.code);
    setRegion("");
    setForm((prev) => ({ ...prev, city: "" }));
    setShippingRates([]);
    setSelectedShippingRate("");
    if (options.clearPhone) setPhone(undefined);
  };

  const handleCountryChange = (value: string) => {
    syncCheckoutCountry(value, { clearPhone: true });
    clearError("country");
  };

  const handlePhoneCountryChange = (value?: Country) => {
    if (!value || !CHECKOUT_PHONE_COUNTRIES.includes(value as CheckoutCountryCode)) return;
    if (value === country) return;
    syncCheckoutCountry(value, { clearPhone: false });
  };

  const handleRegionChange = (value: string) => {
    setRegion(value);
    setForm((prev) => ({ ...prev, city: "" }));
    clearError("region");
    clearError("city");
    clearError("shipping");
  };

  const handleBillingCountryChange = (value: string) => {
    const nextCountry = CHECKOUT_COUNTRIES.find((option) => option.code === value);
    if (!nextCountry) return;
    setBillingCountry(nextCountry.code);
    setBillingRegion("");
    setBillingForm((prev) => ({ ...prev, city: "" }));
    clearError("billing.country");
  };

  const handleBillingRegionChange = (value: string) => {
    setBillingRegion(value);
    setBillingForm((prev) => ({ ...prev, city: "" }));
    clearError("billing.region");
    clearError("billing.city");
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
    if (!country || !region) {
      setShippingRates([]);
      setSelectedShippingRate("");
      return;
    }
    setLoadingShipping(true);
    setSelectedShippingRate("");
    const totalWeight = items.reduce((s, i) => s + (i.quantity * 0.5), 0);
    fetch("/api/shipping-zones/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, region, totalWeight, orderAmount: getTotal() }),
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
  }, [country, region]);

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
          {t("noItems")}
        </h1>
        <p className="text-muted-foreground text-base mb-8">
          {t("addProductsFirst")}
        </p>
        <Button className="h-12 px-8" asChild>
          <Link href="/products">{tCommon("browseProducts")}</Link>
        </Button>
      </div>
    );
  }

  const subtotal = getTotal();
  const selectedRate = shippingRates.find((r) => r.id === selectedShippingRate);
  const shipping = couponFreeShipping ? 0 : (selectedRate?.price ?? 0);
  const tax = subtotal * 0.15;
  const total = Math.max(0, subtotal + shipping + tax - autoDiscountTotal - couponDiscount);
  const shippingSelectionRequired = Boolean(country && region && !loadingShipping);
  const hasAvailableShipping = shippingRates.length > 0 && Boolean(selectedRate);
  const canPlaceOrder =
    !loading &&
    !loadingShipping &&
    (!shippingSelectionRequired || hasAvailableShipping) &&
    (paymentSettings.tapEnabled || paymentSettings.codEnabled);

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
        setCouponError(data.error || t("invalidCoupon"));
        setCouponDiscount(0);
        setCouponFreeShipping(false);
        setAppliedCoupon(null);
        return;
      }
      const discountAmount = data.discountAmount || 0;
      setCouponDiscount(discountAmount);
      setCouponFreeShipping(data.freeShipping || false);
      setAppliedCoupon(data.coupon.code);
      toast.success(
        data.freeShipping && discountAmount <= 0
          ? t("couponFreeShippingApplied", { code: data.coupon.code })
          : t("couponApplied", { code: data.coupon.code, currency: checkoutCurrency, amount: discountAmount.toFixed(2) }),
      );
    } catch {
      setCouponError(t("failedValidateCoupon"));
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
    const trimmedForm = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address1: address1.trim(),
      address2: address2.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
    };
    const trimmedBillingForm = {
      firstName: billingForm.firstName.trim(),
      lastName: billingForm.lastName.trim(),
      address1: billingForm.address1.trim(),
      address2: billingForm.address2.trim(),
      city: billingForm.city.trim(),
      postalCode: billingForm.postalCode.trim(),
    };

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!trimmedForm.email) newErrors.email = t("emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedForm.email)) newErrors.email = t("invalidEmail");
    if (!phone || !isValidPhoneNumber(phone)) newErrors.phone = t("phoneRequired");
    if (!trimmedForm.firstName) newErrors.firstName = t("firstNameRequired");
    if (!trimmedForm.lastName) newErrors.lastName = t("lastNameRequired");
    if (!trimmedForm.address1) newErrors.address1 = t("addressRequired");
    if (!trimmedForm.city) newErrors.city = t("cityRequired");
    else if (!selectedRegion?.cities.some((cityOption) => cityOption === trimmedForm.city)) newErrors.city = t("cityRequired");
    if (!country) newErrors.country = t("countryRequired");
    if (!region) newErrors.region = t("regionRequired");
    if (shippingSelectionRequired && !hasAvailableShipping) newErrors.shipping = t("shippingRequired");
    if (!trimmedForm.postalCode) newErrors.postalCode = t("postalCodeRequired");
    if (!billingSameAsShipping) {
      if (!trimmedBillingForm.firstName) newErrors["billing.firstName"] = t("firstNameRequired");
      if (!trimmedBillingForm.lastName) newErrors["billing.lastName"] = t("lastNameRequired");
      if (!trimmedBillingForm.address1) newErrors["billing.address1"] = t("addressRequired");
      if (!trimmedBillingForm.city) newErrors["billing.city"] = t("cityRequired");
      else if (!selectedBillingRegion?.cities.some((cityOption) => cityOption === trimmedBillingForm.city)) newErrors["billing.city"] = t("cityRequired");
      if (!billingCountry) newErrors["billing.country"] = t("countryRequired");
      if (!billingRegion) newErrors["billing.region"] = t("regionRequired");
      if (!trimmedBillingForm.postalCode) newErrors["billing.postalCode"] = t("postalCodeRequired");
    }
    if (!agreeTerms) newErrors.terms = t("agreeTermsRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(t("fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedForm.email,
          phone: phone || undefined,
          items: items.map((item) => ({
            productId: item.productId || item.id,
            variantId: item.variantId || null,
            quantity: item.quantity,
          })),
          shippingAddress: {
            firstName: trimmedForm.firstName,
            lastName: trimmedForm.lastName,
            address1: trimmedForm.address1,
            address2: trimmedForm.address2 || undefined,
            city: trimmedForm.city,
            state: region,
            postalCode: trimmedForm.postalCode,
            country: selectedCountry.name,
            phone: phone || undefined,
          },
          billingAddress: billingSameAsShipping ? undefined : {
            firstName: trimmedBillingForm.firstName,
            lastName: trimmedBillingForm.lastName,
            address1: trimmedBillingForm.address1,
            address2: trimmedBillingForm.address2 || undefined,
            city: trimmedBillingForm.city,
            state: billingRegion,
            postalCode: trimmedBillingForm.postalCode,
            country: selectedBillingCountry.name,
            phone: phone || undefined,
          },
          shippingMethod: selectedRate?.name || "Standard",
          paymentMethod,
          currency: checkoutCurrency,
          couponCode: appliedCoupon || undefined,
          shippingRateId: selectedShippingRate || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || t("failedPlaceOrder"));
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
            chargeData.error || t("failedPayment")
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
      toast.success(t("orderPlaced", { orderNumber: data.orderNumber }));
      router.push(`/order-confirmation?order=${data.orderNumber}`);
    } catch {
      toast.error(tCommon("error"));
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
        <h1 className="text-3xl font-bold tracking-tight">{tCheckout("title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                {tCheckout("contactInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    {tCheckout("email")}
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="your@email.com"
                    className="h-11"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    required
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    {tCheckout("phone")}
                  </Label>
                  <PhoneInputField
                    key={country}
                    value={phone}
                    onChange={(value) => {
                      setPhone(value);
                      clearError("phone");
                    }}
                    defaultCountry={country}
                    countries={CHECKOUT_PHONE_COUNTRIES}
                    onCountryChange={handlePhoneCountryChange}
                    placeholder={country === "AE" ? "+971 5X XXX XXXX" : "+966 5X XXX XXXX"}
                    id="phone"
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                {tCheckout("shippingAddress")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    {tCheckout("firstName")}
                  </Label>
                  <Input id="firstName" name="given-name" autoComplete="given-name" placeholder="Mohammed" className="h-11" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} aria-invalid={Boolean(errors.firstName)} required />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    {tCheckout("lastName")}
                  </Label>
                  <Input id="lastName" name="family-name" autoComplete="family-name" placeholder="Al-Salem" className="h-11" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} aria-invalid={Boolean(errors.lastName)} required />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address1" className="text-sm font-medium">
                  {tCheckout("address")}
                </Label>
                <Input
                  id="address1"
                  name="address-line1"
                  autoComplete="address-line1"
                  placeholder="King Fahd Road, Building 12"
                  className="h-11"
                  value={form.address1}
                  onChange={(e) => updateForm("address1", e.target.value)}
                  aria-invalid={Boolean(errors.address1)}
                  required
                />
                {errors.address1 && <p className="text-xs text-destructive">{errors.address1}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2" className="text-sm font-medium">
                  {t("apartment")}
                </Label>
                <Input id="address2" name="address-line2" autoComplete="address-line2" placeholder="Floor 3, Office 301" className="h-11" value={form.address2} onChange={(e) => updateForm("address2", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="country" className="text-sm font-medium">{tCheckout("country")}</Label>
                  <Select value={country} onValueChange={handleCountryChange}>
                    <SelectTrigger id="country" size="lg" className="w-full">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECKOUT_COUNTRIES.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm font-medium">
                    {t("region")}
                  </Label>
                  <Select value={region} onValueChange={handleRegionChange}>
                    <SelectTrigger id="region" size="lg" className="w-full">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry.regions.map((option) => (
                        <SelectItem key={option.name} value={option.name}>{option.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.region && <p className="text-xs text-destructive">{errors.region}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium">
                    {tCheckout("city")}
                  </Label>
                  <Select
                    value={form.city}
                    onValueChange={(value) => updateForm("city", value)}
                    disabled={!selectedRegion}
                  >
                    <SelectTrigger id="city" size="lg" className="w-full" aria-invalid={Boolean(errors.city)}>
                      <SelectValue placeholder={selectedRegion ? t("select") : t("region")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedRegion?.cities ?? []).map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-sm font-medium">
                    {tCheckout("postalCode")}
                  </Label>
                  <Input id="postalCode" name="postal-code" autoComplete="postal-code" inputMode="numeric" placeholder={selectedCountry.postalCodePlaceholder} className="h-11" value={form.postalCode} onChange={(e) => updateForm("postalCode", e.target.value)} aria-invalid={Boolean(errors.postalCode)} required />
                  {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="sameAsBilling"
                  checked={billingSameAsShipping}
                  onCheckedChange={(value) => setBillingSameAsShipping(value === true)}
                />
                <Label
                  htmlFor="sameAsBilling"
                  className="text-sm text-muted-foreground"
                >
                  {t("billingShippingSame")}
                </Label>
              </div>
              {!billingSameAsShipping && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold">{tCheckout("billingAddress")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingFirstName" className="text-sm font-medium">
                        {tCheckout("firstName")}
                      </Label>
                      <Input id="billingFirstName" autoComplete="billing given-name" placeholder="Mohammed" className="h-11" value={billingForm.firstName} onChange={(e) => updateBillingForm("firstName", e.target.value)} aria-invalid={Boolean(errors["billing.firstName"])} required />
                      {errors["billing.firstName"] && <p className="text-xs text-destructive">{errors["billing.firstName"]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingLastName" className="text-sm font-medium">
                        {tCheckout("lastName")}
                      </Label>
                      <Input id="billingLastName" autoComplete="billing family-name" placeholder="Al-Salem" className="h-11" value={billingForm.lastName} onChange={(e) => updateBillingForm("lastName", e.target.value)} aria-invalid={Boolean(errors["billing.lastName"])} required />
                      {errors["billing.lastName"] && <p className="text-xs text-destructive">{errors["billing.lastName"]}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingAddress1" className="text-sm font-medium">
                      {tCheckout("address")}
                    </Label>
                    <Input id="billingAddress1" autoComplete="billing address-line1" placeholder="King Fahd Road, Building 12" className="h-11" value={billingForm.address1} onChange={(e) => updateBillingForm("address1", e.target.value)} aria-invalid={Boolean(errors["billing.address1"])} required />
                    {errors["billing.address1"] && <p className="text-xs text-destructive">{errors["billing.address1"]}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingAddress2" className="text-sm font-medium">
                      {t("apartment")}
                    </Label>
                    <Input id="billingAddress2" autoComplete="billing address-line2" placeholder="Floor 3, Office 301" className="h-11" value={billingForm.address2} onChange={(e) => updateBillingForm("address2", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="billingCountry" className="text-sm font-medium">{tCheckout("country")}</Label>
                      <Select value={billingCountry} onValueChange={handleBillingCountryChange}>
                        <SelectTrigger id="billingCountry" size="lg" className="w-full">
                          <SelectValue placeholder={t("select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {CHECKOUT_COUNTRIES.map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {t(option.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors["billing.country"] && <p className="text-xs text-destructive">{errors["billing.country"]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingRegion" className="text-sm font-medium">
                        {t("region")}
                      </Label>
                      <Select value={billingRegion} onValueChange={handleBillingRegionChange}>
                        <SelectTrigger id="billingRegion" size="lg" className="w-full">
                          <SelectValue placeholder={t("select")} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedBillingCountry.regions.map((option) => (
                            <SelectItem key={option.name} value={option.name}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors["billing.region"] && <p className="text-xs text-destructive">{errors["billing.region"]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingCity" className="text-sm font-medium">
                        {tCheckout("city")}
                      </Label>
                      <Select
                        value={billingForm.city}
                        onValueChange={(value) => updateBillingForm("city", value)}
                        disabled={!selectedBillingRegion}
                      >
                        <SelectTrigger id="billingCity" size="lg" className="w-full" aria-invalid={Boolean(errors["billing.city"])}>
                          <SelectValue placeholder={selectedBillingRegion ? t("select") : t("region")} />
                        </SelectTrigger>
                        <SelectContent>
                          {(selectedBillingRegion?.cities ?? []).map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors["billing.city"] && <p className="text-xs text-destructive">{errors["billing.city"]}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billingPostalCode" className="text-sm font-medium">
                        {tCheckout("postalCode")}
                      </Label>
                      <Input id="billingPostalCode" autoComplete="billing postal-code" inputMode="numeric" placeholder={selectedBillingCountry.postalCodePlaceholder} className="h-11" value={billingForm.postalCode} onChange={(e) => updateBillingForm("postalCode", e.target.value)} aria-invalid={Boolean(errors["billing.postalCode"])} required />
                      {errors["billing.postalCode"] && <p className="text-xs text-destructive">{errors["billing.postalCode"]}</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Method */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">
                {t("shippingMethod")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!region && (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("selectRegionShipping")}</p>
              )}
              {region && loadingShipping && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {region && !loadingShipping && shippingRates.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">{t("noShippingOptions")}</p>
              )}
              {errors.shipping && <p className="text-xs text-destructive text-center">{errors.shipping}</p>}
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
                    {rate.price === 0 ? tCommon("free") : formatCheckoutCurrency(rate.price)}
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
                  <Tag className="h-4 w-4" /> {t("autoDiscounts")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {autoDiscounts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">{d.name}</p>
                      <p className="text-xs text-green-600/70 dark:text-green-500/70">{d.description}</p>
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-400">-{formatCheckoutCurrency(d.savedAmount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card className="shadow-none border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> {tCheckout("paymentMethod")}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Lock className="h-3 w-3" /> {t("sslEncryption")}
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
                      <p className="text-sm font-semibold">{t("onlinePayment")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("onlinePaymentMethods")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">{t("secure")}</span>
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
                      <p className="text-sm font-semibold">{tCheckout("cod")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("codDesc")}
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
                    {t("securePaymentRedirect")}
                  </p>
                </div>
              )}

              {/* No payment methods available */}
              {!paymentSettings.tapEnabled && !paymentSettings.codEnabled && (
                <div className="flex items-center justify-center py-8 px-4 border-2 border-dashed rounded-lg bg-accent/30">
                  <p className="text-sm text-muted-foreground">
                    {t("noPaymentMethods")}
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
                {tCheckout("orderSummary")}
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
                          unoptimized={shouldUseUnoptimizedImage(item.image)}
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
                        {formatCheckoutCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0">
                      {formatCheckoutCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tCommon("subtotal")}</span>
                  <span className="font-medium">{formatCheckoutCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tCommon("shipping")}{selectedRate ? ` (${selectedRate.name})` : ""}</span>
                  <span className="font-medium">
                    {shipping === 0 ? tCommon("free") : formatCheckoutCurrency(shipping)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("vat15")}</span>
                  <span className="font-medium">{formatCheckoutCurrency(tax)}</span>
                </div>
                {autoDiscountTotal > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{t("autoDiscountSummary")}</span>
                    <span className="font-medium">-{formatCheckoutCurrency(autoDiscountTotal)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{t("couponLabel", { code: appliedCoupon ?? "" })}</span>
                    <span className="font-medium">-{formatCheckoutCurrency(couponDiscount)}</span>
                  </div>
                )}
                {couponFreeShipping && !couponDiscount && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{t("couponLabel", { code: appliedCoupon ?? "" })}</span>
                    <span className="font-medium">{t("freeShipping")}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Coupon Code Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {t("couponCode")}
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">{appliedCoupon}</span>
                    <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="h-7 text-xs text-red-600 hover:text-red-700">
                      {t("remove")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("enterCode")}
                      className="h-10 uppercase"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                    <Button variant="outline" className="h-10 px-4" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                      {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("applyCoupon")}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>{tCommon("total")}</span>
                <span>{formatCheckoutCurrency(total)}</span>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <Checkbox id="agreeTerms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} className="mt-0.5" />
                <Label htmlFor="agreeTerms" className="text-xs text-muted-foreground leading-relaxed">
                  {t("agreeTerms")}{" "}
                  <Link href="/pages/terms" className="underline hover:text-foreground">{t("termsConditions")}</Link>{" "}{t("and")}{" "}
                  <Link href="/pages/privacy" className="underline hover:text-foreground">{t("privacyPolicy")}</Link>
                </Label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

              <Button
                className="w-full h-12 text-[15px] font-semibold"
                onClick={handlePlaceOrder}
                disabled={!canPlaceOrder}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCheckout("processing")}
                  </>
                ) : paymentMethod === "tap" ? (
                  t("pay", { currency: checkoutCurrency, amount: total.toFixed(2) })
                ) : (
                  t("placeOrder", { currency: checkoutCurrency, amount: total.toFixed(2) })
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("secureCheckout")}
              </div>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                {t("vatNotice")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
