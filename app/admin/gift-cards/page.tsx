"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { CreditCard, Plus, Loader2, Copy, DollarSign, Ban, CheckCircle } from "lucide-react";
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
  transactions?: any[];
}

export default function GiftCardsPage() {
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
      toast.error("Failed to fetch gift cards");
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
        toast.success("Gift card created");
        setShowCreate(false);
        setForm({ initialBalance: "", recipientEmail: "", recipientName: "", senderName: "", message: "", expiresAt: "" });
        fetchCards();
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch {
      toast.error("Failed to create gift card");
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
      toast.success(card.isActive ? "Gift card disabled" : "Gift card enabled");
      fetchCards();
    } catch {
      toast.error("Failed to update gift card");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  }

  const totalValue = cards.reduce((sum, c) => sum + Number(c.currentBalance), 0);
  const activeCards = cards.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gift Cards</h1>
          <p className="text-muted-foreground">Create and manage gift cards</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Gift Card</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Gift Card</DialogTitle>
                <DialogDescription>Issue a new gift card with a balance</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Initial Balance (SAR) *</Label>
                  <Input type="number" min="1" step="0.01" required value={form.initialBalance}
                    onChange={(e) => setForm((p) => ({ ...p, initialBalance: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Recipient Name</Label>
                    <Input value={form.recipientName}
                      onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient Email</Label>
                    <Input type="email" value={form.recipientEmail}
                      onChange={(e) => setForm((p) => ({ ...p, recipientEmail: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input value={form.senderName}
                    onChange={(e) => setForm((p) => ({ ...p, senderName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea value={form.message} rows={2}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input type="date" value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Gift Card
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
                <p className="text-sm text-muted-foreground">Total Cards</p>
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
                <p className="text-sm text-muted-foreground">Active Cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">SAR {totalValue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Initial</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
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
                        {card.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {card.expiresAt ? formatDate(card.expiresAt) : "Never"}
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
                      No gift cards yet
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
