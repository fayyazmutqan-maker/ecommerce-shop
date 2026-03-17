import { db } from "@/lib/db";
import { coupons } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/helpers";
import { DiscountCreateButton, DiscountEditButton, DiscountDeleteButton } from "@/components/admin/discount-dialog";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  const allCoupons = await db.query.coupons.findMany({
    orderBy: [desc(coupons.createdAt)],
  });

  const t = await getTranslations("admin.discounts");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <DiscountCreateButton />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("value")}</TableHead>
                <TableHead>{t("usage")}</TableHead>
                <TableHead>{t("minOrder")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("expires")}</TableHead>
                <TableHead className="w-20">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-medium">
                    {coupon.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{coupon.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.type === "PERCENTAGE"
                      ? `${Number(coupon.value)}%`
                      : coupon.type === "FREE_SHIPPING"
                        ? t("freeShipping")
                        : formatCurrency(Number(coupon.value))}
                  </TableCell>
                  <TableCell>
                    {coupon.usedCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                  </TableCell>
                  <TableCell>
                    {coupon.minOrderAmount
                      ? formatCurrency(Number(coupon.minOrderAmount))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={coupon.isActive ? "default" : "secondary"}
                    >
                      {coupon.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.expiresAt
                      ? formatDate(coupon.expiresAt)
                      : t("noExpiry")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DiscountEditButton coupon={{ id: coupon.id, code: coupon.code, type: coupon.type, value: Number(coupon.value), minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null, maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null, usageLimit: coupon.usageLimit, usedCount: coupon.usedCount, isActive: coupon.isActive, startsAt: coupon.startsAt, expiresAt: coupon.expiresAt }} />
                      <DiscountDeleteButton couponId={coupon.id} code={coupon.code} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {allCoupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">{t("noDiscounts")}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
