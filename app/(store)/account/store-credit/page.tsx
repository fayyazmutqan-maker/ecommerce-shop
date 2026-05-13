import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeCreditTransactions } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { AccountSidebar } from "@/components/store/account-sidebar";

export const dynamic = "force-dynamic";

export default async function StoreCreditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const transactions = await db.query.storeCreditTransactions.findMany({
    where: eq(storeCreditTransactions.userId, session.user.id),
    orderBy: desc(storeCreditTransactions.createdAt),
  });

  const balance = transactions.reduce((sum, t) => {
    return t.type === "CREDIT" ? sum + Number(t.amount) : sum - Number(t.amount);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Store Credit" },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <AccountSidebar active="storeCredit" user={session.user} />

        <div className="lg:col-span-3 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/account"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Store Credit</h1>
          <p className="text-sm text-muted-foreground">Your store credit balance and history</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-3xl font-bold">SAR {balance.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All store credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${t.type === "CREDIT" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {t.type === "CREDIT" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.type === "CREDIT" ? "Credit Added" : "Credit Used"}</p>
                      {t.reason && <p className="text-xs text-muted-foreground">{t.reason}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString("en-SA")}</p>
                    </div>
                  </div>
                  <Badge variant={t.type === "CREDIT" ? "default" : "secondary"} className={t.type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {t.type === "CREDIT" ? "+" : "-"}SAR {Number(t.amount).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
