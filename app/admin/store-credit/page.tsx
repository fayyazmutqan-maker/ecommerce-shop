"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Wallet, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  storeCreditBalance: string;
}

interface Transaction {
  id: string;
  userId: string;
  amount: string;
  type: string;
  reason: string | null;
  orderId: string | null;
  createdAt: string;
}

export default function StoreCreditAdminPage() {
  const t = useTranslations("admin.storeCredit");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txCustomer, setTxCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : data.customers || []);
      }
    } catch {
      toast.error(t("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (c.name?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  });

  function openAdd(customer: Customer) {
    setSelectedCustomer(customer);
    setAmount("");
    setType("CREDIT");
    setReason("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/store-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCustomer.id,
          amount: parseFloat(amount),
          type,
          reason: reason || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(t(type === "CREDIT" ? "toasts.creditAdded" : "toasts.creditDeducted"));
      setOpen(false);
      fetchCustomers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update store credit");
    } finally {
      setSaving(false);
    }
  }

  async function viewTransactions(customer: Customer) {
    setTxCustomer(customer);
    setTxLoading(true);
    setTransactions([]);
    try {
      const res = await fetch(`/api/store-credit?userId=${customer.id}&admin=true`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      toast.error(t("toasts.transactionsFailed"));
    } finally {
      setTxLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchCustomers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-[25%]" />
                  <Skeleton className="h-4 w-[20%]" />
                  <Skeleton className="h-4 w-[15%]" />
                  <Skeleton className="h-4 w-[20%]" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">{t("noCustomersFound")}</div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("balance")}</TableHead>
                  <TableHead className="w-[200px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name || "—"}</TableCell>
                    <TableCell className="text-sm">{c.email}</TableCell>
                    <TableCell>
                      <Badge variant={Number(c.storeCreditBalance) > 0 ? "default" : "secondary"}>
                        SAR {Number(c.storeCreditBalance || 0).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openAdd(c)}>
                          <Plus className="mr-1 h-3 w-3" />{t("addDeduct")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => viewTransactions(c)}>
                          {t("history")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Panel */}
      {txCustomer && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{t("transactions", { name: txCustomer.name || txCustomer.email })}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTxCustomer(null)}>{t("close")}</Button>
            </div>
            {txLoading ? (
              <div className="space-y-3 py-4">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[30%]" /><Skeleton className="h-4 w-[15%]" /><Skeleton className="h-4 w-[15%]" /></div>))}</div>
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">{t("noTransactions")}</p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant={tx.type === "CREDIT" ? "default" : "secondary"}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}>
                        {tx.type === "CREDIT" ? "+" : "-"}SAR {Number(tx.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.reason || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Deduct Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("dialogTitle", { type, name: selectedCustomer?.name || selectedCustomer?.email || "" })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as "CREDIT" | "DEBIT")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">{t("creditAdd")}</SelectItem>
                  <SelectItem value="DEBIT">{t("debitDeduct")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("amountSar")}</Label>
              <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("reasonOptional")}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} maxLength={500} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {type === "CREDIT" ? t("addCredit") : t("deductCredit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
