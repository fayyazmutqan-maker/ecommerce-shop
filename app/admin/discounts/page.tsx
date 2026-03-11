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

export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  const allCoupons = await db.query.coupons.findMany({
    orderBy: [desc(coupons.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="text-muted-foreground">
            Manage coupons and discount codes
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
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
                        ? "Free Shipping"
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
                      {coupon.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.expiresAt
                      ? formatDate(coupon.expiresAt)
                      : "No expiry"}
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
                    <p className="text-muted-foreground">No discounts yet</p>
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
