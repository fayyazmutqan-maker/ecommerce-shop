import { db } from "@/lib/db";
import { categories, productCategories } from "@/lib/schema";
import { asc, eq, count, sql } from "drizzle-orm";
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
import { FolderTree } from "lucide-react";
import { CategoryCreateButton, CategoryEditButton, CategoryDeleteButton } from "@/components/admin/category-dialog";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const allCategories = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder)],
    with: {
      children: { columns: { id: true } },
      parent: { columns: { name: true } },
    },
  });

  // Count products per category in a single query instead of loading all products
  const productCounts = await db
    .select({ categoryId: productCategories.categoryId, count: count() })
    .from(productCategories)
    .groupBy(productCategories.categoryId);
  const productCountMap = new Map(productCounts.map((pc) => [pc.categoryId, pc.count]));

  const categoriesList = allCategories.map((c) => ({
    ...c,
    _count: { products: productCountMap.get(c.id) ?? 0, children: c.children.length },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Organize your products into categories
          </p>
        </div>
        <CategoryCreateButton categories={categoriesList.map(c => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, isActive: c.isActive, parentId: c.parentId, sortOrder: c.sortOrder, image: c.image }))} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Subcategories</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesList.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{category.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {category.parent?.name || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{category._count.products}</TableCell>
                  <TableCell>{category._count.children}</TableCell>
                  <TableCell>
                    <Badge
                      variant={category.isActive ? "default" : "secondary"}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CategoryEditButton
                        category={{ id: category.id, name: category.name, slug: category.slug, description: category.description, isActive: category.isActive, parentId: category.parentId, sortOrder: category.sortOrder, image: category.image }}
                        categories={categoriesList.map(c => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, isActive: c.isActive, parentId: c.parentId, sortOrder: c.sortOrder, image: c.image }))}
                      />
                      <CategoryDeleteButton categoryId={category.id} categoryName={category.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categoriesList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No categories yet</p>
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
