import Link from "next/link";
import { db } from "@/lib/db";
import { products } from "@/lib/schema";
import { desc, or, ilike, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, MoreHorizontal } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/lib/helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { DeleteProductItem } from "@/components/admin/delete-product-item";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10) || 1);

  const whereClause = q
    ? or(
        ilike(products.name, `%${q}%`),
        ilike(products.sku, `%${q}%`),
        ilike(products.vendor, `%${q}%`),
        ilike(products.productType, `%${q}%`),
      )
    : undefined;

  const [allProducts, countResult] = await Promise.all([
    db.query.products.findMany({
      where: whereClause,
      orderBy: [desc(products.createdAt)],
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
      with: {
        images: true,
        categories: { with: { category: true } },
        orderItems: true,
        reviews: true,
      },
    }),
    db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
  ]);

  const totalItems = Number(countResult[0]?.count || 0);
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const productsList = allProducts.map((p) => ({
    ...p,
    images: p.images.filter((img) => img.isPrimary).slice(0, 1),
    _count: { orderItems: p.orderItems.length, reviews: p.reviews.length },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog ({totalItems} products)
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <AdminSearch placeholder="Search products..." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsList.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-muted overflow-hidden">
                        {product.images[0] && (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {product.sku || "No SKU"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(product.status)}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {formatCurrency(Number(product.price))}
                      </span>
                      {product.compareAtPrice && (
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          {formatCurrency(Number(product.compareAtPrice))}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        product.quantity <= product.lowStockThreshold
                          ? "text-destructive font-medium"
                          : ""
                      }
                    >
                      {product.quantity} in stock
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.categories
                      .map((pc) => pc.category.name)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>{product._count.orderItems}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${product.id}`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.slug}`} target="_blank">
                            View in Store
                          </Link>
                        </DropdownMenuItem>
                        <DeleteProductItem productId={product.id} productName={product.name} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {productsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {q ? `No products matching "${q}"` : "No products found"}
                    </p>
                    {!q && (
                      <Button asChild variant="link" className="mt-2">
                        <Link href="/admin/products/new">
                          Create your first product
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        </CardContent>
      </Card>
    </div>
  );
}
