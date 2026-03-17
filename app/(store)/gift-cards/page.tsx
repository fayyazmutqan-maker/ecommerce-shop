"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Gift, Search, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

const presetAmounts = [50, 100, 200, 500, 1000];

export default function GiftCardsPage() {
  const t = useTranslations("giftCards");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<"buy" | "check">("buy");
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [checkCode, setCheckCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [balance, setBalance] = useState<{ currentBalance: string; currency: string } | null>(null);

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : amount;
    if (!finalAmount || finalAmount < 1) {
      toast.error(t("selectValidAmount"));
      return;
    }
    setPurchasing(true);
    try {
      // This creates the gift card - in production you'd integrate with payment first
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialBalance: finalAmount,
          recipientName: recipientName || null,
          recipientEmail: recipientEmail || null,
          senderName: senderName || null,
          message: message || null,
        }),
      });

      if (res.status === 401) {
        toast.error(t("signInRequired"));
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to purchase");
      }

      const card = await res.json();
      toast.success(t("cardCreated", { code: card.code }));
      setRecipientName("");
      setRecipientEmail("");
      setSenderName("");
      setMessage("");
      setCustomAmount("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPurchasing(false);
    }
  }

  async function handleCheckBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!checkCode.trim()) return;
    setChecking(true);
    setBalance(null);
    try {
      const res = await fetch(`/api/gift-cards?code=${encodeURIComponent(checkCode.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid gift card");
      }
      setBalance(await res.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: t("title") }]} />

      <div className="text-center mb-10">
        <Gift className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-2 mb-8">
        <Button variant={tab === "buy" ? "default" : "outline"} onClick={() => setTab("buy")}>
          <CreditCard className="mr-2 h-4 w-4" />{t("purchaseGiftCard")}
        </Button>
        <Button variant={tab === "check" ? "default" : "outline"} onClick={() => setTab("check")}>
          <Search className="mr-2 h-4 w-4" />{t("checkBalance")}
        </Button>
      </div>

      {tab === "buy" && (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>{t("purchaseGiftCard")}</CardTitle>
            <CardDescription>Select an amount and personalize your gift</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePurchase} className="space-y-6">
              <div className="space-y-3">
                <Label>{t("selectAmount")}</Label>
                <div className="flex flex-wrap gap-2">
                  {presetAmounts.map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={amount === a && !customAmount ? "default" : "outline"}
                      className="min-w-[80px]"
                      onClick={() => { setAmount(a); setCustomAmount(""); }}
                    >
                      {a}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("or")}</span>
                  <Input
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    placeholder={t("customAmount")}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("recipientName")}</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder={t("recipientNamePlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("recipientEmail")}</Label>
                  <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder={t("recipientEmailPlaceholder")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("yourName")}</Label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder={t("yourNamePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("personalMessage")}</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("messagePlaceholder")} maxLength={1000} rows={3} />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={purchasing}>
                {purchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("purchase", { amount: customAmount ? parseFloat(customAmount || "0").toFixed(2) : amount.toFixed(2) })}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "check" && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t("checkTitle")}</CardTitle>
            <CardDescription>{t("checkDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckBalance} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("giftCardCode")}</Label>
                <Input
                  value={checkCode}
                  onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="font-mono text-center text-lg tracking-widest"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={checking}>
                {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("checkBalance")}
              </Button>

              {balance && (
                <div className="text-center p-6 bg-accent/50 rounded-lg mt-4">
                  <p className="text-sm text-muted-foreground mb-1">{t("availableBalance")}</p>
                  <p className="text-3xl font-bold text-primary">
                    {balance.currency} {Number(balance.currentBalance).toFixed(2)}
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
