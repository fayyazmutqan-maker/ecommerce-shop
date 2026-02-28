import Link from "next/link";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AdminSearch } from "@/components/admin/admin-search";
import { formatDate, getInitials } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const customers = await db.query.users.findMany({
    where: q
      ? and(
          eq(users.role, "CUSTOMER"),
          or(
            ilike(users.name, `%${q}%`),
            ilike(users.email, `%${q}%`),
          ),
        )
      : eq(users.role, "CUSTOMER"),
    orderBy: [desc(users.createdAt)],
    with: {
      orders: {
        columns: { totalAmount: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customer base ({customers.length} customers)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <AdminSearch placeholder="Search customers..." />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const totalSpent = customer.orders.reduce(
                  (sum, o) => sum + Number(o.totalAmount),
                  0
                );
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={customer.image || ""} />
                          <AvatarFallback className="text-xs">
                            {getInitials(customer.name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {customer.name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.email}
                    </TableCell>
                    <TableCell>{customer.orders.length}</TableCell>
                    <TableCell className="font-medium">
                      SAR {totalSpent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(customer.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No customers yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
