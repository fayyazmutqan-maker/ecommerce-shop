import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { eq, desc, gt, asc, and } from "drizzle-orm";
import { products, categories, productCategories, orders, users } from "@/lib/schema";

const BATCH_SIZE = 500;

/* ── Batched query helpers (break TS circular inference) ── */

async function fetchProductBatch(cursor: string | null) {
  return db.query.products.findMany({
    with: { images: true, variants: true, categories: { with: { category: true } } },
    orderBy: asc(products.id),
    limit: BATCH_SIZE,
    where: cursor ? gt(products.id, cursor) : undefined,
  });
}

async function fetchOrderBatch(cursor: string | null) {
  return db.query.orders.findMany({
    with: {
      items: true,
      user: { columns: { id: true, name: true, email: true } },
      shippingAddress: true,
    },
    orderBy: asc(orders.id),
    limit: BATCH_SIZE,
    where: cursor ? gt(orders.id, cursor) : undefined,
  });
}

async function fetchCustomerBatch(cursor: string | null) {
  return db.query.users.findMany({
    where: cursor
      ? and(eq(users.role, "CUSTOMER"), gt(users.id, cursor))
      : eq(users.role, "CUSTOMER"),
    columns: { id: true, name: true, email: true, phone: true, createdAt: true },
    with: {
      orders: { columns: { totalAmount: true } },
      addresses: true,
    },
    orderBy: asc(users.id),
    limit: BATCH_SIZE,
  });
}

