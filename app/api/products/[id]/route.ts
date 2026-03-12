import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { serializeDecimal } from "@/lib/decimal";
import { eq, ne, and, or, count } from "drizzle-orm";
import {
  products,
  productImages,
  productVariants,
  productCategories,
  productAttributeValues,
  productBundles,
  orderItems,
  reviews,
  cartItems,
  wishlistItems,
} from "@/lib/schema";
import { syncProductToAllChannels, removeProductFromChannels } from "@/lib/catalog-sync";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        images: { orderBy: (images, { asc }) => [asc(images.position)] },
        variants: true,
        categories: { with: { category: true } },
        reviews: {
          with: {
            user: { columns: { id: true, name: true, image: true } },
          },
        },
        attributeValues: {
          with: {
            attribute: {
              columns: { id: true, name: true, slug: true, type: true, groupId: true },
            },
          },
        },
        bundleItems: {
          with: {
            child: { columns: { id: true, name: true, price: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    if (!isAdmin && product.status !== "ACTIVE") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Compute _count equivalents
    const [orderItemCount] = await db
      .select({ value: count() })
      .from(orderItems)
      .where(eq(orderItems.productId, id));

    const result = {
      ...product,
      _count: {
        reviews: product.reviews.length,
        orderItems: orderItemCount.value,
      },
    };

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Product GET error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { images, attributes, variants, categoryIds, ...productData } = body;

    const existing = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Handle slug update if name changed
    if (productData.name && productData.name !== existing.name) {
      let slug = slugify(productData.name);
      const slugExists = await db.query.products.findFirst({
        where: and(eq(products.slug, slug), ne(products.id, id)),
      });
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
      productData.slug = slug;
    }

    // Handle date fields
    if (productData.scheduledAt !== undefined) {
      productData.scheduledAt = productData.scheduledAt ? new Date(productData.scheduledAt) : null;
    }
    if (productData.salePriceFrom !== undefined) {
      productData.salePriceFrom = productData.salePriceFrom ? new Date(productData.salePriceFrom) : null;
    }
    if (productData.salePriceTo !== undefined) {
      productData.salePriceTo = productData.salePriceTo ? new Date(productData.salePriceTo) : null;
    }

    await db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set(productData)
        .where(eq(products.id, id))
        .returning();

      // Replace images if provided
      if (Array.isArray(images)) {
        await tx.delete(productImages).where(eq(productImages.productId, id));
        if (images.length > 0) {
          await tx.insert(productImages).values(
            images.map((url: string, index: number) => ({
              productId: id,
              url,
              alt: product.name,
              position: index,
              isPrimary: index === 0,
            }))
          );
        }
      }

      // Replace attributes if provided
      if (Array.isArray(attributes)) {
        await tx.delete(productAttributeValues).where(eq(productAttributeValues.productId, id));
        const attrData = attributes.flatMap(
          (attr: { attributeId: string; values: string[] }) =>
            attr.values.filter((v: string) => v.trim() !== "").map((value: string) => ({
              productId: id,
              attributeId: attr.attributeId,
              value,
            }))
        );
        if (attrData.length > 0) {
          await tx.insert(productAttributeValues).values(attrData);
        }
      }

      // Replace variants if provided
      if (Array.isArray(variants)) {
        await tx.delete(productVariants).where(eq(productVariants.productId, id));
        if (variants.length > 0) {
          await tx.insert(productVariants).values(
            variants.map(
              (v: { name: string; sku?: string; barcode?: string; price: number; compareAtPrice?: number | null; costPrice?: number | null; quantity?: number; weight?: number | null; image?: string | null; option1?: string; option2?: string; option3?: string }) => ({
                productId: id,
                name: v.name,
                sku: v.sku || null,
                barcode: v.barcode || null,
                price: v.price.toString(),
                compareAtPrice: v.compareAtPrice?.toString() || null,
                costPrice: v.costPrice?.toString() || null,
                quantity: v.quantity || 0,
                weight: v.weight || null,
                image: v.image || null,
                option1: v.option1 || null,
                option2: v.option2 || null,
                option3: v.option3 || null,
              })
            )
          );
        }
      }

      // Replace categories if provided
      if (Array.isArray(categoryIds)) {
        await tx.delete(productCategories).where(eq(productCategories.productId, id));
        if (categoryIds.length > 0) {
          await tx.insert(productCategories).values(
            categoryIds.map((categoryId: string) => ({ productId: id, categoryId }))
          );
        }
      }

      return product;
    });

    const result = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        images: { orderBy: (images, { asc }) => [asc(images.position)] },
        variants: true,
        categories: { with: { category: true } },
        attributeValues: {
          with: {
            attribute: {
              columns: { name: true, slug: true, type: true },
            },
          },
        },
      },
    });

    // Trigger incremental sync to connected channels (fire-and-forget)
    syncProductToAllChannels(id).catch(() => {});

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Product PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if product has any orders — archive instead of delete
    const [orderCount] = await db
      .select({ value: count() })
      .from(orderItems)
      .where(eq(orderItems.productId, id));

    if (orderCount.value > 0) {
      await db.update(products).set({ status: "ARCHIVED" }).where(eq(products.id, id));
      // Remove from channels since it's no longer active
      removeProductFromChannels(id).catch(() => {});
      return NextResponse.json({ message: "Product archived (has existing orders)" });
    }

    await db.transaction(async (tx) => {
      await tx.delete(productAttributeValues).where(eq(productAttributeValues.productId, id));
      await tx.delete(productImages).where(eq(productImages.productId, id));
      await tx.delete(productVariants).where(eq(productVariants.productId, id));
      await tx.delete(productCategories).where(eq(productCategories.productId, id));
      await tx.delete(productBundles).where(
        or(eq(productBundles.productId, id), eq(productBundles.childId, id))
      );
      await tx.delete(cartItems).where(eq(cartItems.productId, id));
      await tx.delete(wishlistItems).where(eq(wishlistItems.productId, id));
      await tx.delete(reviews).where(eq(reviews.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });

    // Remove from all channels (fire-and-forget)
    removeProductFromChannels(id).catch(() => {});

    return NextResponse.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
