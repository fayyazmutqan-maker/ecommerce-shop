import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../lib/schema";
import "dotenv/config";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const existingAdmin = await db.query.users.findFirst({ where: eq(schema.users.email, "admin@store.com") });
  const admin = existingAdmin
    ? existingAdmin
    : (await db.insert(schema.users).values({ email: "admin@store.com", name: "Store Admin", password: adminPassword, role: "ADMIN", emailVerified: new Date() }).returning())[0];
  console.log("✅ Admin user created:", admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash("staff123", 12);
  const existingStaff = await db.query.users.findFirst({ where: eq(schema.users.email, "staff@store.com") });
  const staff = existingStaff
    ? existingStaff
    : (await db.insert(schema.users).values({ email: "staff@store.com", name: "Staff Member", password: staffPassword, role: "STAFF", emailVerified: new Date() }).returning())[0];
  console.log("✅ Staff user created:", staff.email);

  // Create customer
  const customerPassword = await bcrypt.hash("customer123", 12);
  const existingCustomer = await db.query.users.findFirst({ where: eq(schema.users.email, "customer@example.com") });
  const customer = existingCustomer
    ? existingCustomer
    : (await db.insert(schema.users).values({ email: "customer@example.com", name: "John Doe", password: customerPassword, role: "CUSTOMER", phone: "+1 555-0123", emailVerified: new Date() }).returning())[0];
  console.log("✅ Customer created:", customer.email);

  // Create Store Settings
  const existingSettings = await db.query.storeSettings.findFirst({ where: eq(schema.storeSettings.id, "default") });
  if (!existingSettings) {
    await db.insert(schema.storeSettings).values({
      id: "default",
      storeName: "ShopFlow",
      storeDescription: "Your all-in-one ecommerce solution",
      storeEmail: "hello@shopflow.com",
      storePhone: "+966 50 000 0000",
      storeAddress: "King Fahd Road, Riyadh 12345, Saudi Arabia",
      currency: "SAR",
      currencySymbol: "SAR",
      taxRate: 15,
      posEnabled: true,
    });
  }
  console.log("✅ Store settings created");

  // Create Categories
  const categoryData = [
    { name: "Electronics", slug: "electronics", description: "Gadgets and electronic devices", isActive: true, sortOrder: 1 },
    { name: "Clothing", slug: "clothing", description: "Fashion and apparel", isActive: true, sortOrder: 2 },
    { name: "Home & Garden", slug: "home-garden", description: "Home decor and garden essentials", isActive: true, sortOrder: 3 },
    { name: "Sports & Outdoors", slug: "sports", description: "Sports equipment and outdoor gear", isActive: true, sortOrder: 4 },
    { name: "Beauty & Health", slug: "beauty", description: "Beauty products and health essentials", isActive: true, sortOrder: 5 },
  ];

  const categories: (typeof schema.categories.$inferSelect)[] = [];
  for (const cat of categoryData) {
    const existing = await db.query.categories.findFirst({ where: eq(schema.categories.slug, cat.slug) });
    if (existing) {
      categories.push(existing);
    } else {
      const [created] = await db.insert(schema.categories).values(cat).returning();
      categories.push(created);
    }
  }
  console.log("✅ Categories created:", categories.length);

  // Create Products
  const productsData = [
    { name: "Wireless Bluetooth Headphones", slug: "wireless-bluetooth-headphones", description: "Premium noise-cancelling wireless headphones with 30-hour battery life.", shortDescription: "Premium ANC headphones with 30hr battery", sku: "WBH-001", barcode: "1234567890123", price: "149.99", compareAtPrice: "199.99", costPrice: "65.00", quantity: 150, status: "ACTIVE", isFeatured: true, vendor: "AudioTech", tags: "wireless,bluetooth,headphones,noise-cancelling", categorySlug: "electronics" },
    { name: "Smart Watch Pro", slug: "smart-watch-pro", description: "Advanced smartwatch with health monitoring, GPS tracking, and 5-day battery life.", shortDescription: "Health tracking smartwatch with GPS", sku: "SWP-002", price: "299.99", compareAtPrice: "349.99", costPrice: "120.00", quantity: 75, status: "ACTIVE", isFeatured: true, vendor: "TechGear", tags: "smartwatch,fitness,gps,health", categorySlug: "electronics" },
    { name: "Organic Cotton T-Shirt", slug: "organic-cotton-tshirt", description: "Sustainably made 100% organic cotton t-shirt.", shortDescription: "Sustainable organic cotton tee", sku: "OCT-003", price: "29.99", compareAtPrice: "39.99", costPrice: "8.00", quantity: 500, status: "ACTIVE", isFeatured: true, vendor: "EcoWear", tags: "organic,cotton,t-shirt,sustainable", categorySlug: "clothing" },
    { name: "Premium Running Shoes", slug: "premium-running-shoes", description: "Lightweight running shoes with responsive cushioning.", shortDescription: "Lightweight responsive running shoes", sku: "PRS-004", price: "129.99", compareAtPrice: "159.99", costPrice: "45.00", quantity: 200, status: "ACTIVE", isFeatured: true, vendor: "RunFast", tags: "running,shoes,athletic,lightweight", categorySlug: "sports" },
    { name: "Minimalist Desk Lamp", slug: "minimalist-desk-lamp", description: "Modern LED desk lamp with adjustable brightness.", shortDescription: "LED lamp with wireless charger", sku: "MDL-005", price: "59.99", compareAtPrice: "79.99", costPrice: "18.00", quantity: 120, status: "ACTIVE", vendor: "HomeLux", tags: "desk,lamp,led,minimalist", categorySlug: "home-garden" },
    { name: "Natural Face Serum", slug: "natural-face-serum", description: "Anti-aging face serum with vitamin C.", shortDescription: "Vitamin C anti-aging serum", sku: "NFS-006", price: "45.99", compareAtPrice: "59.99", costPrice: "12.00", quantity: 300, status: "ACTIVE", vendor: "GlowSkin", tags: "skincare,serum,vitamin-c,anti-aging", categorySlug: "beauty" },
    { name: "Mechanical Keyboard RGB", slug: "mechanical-keyboard-rgb", description: "Full-size mechanical keyboard with hot-swappable switches.", shortDescription: "Hot-swap RGB mechanical keyboard", sku: "MKR-007", price: "89.99", costPrice: "35.00", quantity: 90, status: "ACTIVE", vendor: "KeyMaster", tags: "keyboard,mechanical,rgb,gaming", categorySlug: "electronics" },
    { name: "Yoga Mat Premium", slug: "yoga-mat-premium", description: "Extra thick non-slip yoga mat with alignment markings.", shortDescription: "Eco-friendly non-slip yoga mat", sku: "YMP-008", price: "39.99", costPrice: "10.00", quantity: 180, status: "ACTIVE", vendor: "ZenFit", tags: "yoga,mat,fitness,eco-friendly", categorySlug: "sports" },
    { name: "Ceramic Plant Pot Set", slug: "ceramic-plant-pot-set", description: "Set of 3 minimalist ceramic plant pots with drainage holes.", shortDescription: "Set of 3 ceramic pots with saucers", sku: "CPP-009", price: "34.99", costPrice: "12.00", quantity: 60, status: "DRAFT", vendor: "PlantHouse", tags: "pots,ceramic,plants,home-decor", categorySlug: "home-garden" },
    { name: "Denim Jacket Classic", slug: "denim-jacket-classic", description: "Classic-fit denim jacket in premium washed cotton denim.", shortDescription: "Premium washed denim jacket", sku: "DJC-010", price: "79.99", compareAtPrice: "99.99", costPrice: "25.00", quantity: 150, status: "ACTIVE", isFeatured: true, vendor: "UrbanStyle", tags: "denim,jacket,fashion,classic", categorySlug: "clothing" },
  ];

  for (const p of productsData) {
    const { categorySlug, ...productData } = p;
    const category = categories.find((c) => c.slug === categorySlug);

    const existingProduct = await db.query.products.findFirst({ where: eq(schema.products.slug, productData.slug) });
    let product = existingProduct;
    if (!existingProduct) {
      [product] = await db.insert(schema.products).values({
        ...productData,
        isFeatured: productData.isFeatured ?? false,
      }).returning();

      if (category) {
        await db.insert(schema.productCategories).values({ productId: product!.id, categoryId: category.id }).onConflictDoNothing();
      }
    }

    // Create a placeholder image
    const imgId = `img-${product!.id}`;
    const existingImg = await db.query.productImages.findFirst({ where: eq(schema.productImages.id, imgId) });
    if (!existingImg) {
      await db.insert(schema.productImages).values({
        id: imgId,
        productId: product!.id,
        url: `https://placehold.co/600x600/e2e8f0/64748b?text=${encodeURIComponent(product!.name.split(" ").slice(0, 2).join("+"))}`,
        alt: product!.name,
        isPrimary: true,
        position: 0,
      });
    }
  }
  console.log("✅ Products created:", productsData.length);

  // Create sample orders
  const product1 = await db.query.products.findFirst({ where: eq(schema.products.slug, "wireless-bluetooth-headphones") });
  const product2 = await db.query.products.findFirst({ where: eq(schema.products.slug, "smart-watch-pro") });

  if (product1 && product2) {
    const ordersData = [
      { orderNumber: "ORD-2026-001", email: customer.email, userId: customer.id, status: "DELIVERED", paymentStatus: "PAID", fulfillmentStatus: "FULFILLED", subtotal: "449.98", taxAmount: "38.25", shippingAmount: "9.99", totalAmount: "498.22", source: "ONLINE" },
      { orderNumber: "ORD-2026-002", email: "jane@example.com", status: "PROCESSING", paymentStatus: "PAID", fulfillmentStatus: "UNFULFILLED", subtotal: "149.99", taxAmount: "12.75", shippingAmount: "0", totalAmount: "162.74", source: "ONLINE" },
      { orderNumber: "ORD-2026-003", email: customer.email, userId: customer.id, status: "DELIVERED", paymentStatus: "PAID", fulfillmentStatus: "FULFILLED", subtotal: "299.99", taxAmount: "25.50", totalAmount: "325.49", source: "POS" },
    ];

    for (const orderData of ordersData) {
      const existingOrder = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, orderData.orderNumber) });
      if (!existingOrder) {
        const [order] = await db.insert(schema.orders).values(orderData).returning();
        await db.insert(schema.orderItems).values({
          orderId: order.id,
          productId: product1.id,
          name: product1.name,
          sku: product1.sku,
          price: product1.price,
          quantity: 1,
          totalPrice: product1.price,
        });
      }
    }
    console.log("✅ Orders created:", ordersData.length);
  }

  // Create default template
  const existingTemplate = await db.query.templates.findFirst({ where: eq(schema.templates.slug, "default") });
  if (!existingTemplate) {
    const [template] = await db.insert(schema.templates).values({
      name: "Default Theme",
      slug: "default",
      description: "Clean and modern default storefront template",
      isActive: true,
      isDefault: true,
      config: JSON.stringify({ primaryColor: "#0f172a", accentColor: "#3b82f6", heroStyle: "full-width", productGrid: "4-column" }),
    }).returning();

    await db.insert(schema.templateSections).values([
      { templateId: template.id, name: "Hero Banner", type: "HERO", sortOrder: 0, isVisible: true, content: JSON.stringify({ title: "Welcome to ShopFlow", subtitle: "Discover amazing products at great prices", buttonText: "Shop Now", buttonLink: "/products" }) },
      { templateId: template.id, name: "Featured Products", type: "FEATURED_PRODUCTS", sortOrder: 1, isVisible: true, config: JSON.stringify({ limit: 8, columns: 4 }) },
      { templateId: template.id, name: "Categories", type: "CATEGORIES", sortOrder: 2, isVisible: true, config: JSON.stringify({ layout: "grid", showImage: true }) },
      { templateId: template.id, name: "Newsletter", type: "NEWSLETTER", sortOrder: 3, isVisible: true, content: JSON.stringify({ title: "Stay Updated", subtitle: "Subscribe to our newsletter for exclusive deals" }) },
    ]);
  }
  console.log("✅ Default template created");

  // Create navigation
  const existingNav = await db.query.navigations.findFirst({ where: eq(schema.navigations.slug, "main-menu") });
  if (!existingNav) {
    await db.insert(schema.navigations).values({
      title: "Main Menu",
      slug: "main-menu",
      items: JSON.stringify([
        { title: "Home", href: "/" },
        { title: "Products", href: "/products" },
        { title: "Categories", href: "/collections", children: [
          { title: "Electronics", href: "/collections/electronics" },
          { title: "Clothing", href: "/collections/clothing" },
          { title: "Home & Garden", href: "/collections/home-garden" },
          { title: "Sports", href: "/collections/sports" },
          { title: "Beauty", href: "/collections/beauty" },
        ] },
        { title: "About", href: "/about" },
        { title: "Contact", href: "/contact" },
      ]),
    });
  }
  console.log("✅ Navigation created");

  // Create a coupon
  const existingCoupon = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, "WELCOME10") });
  if (!existingCoupon) {
    await db.insert(schema.coupons).values({
      code: "WELCOME10",
      description: "10% off your first order",
      type: "PERCENTAGE",
      value: "10",
      minOrderAmount: "50",
      usageLimit: 100,
      isActive: true,
    });
  }
  console.log("✅ Coupon created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin: admin@store.com / admin123");
  console.log("  Staff: staff@store.com / staff123");
  console.log("  Customer: customer@example.com / customer123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