/**
 * GET /api/import-export/export?type=products|orders|customers — Stream export as CSV
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!type || !["products", "orders", "customers"].includes(type)) {
      return NextResponse.json({ error: "Invalid export type. Use: products, orders, or customers" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          switch (type) {
            case "products": {
              controller.enqueue(encoder.encode(
                "ID,Name,Slug,SKU,Barcode,Price,Compare At Price,Cost Price,Quantity,Status,Product Type,Vendor,Tags,Weight,Weight Unit,Taxable,Track Inventory,Featured,Digital,Categories,Image URLs,Variant Count,SEO Title,SEO Description,Created At\n"
              ));

              let cursor: string | null = null;
              let hasMore = true;
              while (hasMore) {
                const batch = await fetchProductBatch(cursor);
                for (const p of batch) {
                  const cats = p.categories.map((c) => c.category.name).join("; ");
                  const imgs = p.images.map((i) => i.url).join("; ");
                  controller.enqueue(encoder.encode(
                    `${csvEsc(p.id)},${csvEsc(p.name)},${csvEsc(p.slug)},${csvEsc(p.sku || "")},${csvEsc(p.barcode || "")},${p.price},${p.compareAtPrice || ""},${p.costPrice || ""},${p.quantity},${p.status},${csvEsc(p.productType || "")},${csvEsc(p.vendor || "")},${csvEsc(p.tags || "")},${p.weight || ""},${p.weightUnit},${p.taxable},${p.trackInventory},${p.isFeatured},${p.isDigital},${csvEsc(cats)},${csvEsc(imgs)},${p.variants.length},${csvEsc(p.seoTitle || "")},${csvEsc(p.seoDescription || "")},${p.createdAt.toISOString()}\n`
                  ));
                }
                hasMore = batch.length === BATCH_SIZE;
                if (batch.length > 0) cursor = batch[batch.length - 1].id;
              }
              break;
            }

            case "orders": {
              controller.enqueue(encoder.encode(
                "Order Number,Email,Customer Name,Phone,Status,Payment Status,Fulfillment,Payment Method,Source,Subtotal,Tax,Shipping,Discount,Total,Currency,Items Count,Shipping Address,Tracking Number,Notes,Created At\n"
              ));

              let cursor: string | null = null;
              let hasMore = true;
              while (hasMore) {
                const batch = await fetchOrderBatch(cursor);
                for (const o of batch) {
                  const shippingAddr = o.shippingAddress
                    ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}, ${o.shippingAddress.address1}, ${o.shippingAddress.city}, ${o.shippingAddress.country}`
                    : "";
                  controller.enqueue(encoder.encode(
                    `${csvEsc(o.orderNumber)},${csvEsc(o.email)},${csvEsc(o.user?.name || "Guest")},${csvEsc(o.phone || "")},${o.status},${o.paymentStatus},${o.fulfillmentStatus},${csvEsc(o.paymentMethod || "")},${o.source},${o.subtotal},${o.taxAmount},${o.shippingAmount},${o.discountAmount},${o.totalAmount},${o.currency},${o.items.length},${csvEsc(shippingAddr)},${csvEsc(o.trackingNumber || "")},${csvEsc(o.notes || "")},${o.createdAt.toISOString()}\n`
                  ));
                }
                hasMore = batch.length === BATCH_SIZE;
                if (batch.length > 0) cursor = batch[batch.length - 1].id;
              }
              break;
            }

            case "customers": {
              controller.enqueue(encoder.encode(
                "ID,Name,Email,Phone,Orders Count,Total Spent,Default City,Default Country,Created At\n"
              ));

              let cursor: string | null = null;
              let hasMore = true;
              while (hasMore) {
                const batch = await fetchCustomerBatch(cursor);
                for (const c of batch) {
                  const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
                  const defaultAddr = c.addresses.find((a) => a.isDefault) ?? c.addresses[0];
                  controller.enqueue(encoder.encode(
                    `${csvEsc(c.id)},${csvEsc(c.name || "")},${csvEsc(c.email)},${csvEsc(c.phone || "")},${c.orders.length},${totalSpent.toFixed(2)},${csvEsc(defaultAddr?.city || "")},${csvEsc(defaultAddr?.country || "")},${c.createdAt.toISOString()}\n`
                  ));
                }
                hasMore = batch.length === BATCH_SIZE;
                if (batch.length > 0) cursor = batch[batch.length - 1].id;
              }
              break;
            }
          }

          controller.close();
        } catch (streamError) {
          console.error("Export stream error:", streamError);
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-export-${Date.now()}.csv"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

/**
 * POST /api/import-export/import — Import products from CSV
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type !== "products") {
      return NextResponse.json({ error: "Only product import is currently supported" }, { status: 400 });
    }

    const body = await req.text();
    const lines = body.split("\n").filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const MAX_IMPORT_ROWS = 5000;
    if (lines.length - 1 > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Import limited to ${MAX_IMPORT_ROWS} rows. Split your file into smaller batches.` }, { status: 400 });
    }

    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ["Name", "Price"];
    for (const h of requiredHeaders) {
      if (!headers.map((x) => x.toLowerCase()).includes(h.toLowerCase())) {
        return NextResponse.json({ error: `Missing required CSV header: ${h}` }, { status: 400 });
      }
    }

    const results = { created: 0, updated: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h.trim().toLowerCase()] = values[idx]?.trim() || ""; });

        const name = row["name"];
        if (!name) {
          results.errors.push(`Row ${i + 1}: Name is required`);
          continue;
        }

        const price = parseFloat(row["price"]);
        if (isNaN(price) || price < 0) {
          results.errors.push(`Row ${i + 1}: Invalid price for "${name}"`);
          continue;
        }

        // Generate slug from name
        const baseSlug = name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
        const slug = row["slug"] || baseSlug;

        // Check if product exists (by SKU or slug)
        const existingSku = row["sku"]
          ? await db.query.products.findFirst({ where: eq(products.sku, row["sku"]) })
          : null;
        const existingSlug = await db.query.products.findFirst({ where: eq(products.slug, slug) });

        const productData = {
          name,
          price: String(price),
          sku: row["sku"] || null,
          barcode: row["barcode"] || null,
          compareAtPrice: row["compare at price"] ? String(parseFloat(row["compare at price"]) || 0) : null,
          costPrice: row["cost price"] ? String(parseFloat(row["cost price"]) || 0) : null,
          quantity: row["quantity"] ? parseInt(row["quantity"]) || 0 : 0,
          status: row["status"] && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(row["status"].toUpperCase()) ? row["status"].toUpperCase() : "DRAFT",
          productType: row["product type"] || null,
          vendor: row["vendor"] || null,
          tags: row["tags"] || null,
          weight: row["weight"] ? parseFloat(row["weight"]) || null : null,
          weightUnit: row["weight unit"] || "kg",
          taxable: row["taxable"] !== "false",
          trackInventory: row["track inventory"] !== "false",
          isFeatured: row["featured"] === "true",
          isDigital: row["digital"] === "true",
          seoTitle: row["seo title"] || null,
          seoDescription: row["seo description"] || null,
        };

        if (existingSku) {
          await db.update(products).set(productData).where(eq(products.id, existingSku.id));
          results.updated++;
        } else if (existingSlug) {
          await db.update(products).set(productData).where(eq(products.slug, slug));
          results.updated++;
        } else {
          // Handle slug uniqueness
          let finalSlug = slug;
          let counter = 1;
          while (await db.query.products.findFirst({ where: eq(products.slug, finalSlug) })) {
            finalSlug = `${slug}-${counter}`;
            counter++;
          }

          await db.insert(products).values({
            ...productData,
            slug: finalSlug,
          });
          results.created++;
        }

        // Handle categories if provided
        if (row["categories"]) {
          const categoryNames = row["categories"].split(";").map((c) => c.trim()).filter(Boolean);
          const product = existingSku || existingSlug || await db.query.products.findFirst({ where: eq(products.slug, slug) });

          if (product) {
            for (const catName of categoryNames) {
              const catSlug = catName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
              let category = await db.query.categories.findFirst({ where: eq(categories.slug, catSlug) });
              if (!category) {
                const [newCat] = await db.insert(categories).values({ name: catName, slug: catSlug }).returning();
                category = newCat;
              }
              await db.insert(productCategories)
                .values({ productId: product.id, categoryId: category.id })
                .onConflictDoNothing();
            }
          }
        }
      } catch (rowError) {
        results.errors.push(`Row ${i + 1}: ${rowError instanceof Error ? rowError.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      message: `Import complete: ${results.created} created, ${results.updated} updated${results.errors.length > 0 ? `, ${results.errors.length} errors` : ""}`,
      ...results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}

// CSV helper: escape a field value for CSV output
function csvEsc(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Parse a line of CSV respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
