"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Plus, Loader2, Copy, SaudiRiyal, Ban, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/helpers";

interface GiftCard {
  id: string;
  code: string;
  initialBalance: string;
  currentBalance: string;
  currency: string;
  recipientEmail: string | null;
  recipientName: string | null;
  senderName: string | null;
  message: string | null;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  transactions?: GiftCardTransaction[];
}

interface GiftCardTransaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  note?: string | null;
  createdAt: string;
}

export default function GiftCardsPage() {
  const t = useTranslations("admin.giftCards");
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    initialBalance: "",
    recipientEmail: "",
    recipientName: "",
    senderName: "",
    message: "",
    expiresAt: "",
  });

  async function fetchCards() {
    try {
      const res = await fetch("/api/gift-cards?admin=true");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCards(data);
    } catch {
      toast.error(t("failedLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCards(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialBalance: parseFloat(form.initialBalance),
          recipientEmail: form.recipientEmail || null,
          recipientName: form.recipientName || null,
          senderName: form.senderName || null,
          message: form.message || null,
          expiresAt: form.expiresAt || null,
        }),
      });
      if (res.ok) {
        toast.success(t("cardCreated"));
        setShowCreate(false);
        setForm({ initialBalance: "", recipientEmail: "", recipientName: "", senderName: "", message: "", expiresAt: "" });
        fetchCards();
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch {
      toast.error(t("failedCreate"));
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(card: GiftCard) {
    try {
      const res = await fetch("/api/gift-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, isActive: !card.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(card.isActive ? t("cardDisabled") : t("cardEnabled"));
      fetchCards();
    } catch {
      toast.error(t("failedUpdate"));
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(t("codeCopied"));
  }

  const totalValue = cards.reduce((sum, c) => sum + Number(c.currentBalance), 0);
  const activeCards = cards.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> {t("createGiftCard")}</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("dialogTitle")}</DialogTitle>
                <DialogDescription>{t("dialogDescription")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t("initialBalance")}</Label>
                  <Input type="number" min="1" step="0.01" required value={form.initialBalance}
                    onChange={(e) => setForm((p) => ({ ...p, initialBalance: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("recipientName")}</Label>
                    <Input value={form.recipientName}
                      onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("recipientEmail")}</Label>
                    <Input type="email" value={form.recipientEmail}
                      onChange={(e) => setForm((p) => ({ ...p, recipientEmail: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("senderName")}</Label>
                  <Input value={form.senderName}
                    onChange={(e) => setForm((p) => ({ ...p, senderName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("message")}</Label>
                  <Textarea value={form.message} rows={2}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("expiresAt")}</Label>
                  <Input type="date" value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("createGiftCard")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{cards.length}</p>
                <p className="text-sm text-muted-foreground">{t("totalCards")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeCards}</p>
                <p className="text-sm text-muted-foreground">{t("activeCards")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <SaudiRiyal className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">SAR {totalValue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{t("outstandingBalance")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[10%]" />
                  <Skeleton className="h-4 w-[10%]" />
                  <Skeleton className="h-4 w-[20%]" />
                  <Skeleton className="h-4 w-[10%]" />
                  <Skeleton className="h-4 w-[12%]" />
                  <Skeleton className="h-4 w-[12%]" />
                  <Skeleton className="h-4 w-[8%]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("code")}</TableHead>
                  <TableHead>{t("initial")}</TableHead>
                  <TableHead>{t("balance")}</TableHead>
                  <TableHead>{t("recipient")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("expires")}</TableHead>
                  <TableHead>{t("createdAt")}</TableHead>
                  <TableHead className="w-20">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{card.code}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(card.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>SAR {Number(card.initialBalance).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">SAR {Number(card.currentBalance).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{card.recipientEmail || card.recipientName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={card.isActive ? "default" : "destructive"}>
                        {card.isActive ? t("active") : t("disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.expiresAt ? formatDate(card.expiresAt) : t("never")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(card.createdAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(card)}>
                        {card.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t("noGiftCards")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
