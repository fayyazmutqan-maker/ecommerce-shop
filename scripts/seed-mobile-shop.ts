import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../lib/schema";
import "dotenv/config";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

// ============================================================
// HELPERS
// ============================================================

function placeholder(name: string, w = 600, h = 600) {
  return `https://placehold.co/${w}x${h}/e2e8f0/64748b?text=${encodeURIComponent(name)}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ============================================================
// MAIN SEED
// ============================================================

async function main() {
  console.log("📱 Seeding Mobile Shop data...\n");

  // ----------------------------------------------------------
  // 1. USERS
  // ----------------------------------------------------------
  const adminPassword = await bcrypt.hash("admin123", 12);
  const staffPassword = await bcrypt.hash("staff123", 12);
  const customerPassword = await bcrypt.hash("customer123", 12);

  const admin = await upsertUser({ email: "admin@mobilehub.sa", name: "Khalid Al-Rashid", password: adminPassword, role: "ADMIN", phone: "+966 50 100 0001" });
  const staff = await upsertUser({ email: "staff@mobilehub.sa", name: "Sara Al-Fahad", password: staffPassword, role: "STAFF", phone: "+966 50 100 0002" });
  const customer1 = await upsertUser({ email: "ahmed@gmail.com", name: "Ahmed Al-Dosari", password: customerPassword, role: "CUSTOMER", phone: "+966 55 123 4567" });
  const customer2 = await upsertUser({ email: "fatima@gmail.com", name: "Fatima Al-Harbi", password: customerPassword, role: "CUSTOMER", phone: "+966 55 234 5678" });
  const customer3 = await upsertUser({ email: "omar@gmail.com", name: "Omar Al-Otaibi", password: customerPassword, role: "CUSTOMER", phone: "+966 55 345 6789" });
  const customer4 = await upsertUser({ email: "noura@gmail.com", name: "Noura Al-Dawsari", password: customerPassword, role: "CUSTOMER", phone: "+966 55 456 7890" });
  const customer5 = await upsertUser({ email: "mohammed@gmail.com", name: "Mohammed Al-Qahtani", password: customerPassword, role: "CUSTOMER", phone: "+966 55 567 8901" });
  console.log("✅ Users created (1 admin, 1 staff, 5 customers)");

  // ----------------------------------------------------------
  // 2. STORE SETTINGS
  // ----------------------------------------------------------
  const existingSettings = await db.query.storeSettings.findFirst({ where: eq(schema.storeSettings.id, "default") });
  if (!existingSettings) {
    await db.insert(schema.storeSettings).values({
      id: "default",
      storeName: "MobileHub",
      storeDescription: "Saudi Arabia's premier destination for smartphones, tablets, and mobile accessories",
      storeEmail: "support@mobilehub.sa",
      storePhone: "+966 11 234 5678",
      storeAddress: "Olaya Street, Riyadh 12251, Saudi Arabia",
      currency: "SAR",
      currencySymbol: "SAR",
      taxRate: 15,
      posEnabled: true,
      codEnabled: true,
      socialInstagram: "https://instagram.com/mobilehub.sa",
      socialTwitter: "https://twitter.com/mobilehub_sa",
      metaTitle: "MobileHub – Smartphones & Accessories | Saudi Arabia",
      metaDescription: "Shop the latest smartphones, tablets, cases, chargers and accessories. Free delivery across Saudi Arabia on orders over SAR 200.",
      freeShippingMin: "200",
    });
  } else {
    await db.update(schema.storeSettings).set({
      storeName: "MobileHub",
      storeDescription: "Saudi Arabia's premier destination for smartphones, tablets, and mobile accessories",
      storeEmail: "support@mobilehub.sa",
      storePhone: "+966 11 234 5678",
      storeAddress: "Olaya Street, Riyadh 12251, Saudi Arabia",
    }).where(eq(schema.storeSettings.id, "default"));
  }
  console.log("✅ Store settings configured");

  // ----------------------------------------------------------
  // 3. CATEGORIES
  // ----------------------------------------------------------
  const smartphones = await upsertCategory({ name: "Smartphones", slug: "smartphones", description: "Latest flagship and mid-range smartphones from top brands", sortOrder: 1, isActive: true });
  const tablets = await upsertCategory({ name: "Tablets", slug: "tablets", description: "Tablets and iPads for work and entertainment", sortOrder: 2, isActive: true });
  const accessories = await upsertCategory({ name: "Accessories", slug: "accessories", description: "Cases, chargers, cables, and screen protectors", sortOrder: 3, isActive: true });
  const smartwatches = await upsertCategory({ name: "Smartwatches", slug: "smartwatches", description: "Smartwatches and fitness trackers from leading brands", sortOrder: 4, isActive: true });
  const audio = await upsertCategory({ name: "Audio", slug: "audio", description: "Headphones, earbuds, and portable speakers", sortOrder: 5, isActive: true });
  const powerBanks = await upsertCategory({ name: "Power Banks & Chargers", slug: "power-banks-chargers", description: "Power banks, wall chargers, and wireless chargers", sortOrder: 6, isActive: true });

  // Subcategories for Accessories
  const casesCovers = await upsertCategory({ name: "Cases & Covers", slug: "cases-covers", description: "Protective cases and covers for all phone models", parentId: accessories.id, sortOrder: 1, isActive: true });
  const screenProtectors = await upsertCategory({ name: "Screen Protectors", slug: "screen-protectors", description: "Tempered glass and film screen protectors", parentId: accessories.id, sortOrder: 2, isActive: true });
  const cablesAdapters = await upsertCategory({ name: "Cables & Adapters", slug: "cables-adapters", description: "Lightning, USB-C, and micro USB cables", parentId: accessories.id, sortOrder: 3, isActive: true });

  console.log("✅ Categories created (6 main + 3 sub-categories)");

  // ----------------------------------------------------------
  // 4. PRODUCTS
  // ----------------------------------------------------------
  const productsData: ProductSeed[] = [
    // === SMARTPHONES ===
    {
      name: "iPhone 16 Pro Max",
      slug: "iphone-16-pro-max",
      description: "The most advanced iPhone ever. Featuring the A18 Pro chip, a 48MP camera system with 5x Telephoto, and an all-day battery life. The titanium design is both lightweight and incredibly durable. Available in Desert Titanium, Natural Titanium, White Titanium, and Black Titanium.",
      shortDescription: "A18 Pro chip, 48MP camera, titanium design",
      sku: "IPH16PM-256",
      barcode: "1000000000001",
      price: "5199.00",
      compareAtPrice: "5499.00",
      costPrice: "4200.00",
      quantity: 85,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Apple",
      tags: "iphone,apple,flagship,5g,titanium",
      productType: "Smartphone",
      weight: 0.227,
      countryOfOrigin: "China",
      warrantyInfo: "1 year Apple warranty + 1 year store warranty",
      estimatedDelivery: "1-3 business days",
      seoTitle: "iPhone 16 Pro Max 256GB | Buy Online in Saudi Arabia",
      seoDescription: "Buy iPhone 16 Pro Max with A18 Pro chip and 48MP camera. Free delivery across KSA.",
      categorySlug: "smartphones",
      variants: [
        { name: "256GB - Desert Titanium", sku: "IPH16PM-256-DT", price: "5199.00", compareAtPrice: "5499.00", costPrice: "4200.00", quantity: 25, option1: "256GB", option2: "Desert Titanium" },
        { name: "256GB - Natural Titanium", sku: "IPH16PM-256-NT", price: "5199.00", compareAtPrice: "5499.00", costPrice: "4200.00", quantity: 20, option1: "256GB", option2: "Natural Titanium" },
        { name: "512GB - Black Titanium", sku: "IPH16PM-512-BT", price: "5999.00", compareAtPrice: "6299.00", costPrice: "4800.00", quantity: 15, option1: "512GB", option2: "Black Titanium" },
        { name: "1TB - White Titanium", sku: "IPH16PM-1TB-WT", price: "6999.00", costPrice: "5600.00", quantity: 10, option1: "1TB", option2: "White Titanium" },
      ],
    },
    {
      name: "Samsung Galaxy S25 Ultra",
      slug: "samsung-galaxy-s25-ultra",
      description: "The Galaxy S25 Ultra redefines mobile AI with Galaxy AI built in. Powered by the Snapdragon 8 Elite, it features a 200MP camera, S Pen, and a stunning 6.9-inch Dynamic AMOLED display with titanium frame.",
      shortDescription: "Snapdragon 8 Elite, 200MP camera, S Pen, Galaxy AI",
      sku: "SGS25U-256",
      barcode: "1000000000002",
      price: "4999.00",
      compareAtPrice: "5299.00",
      costPrice: "3900.00",
      quantity: 90,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Samsung",
      tags: "samsung,galaxy,flagship,5g,s-pen,ai",
      productType: "Smartphone",
      weight: 0.218,
      countryOfOrigin: "South Korea",
      warrantyInfo: "1 year Samsung warranty + 1 year store warranty",
      estimatedDelivery: "1-3 business days",
      categorySlug: "smartphones",
      variants: [
        { name: "256GB - Titanium Black", sku: "SGS25U-256-TB", price: "4999.00", compareAtPrice: "5299.00", costPrice: "3900.00", quantity: 30, option1: "256GB", option2: "Titanium Black" },
        { name: "256GB - Titanium Silver", sku: "SGS25U-256-TS", price: "4999.00", compareAtPrice: "5299.00", costPrice: "3900.00", quantity: 20, option1: "256GB", option2: "Titanium Silver" },
        { name: "512GB - Titanium Blue", sku: "SGS25U-512-TBL", price: "5599.00", costPrice: "4400.00", quantity: 20, option1: "512GB", option2: "Titanium Blue" },
        { name: "1TB - Titanium Gray", sku: "SGS25U-1TB-TG", price: "6399.00", costPrice: "5100.00", quantity: 10, option1: "1TB", option2: "Titanium Gray" },
      ],
    },
    {
      name: "iPhone 16",
      slug: "iphone-16",
      description: "iPhone 16 features the powerful A18 chip, a new 48MP camera with 2x Telephoto, and Action button. Dynamic Island keeps your activities front and center. USB-C connector for universal charging.",
      shortDescription: "A18 chip, 48MP camera, Dynamic Island",
      sku: "IPH16-128",
      price: "3499.00",
      compareAtPrice: "3699.00",
      costPrice: "2800.00",
      quantity: 120,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Apple",
      tags: "iphone,apple,5g",
      productType: "Smartphone",
      weight: 0.170,
      countryOfOrigin: "China",
      warrantyInfo: "1 year Apple warranty + 1 year store warranty",
      estimatedDelivery: "1-3 business days",
      categorySlug: "smartphones",
      variants: [
        { name: "128GB - Black", sku: "IPH16-128-BK", price: "3499.00", compareAtPrice: "3699.00", costPrice: "2800.00", quantity: 30, option1: "128GB", option2: "Black" },
        { name: "128GB - White", sku: "IPH16-128-WH", price: "3499.00", compareAtPrice: "3699.00", costPrice: "2800.00", quantity: 25, option1: "128GB", option2: "White" },
        { name: "256GB - Blue", sku: "IPH16-256-BL", price: "3999.00", costPrice: "3200.00", quantity: 20, option1: "256GB", option2: "Blue" },
        { name: "256GB - Pink", sku: "IPH16-256-PK", price: "3999.00", costPrice: "3200.00", quantity: 15, option1: "256GB", option2: "Pink" },
      ],
    },
    {
      name: "Samsung Galaxy S25",
      slug: "samsung-galaxy-s25",
      description: "Galaxy S25 combines premium performance with sleek design. Snapdragon 8 Elite chip, 50MP triple camera, and the AI-powered Galaxy experience in a compact, everyday flagship.",
      shortDescription: "Snapdragon 8 Elite, 50MP camera, Galaxy AI",
      sku: "SGS25-128",
      price: "3399.00",
      costPrice: "2600.00",
      quantity: 100,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,galaxy,5g,ai",
      productType: "Smartphone",
      weight: 0.162,
      countryOfOrigin: "South Korea",
      categorySlug: "smartphones",
      variants: [
        { name: "128GB - Navy", sku: "SGS25-128-NV", price: "3399.00", costPrice: "2600.00", quantity: 35, option1: "128GB", option2: "Navy" },
        { name: "128GB - Icy Blue", sku: "SGS25-128-IB", price: "3399.00", costPrice: "2600.00", quantity: 30, option1: "128GB", option2: "Icy Blue" },
        { name: "256GB - Mint", sku: "SGS25-256-MT", price: "3799.00", costPrice: "2900.00", quantity: 20, option1: "256GB", option2: "Mint" },
      ],
    },
    {
      name: "Google Pixel 9 Pro",
      slug: "google-pixel-9-pro",
      description: "The best of Google AI in a phone. Tensor G4 chip, triple camera with 50MP main sensor, 7 years of OS and security updates. Pure Android experience with the most intelligent camera system.",
      shortDescription: "Tensor G4, triple AI camera, 7yr updates",
      sku: "GP9P-256",
      price: "3799.00",
      compareAtPrice: "3999.00",
      costPrice: "2900.00",
      quantity: 45,
      status: "ACTIVE",
      vendor: "Google",
      tags: "google,pixel,ai,camera,android",
      productType: "Smartphone",
      weight: 0.199,
      countryOfOrigin: "China",
      categorySlug: "smartphones",
      variants: [
        { name: "256GB - Obsidian", sku: "GP9P-256-OB", price: "3799.00", compareAtPrice: "3999.00", costPrice: "2900.00", quantity: 15, option1: "256GB", option2: "Obsidian" },
        { name: "256GB - Porcelain", sku: "GP9P-256-PR", price: "3799.00", compareAtPrice: "3999.00", costPrice: "2900.00", quantity: 15, option1: "256GB", option2: "Porcelain" },
        { name: "512GB - Hazel", sku: "GP9P-512-HZ", price: "4299.00", costPrice: "3300.00", quantity: 10, option1: "512GB", option2: "Hazel" },
      ],
    },
    {
      name: "Samsung Galaxy Z Fold 6",
      slug: "samsung-galaxy-z-fold-6",
      description: "Unfold a bigger, more immersive screen. The Galaxy Z Fold 6 features a 7.6-inch main display, Snapdragon 8 Gen 3 chip, and Flex Mode for versatile multitasking. Thinner, lighter, and more durable than ever.",
      shortDescription: "7.6\" foldable display, Flex Mode, S Pen compatible",
      sku: "SGZF6-256",
      price: "6999.00",
      compareAtPrice: "7499.00",
      costPrice: "5500.00",
      quantity: 30,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Samsung",
      tags: "samsung,galaxy,foldable,z-fold,premium",
      productType: "Smartphone",
      weight: 0.239,
      countryOfOrigin: "South Korea",
      categorySlug: "smartphones",
      variants: [
        { name: "256GB - Silver", sku: "SGZF6-256-SV", price: "6999.00", compareAtPrice: "7499.00", costPrice: "5500.00", quantity: 10, option1: "256GB", option2: "Silver" },
        { name: "512GB - Navy", sku: "SGZF6-512-NV", price: "7599.00", costPrice: "6000.00", quantity: 10, option1: "512GB", option2: "Navy" },
        { name: "1TB - Black", sku: "SGZF6-1TB-BK", price: "8399.00", costPrice: "6700.00", quantity: 5, option1: "1TB", option2: "Black" },
      ],
    },
    {
      name: "iPhone SE (4th Generation)",
      slug: "iphone-se-4",
      description: "The most affordable iPhone with Apple Intelligence. A16 Bionic chip, 48MP camera, 6.1-inch OLED display, and Face ID. Everything you love about iPhone at an accessible price.",
      shortDescription: "A16 Bionic, 48MP camera, OLED display",
      sku: "IPHSE4-128",
      price: "1899.00",
      costPrice: "1400.00",
      quantity: 200,
      status: "ACTIVE",
      vendor: "Apple",
      tags: "iphone,apple,budget,se",
      productType: "Smartphone",
      weight: 0.167,
      countryOfOrigin: "China",
      categorySlug: "smartphones",
      variants: [
        { name: "128GB - Midnight", sku: "IPHSE4-128-MN", price: "1899.00", costPrice: "1400.00", quantity: 80, option1: "128GB", option2: "Midnight" },
        { name: "128GB - Starlight", sku: "IPHSE4-128-SL", price: "1899.00", costPrice: "1400.00", quantity: 60, option1: "128GB", option2: "Starlight" },
        { name: "256GB - Midnight", sku: "IPHSE4-256-MN", price: "2199.00", costPrice: "1600.00", quantity: 30, option1: "256GB", option2: "Midnight" },
      ],
    },
    {
      name: "Samsung Galaxy A55 5G",
      slug: "samsung-galaxy-a55-5g",
      description: "Premium mid-range experience with Super AMOLED display, 50MP OIS camera, water resistance (IP67), and a massive 5000mAh battery. Incredible value without compromise.",
      shortDescription: "Super AMOLED, 50MP OIS, 5000mAh, IP67",
      sku: "SGA55-128",
      price: "1399.00",
      compareAtPrice: "1599.00",
      costPrice: "900.00",
      quantity: 150,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,galaxy,mid-range,5g,budget",
      productType: "Smartphone",
      weight: 0.213,
      countryOfOrigin: "Vietnam",
      categorySlug: "smartphones",
      variants: [
        { name: "128GB - Awesome Navy", sku: "SGA55-128-AN", price: "1399.00", compareAtPrice: "1599.00", costPrice: "900.00", quantity: 50, option1: "128GB", option2: "Awesome Navy" },
        { name: "128GB - Awesome Lilac", sku: "SGA55-128-AL", price: "1399.00", compareAtPrice: "1599.00", costPrice: "900.00", quantity: 50, option1: "128GB", option2: "Awesome Lilac" },
        { name: "256GB - Awesome Blue", sku: "SGA55-256-AB", price: "1599.00", costPrice: "1050.00", quantity: 30, option1: "256GB", option2: "Awesome Blue" },
      ],
    },

    // === TABLETS ===
    {
      name: "iPad Pro M4 11-inch",
      slug: "ipad-pro-m4-11",
      description: "The thinnest, most powerful iPad ever. M4 chip with up to 10-core GPU, Ultra Retina XDR display with tandem OLED, Apple Pencil Pro support, and Thunderbolt/USB 4.",
      shortDescription: "M4 chip, Ultra Retina XDR OLED display",
      sku: "IPADM4-11-256",
      price: "4199.00",
      compareAtPrice: "4399.00",
      costPrice: "3400.00",
      quantity: 40,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Apple",
      tags: "ipad,apple,tablet,m4,pro",
      productType: "Tablet",
      weight: 0.444,
      countryOfOrigin: "China",
      warrantyInfo: "1 year Apple warranty",
      categorySlug: "tablets",
      variants: [
        { name: "256GB Wi-Fi - Space Black", sku: "IPADM4-11-256-WF-SB", price: "4199.00", compareAtPrice: "4399.00", costPrice: "3400.00", quantity: 15, option1: "256GB Wi-Fi", option2: "Space Black" },
        { name: "256GB Wi-Fi - Silver", sku: "IPADM4-11-256-WF-SV", price: "4199.00", compareAtPrice: "4399.00", costPrice: "3400.00", quantity: 10, option1: "256GB Wi-Fi", option2: "Silver" },
        { name: "512GB Wi-Fi+Cell - Space Black", sku: "IPADM4-11-512-CL-SB", price: "5499.00", costPrice: "4400.00", quantity: 8, option1: "512GB Wi-Fi+Cell", option2: "Space Black" },
      ],
    },
    {
      name: "Samsung Galaxy Tab S10 Ultra",
      slug: "samsung-galaxy-tab-s10-ultra",
      description: "The biggest, most immersive Galaxy Tab with a 14.6-inch Dynamic AMOLED display. MediaTek Dimensity 9300+, S Pen included, DeX mode for laptop-like productivity.",
      shortDescription: "14.6\" AMOLED, S Pen included, DeX mode",
      sku: "SGTS10U-256",
      price: "4599.00",
      costPrice: "3600.00",
      quantity: 25,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,galaxy,tablet,tab-s10,ultra",
      productType: "Tablet",
      weight: 0.718,
      countryOfOrigin: "South Korea",
      categorySlug: "tablets",
      variants: [
        { name: "256GB Wi-Fi - Graphite", sku: "SGTS10U-256-WF-GR", price: "4599.00", costPrice: "3600.00", quantity: 10, option1: "256GB Wi-Fi", option2: "Graphite" },
        { name: "512GB Wi-Fi+Cell - Graphite", sku: "SGTS10U-512-CL-GR", price: "5399.00", costPrice: "4200.00", quantity: 8, option1: "512GB Wi-Fi+Cell", option2: "Graphite" },
      ],
    },
    {
      name: "iPad Air M2",
      slug: "ipad-air-m2",
      description: "Supercharged by M2. iPad Air delivers incredible performance with Apple Intelligence, a stunning 11-inch Liquid Retina display, and all-day battery. Perfect for creativity and productivity.",
      shortDescription: "M2 chip, 11\" Liquid Retina, all-day battery",
      sku: "IPADAM2-128",
      price: "2499.00",
      costPrice: "1900.00",
      quantity: 60,
      status: "ACTIVE",
      vendor: "Apple",
      tags: "ipad,apple,tablet,air,m2",
      productType: "Tablet",
      weight: 0.462,
      countryOfOrigin: "China",
      categorySlug: "tablets",
      variants: [
        { name: "128GB Wi-Fi - Blue", sku: "IPADAM2-128-WF-BL", price: "2499.00", costPrice: "1900.00", quantity: 20, option1: "128GB Wi-Fi", option2: "Blue" },
        { name: "128GB Wi-Fi - Starlight", sku: "IPADAM2-128-WF-SL", price: "2499.00", costPrice: "1900.00", quantity: 20, option1: "128GB Wi-Fi", option2: "Starlight" },
        { name: "256GB Wi-Fi - Space Gray", sku: "IPADAM2-256-WF-SG", price: "2899.00", costPrice: "2200.00", quantity: 15, option1: "256GB Wi-Fi", option2: "Space Gray" },
      ],
    },

    // === SMARTWATCHES ===
    {
      name: "Apple Watch Ultra 2",
      slug: "apple-watch-ultra-2",
      description: "The most rugged and capable Apple Watch. 49mm titanium case, precision dual-frequency GPS, up to 36 hours of battery life, and 100m water resistance. Built for adventure.",
      shortDescription: "49mm titanium, dual GPS, 36hr battery",
      sku: "AWU2-49",
      price: "3699.00",
      costPrice: "2800.00",
      quantity: 35,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Apple",
      tags: "apple,watch,ultra,smartwatch,fitness",
      productType: "Smartwatch",
      weight: 0.061,
      countryOfOrigin: "China",
      categorySlug: "smartwatches",
      variants: [
        { name: "Orange Alpine Loop", sku: "AWU2-49-OAL", price: "3699.00", costPrice: "2800.00", quantity: 12, option1: "49mm", option2: "Orange Alpine Loop" },
        { name: "Green Alpine Loop", sku: "AWU2-49-GAL", price: "3699.00", costPrice: "2800.00", quantity: 10, option1: "49mm", option2: "Green Alpine Loop" },
        { name: "Blue Ocean Band", sku: "AWU2-49-BOB", price: "3699.00", costPrice: "2800.00", quantity: 8, option1: "49mm", option2: "Blue Ocean Band" },
      ],
    },
    {
      name: "Samsung Galaxy Watch 7",
      slug: "samsung-galaxy-watch-7",
      description: "Smarter health monitoring powered by Galaxy AI. BioActive sensor for heart rate, body composition, and sleep tracking. Wear OS with rotating bezel navigation.",
      shortDescription: "Galaxy AI health, BioActive sensor, Wear OS",
      sku: "SGW7-44",
      price: "1299.00",
      compareAtPrice: "1499.00",
      costPrice: "850.00",
      quantity: 60,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,galaxy,watch,smartwatch,fitness",
      productType: "Smartwatch",
      weight: 0.033,
      countryOfOrigin: "South Korea",
      categorySlug: "smartwatches",
      variants: [
        { name: "44mm - Green", sku: "SGW7-44-GR", price: "1299.00", compareAtPrice: "1499.00", costPrice: "850.00", quantity: 20, option1: "44mm", option2: "Green" },
        { name: "44mm - Silver", sku: "SGW7-44-SV", price: "1299.00", compareAtPrice: "1499.00", costPrice: "850.00", quantity: 20, option1: "44mm", option2: "Silver" },
        { name: "40mm - Cream", sku: "SGW7-40-CR", price: "1099.00", compareAtPrice: "1299.00", costPrice: "750.00", quantity: 15, option1: "40mm", option2: "Cream" },
      ],
    },
    {
      name: "Apple Watch SE (3rd Gen)",
      slug: "apple-watch-se-3",
      description: "The affordable Apple Watch packed with essential features. Crash Detection, heart rate notifications, workout tracking, and seamless iPhone integration.",
      shortDescription: "Essential features, Crash Detection, fitness tracking",
      sku: "AWSE3-44",
      price: "999.00",
      costPrice: "650.00",
      quantity: 80,
      status: "ACTIVE",
      vendor: "Apple",
      tags: "apple,watch,se,smartwatch,budget",
      productType: "Smartwatch",
      weight: 0.033,
      countryOfOrigin: "China",
      categorySlug: "smartwatches",
      variants: [
        { name: "44mm - Midnight", sku: "AWSE3-44-MN", price: "999.00", costPrice: "650.00", quantity: 30, option1: "44mm", option2: "Midnight" },
        { name: "44mm - Starlight", sku: "AWSE3-44-SL", price: "999.00", costPrice: "650.00", quantity: 25, option1: "44mm", option2: "Starlight" },
        { name: "40mm - Silver", sku: "AWSE3-40-SV", price: "899.00", costPrice: "580.00", quantity: 20, option1: "40mm", option2: "Silver" },
      ],
    },

    // === AUDIO ===
    {
      name: "AirPods Pro 2 (USB-C)",
      slug: "airpods-pro-2-usbc",
      description: "Rebuilt from the sound up. Active Noise Cancellation up to 2x more effective. Adaptive Audio that dynamically combines transparency and noise cancellation. USB-C charging case with speaker and lanyard loop.",
      shortDescription: "2x ANC, Adaptive Audio, USB-C case",
      sku: "APP2C",
      price: "999.00",
      costPrice: "700.00",
      quantity: 150,
      status: "ACTIVE",
      isFeatured: true,
      vendor: "Apple",
      tags: "airpods,apple,earbuds,anc,wireless",
      productType: "Earbuds",
      weight: 0.051,
      countryOfOrigin: "China",
      categorySlug: "audio",
    },
    {
      name: "Samsung Galaxy Buds3 Pro",
      slug: "samsung-galaxy-buds3-pro",
      description: "Open-type TWS earbuds with superior Active Noise Cancellation and 360 Audio. Galaxy AI translates conversations in real-time. Ultra Hi-Fi sound with 24-bit audio.",
      shortDescription: "ANC, 360 Audio, Galaxy AI translation",
      sku: "SGB3P",
      price: "899.00",
      compareAtPrice: "999.00",
      costPrice: "550.00",
      quantity: 70,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,galaxy,buds,earbuds,anc",
      productType: "Earbuds",
      weight: 0.049,
      countryOfOrigin: "South Korea",
      categorySlug: "audio",
    },
    {
      name: "Sony WH-1000XM5",
      slug: "sony-wh-1000xm5",
      description: "Industry-leading noise cancelling headphones with Auto NC Optimizer. Crystal clear hands-free calling with 8 microphones. 30-hour battery life. Lightweight and comfortable for all-day wear.",
      shortDescription: "Industry-leading ANC, 30hr battery, 8 mics",
      sku: "SXMH5",
      price: "1499.00",
      compareAtPrice: "1699.00",
      costPrice: "950.00",
      quantity: 55,
      status: "ACTIVE",
      vendor: "Sony",
      tags: "sony,headphones,anc,wireless,premium",
      productType: "Headphones",
      weight: 0.250,
      countryOfOrigin: "Malaysia",
      categorySlug: "audio",
      variants: [
        { name: "Black", sku: "SXMH5-BK", price: "1499.00", compareAtPrice: "1699.00", costPrice: "950.00", quantity: 30, option1: "Black" },
        { name: "Silver", sku: "SXMH5-SV", price: "1499.00", compareAtPrice: "1699.00", costPrice: "950.00", quantity: 20, option1: "Silver" },
      ],
    },
    {
      name: "JBL Flip 6",
      slug: "jbl-flip-6",
      description: "Bold sound for every adventure. JBL Flip 6 delivers powerful JBL Original Pro Sound with racetrack-shaped driver. IP67 waterproof and dustproof. 12 hours of playtime. PartyBoost compatible.",
      shortDescription: "JBL Pro Sound, IP67, 12hr playtime",
      sku: "JBLF6",
      price: "449.00",
      compareAtPrice: "499.00",
      costPrice: "250.00",
      quantity: 100,
      status: "ACTIVE",
      vendor: "JBL",
      tags: "jbl,speaker,bluetooth,portable,waterproof",
      productType: "Speaker",
      weight: 0.550,
      countryOfOrigin: "China",
      categorySlug: "audio",
      variants: [
        { name: "Black", sku: "JBLF6-BK", price: "449.00", compareAtPrice: "499.00", costPrice: "250.00", quantity: 25, option1: "Black" },
        { name: "Blue", sku: "JBLF6-BL", price: "449.00", compareAtPrice: "499.00", costPrice: "250.00", quantity: 20, option1: "Blue" },
        { name: "Red", sku: "JBLF6-RD", price: "449.00", compareAtPrice: "499.00", costPrice: "250.00", quantity: 20, option1: "Red" },
        { name: "Teal", sku: "JBLF6-TL", price: "449.00", compareAtPrice: "499.00", costPrice: "250.00", quantity: 15, option1: "Teal" },
      ],
    },

    // === POWER BANKS & CHARGERS ===
    {
      name: "Anker 737 Power Bank (24,000mAh)",
      slug: "anker-737-power-bank",
      description: "Massive 24,000mAh capacity with 140W max output. Charge a MacBook Pro, iPhone, and iPad simultaneously. Smart digital display shows remaining power, estimated charge time, and wattage.",
      shortDescription: "24,000mAh, 140W output, 3-device charging",
      sku: "ANK737-24K",
      price: "449.00",
      compareAtPrice: "499.00",
      costPrice: "280.00",
      quantity: 80,
      status: "ACTIVE",
      vendor: "Anker",
      tags: "anker,power-bank,charger,usb-c,travel",
      productType: "Power Bank",
      weight: 0.632,
      countryOfOrigin: "China",
      categorySlug: "power-banks-chargers",
    },
    {
      name: "Apple MagSafe Charger",
      slug: "apple-magsafe-charger",
      description: "Perfectly aligned wireless charging for iPhone 12 and later. Up to 15W fast wireless charging. Attaches magnetically for effortless alignment every time.",
      shortDescription: "15W magnetic wireless charging for iPhone",
      sku: "APMSC",
      price: "199.00",
      costPrice: "100.00",
      quantity: 200,
      status: "ACTIVE",
      vendor: "Apple",
      tags: "apple,magsafe,wireless,charger",
      productType: "Charger",
      weight: 0.065,
      countryOfOrigin: "China",
      categorySlug: "power-banks-chargers",
    },
    {
      name: "Samsung 45W Super Fast Charger",
      slug: "samsung-45w-charger",
      description: "Ultra-fast 45W PD 3.0 wall charger designed for Galaxy devices. Charge your Galaxy S25 from 0 to 65% in just 30 minutes. USB-C output with compact folding plug.",
      shortDescription: "45W PD 3.0, 0-65% in 30min, USB-C",
      sku: "SM45WC",
      price: "149.00",
      costPrice: "55.00",
      quantity: 180,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,charger,fast-charging,usb-c,wall",
      productType: "Charger",
      weight: 0.078,
      countryOfOrigin: "Vietnam",
      categorySlug: "power-banks-chargers",
    },
    {
      name: "Anker Nano 67W Charger",
      slug: "anker-nano-67w-charger",
      description: "Ultra-compact 67W 3-port charger (2x USB-C + 1x USB-A). GaN II technology makes it 50% smaller than the original MacBook charger while delivering the same power.",
      shortDescription: "67W GaN II, 3 ports, ultra-compact",
      sku: "ANKN67",
      price: "179.00",
      costPrice: "85.00",
      quantity: 120,
      status: "ACTIVE",
      vendor: "Anker",
      tags: "anker,charger,gan,usb-c,multi-port",
      productType: "Charger",
      weight: 0.126,
      countryOfOrigin: "China",
      categorySlug: "power-banks-chargers",
    },

    // === ACCESSORIES ===
    {
      name: "Apple iPhone 16 Pro Max Clear Case with MagSafe",
      slug: "apple-iphone-16-pm-clear-case",
      description: "Designed by Apple for iPhone 16 Pro Max. Crystal-clear polycarbonate back and flexible edges. Built-in magnets for MagSafe alignment. Scratch-resistant coating that won't yellow over time.",
      shortDescription: "Clear case with MagSafe, anti-yellow coating",
      sku: "AIPH16PM-CC",
      price: "249.00",
      costPrice: "90.00",
      quantity: 300,
      status: "ACTIVE",
      vendor: "Apple",
      tags: "case,iphone,magsafe,clear,apple",
      productType: "Case",
      weight: 0.030,
      countryOfOrigin: "China",
      categorySlug: "cases-covers",
    },
    {
      name: "Spigen Tough Armor Galaxy S25 Ultra Case",
      slug: "spigen-tough-armor-s25-ultra",
      description: "Military-grade protection with Air Cushion Technology. Dual-layer design combines TPU and polycarbonate for maximum impact resistance. Built-in kickstand for hands-free viewing.",
      shortDescription: "Military-grade, Air Cushion, built-in kickstand",
      sku: "SPTA-S25U",
      price: "149.00",
      costPrice: "40.00",
      quantity: 200,
      status: "ACTIVE",
      vendor: "Spigen",
      tags: "case,samsung,spigen,tough,kickstand",
      productType: "Case",
      weight: 0.045,
      countryOfOrigin: "South Korea",
      categorySlug: "cases-covers",
      variants: [
        { name: "Black", sku: "SPTA-S25U-BK", price: "149.00", costPrice: "40.00", quantity: 80, option1: "Black" },
        { name: "Metal Slate", sku: "SPTA-S25U-MS", price: "149.00", costPrice: "40.00", quantity: 60, option1: "Metal Slate" },
        { name: "Gunmetal", sku: "SPTA-S25U-GM", price: "149.00", costPrice: "40.00", quantity: 40, option1: "Gunmetal" },
      ],
    },
    {
      name: "Belkin UltraGlass Screen Protector for iPhone 16 Pro Max",
      slug: "belkin-ultraglass-iphone-16-pm",
      description: "Double-ion exchange strengthened tempered glass. 9H hardness for superior scratch resistance. Anti-microbial coating. Easy Align tray included for bubble-free installation.",
      shortDescription: "9H tempered glass, anti-microbial, easy install",
      sku: "BKUG-IPH16PM",
      price: "159.00",
      costPrice: "35.00",
      quantity: 400,
      status: "ACTIVE",
      vendor: "Belkin",
      tags: "screen-protector,tempered-glass,belkin,iphone",
      productType: "Screen Protector",
      weight: 0.015,
      countryOfOrigin: "China",
      categorySlug: "screen-protectors",
    },
    {
      name: "Anker USB-C to Lightning Cable (1.8m)",
      slug: "anker-usbc-to-lightning-cable",
      description: "MFi-certified cable for reliable charging and data sync. Braided nylon exterior for 12,000+ bend lifespan. Supports fast charging with compatible adapters.",
      shortDescription: "MFi certified, braided nylon, 1.8m",
      sku: "ANKCL-18",
      price: "69.00",
      costPrice: "18.00",
      quantity: 500,
      status: "ACTIVE",
      vendor: "Anker",
      tags: "cable,usb-c,lightning,anker,mfi",
      productType: "Cable",
      weight: 0.035,
      countryOfOrigin: "China",
      categorySlug: "cables-adapters",
    },
    {
      name: "Samsung Galaxy Z Flip 6",
      slug: "samsung-galaxy-z-flip-6",
      description: "Compact and stylish foldable phone. 3.4-inch FlexWindow for quick access to notifications without opening. 50MP camera, Galaxy AI, and a massive battery upgrade to 4000mAh.",
      shortDescription: "Compact foldable, FlexWindow, 50MP, Galaxy AI",
      sku: "SGZFLIP6-256",
      price: "4399.00",
      compareAtPrice: "4699.00",
      costPrice: "3400.00",
      quantity: 40,
      status: "ACTIVE",
      vendor: "Samsung",
      tags: "samsung,galaxy,foldable,z-flip,compact",
      productType: "Smartphone",
      weight: 0.187,
      countryOfOrigin: "South Korea",
      categorySlug: "smartphones",
      variants: [
        { name: "256GB - Mint", sku: "SGZFLIP6-256-MT", price: "4399.00", compareAtPrice: "4699.00", costPrice: "3400.00", quantity: 15, option1: "256GB", option2: "Mint" },
        { name: "256GB - Blue", sku: "SGZFLIP6-256-BL", price: "4399.00", compareAtPrice: "4699.00", costPrice: "3400.00", quantity: 10, option1: "256GB", option2: "Blue" },
        { name: "512GB - Yellow", sku: "SGZFLIP6-512-YL", price: "4899.00", costPrice: "3800.00", quantity: 8, option1: "512GB", option2: "Yellow" },
      ],
    },
    // DRAFT Product
    {
      name: "Nothing Phone (3)",
      slug: "nothing-phone-3",
      description: "Coming soon: Nothing Phone (3) with the next generation Glyph Interface, improved camera system, and Snapdragon chipset. Stay tuned for the official launch.",
      shortDescription: "Upcoming Nothing Phone with Glyph Interface",
      sku: "NP3-256",
      price: "2199.00",
      costPrice: "1500.00",
      quantity: 0,
      status: "DRAFT",
      vendor: "Nothing",
      tags: "nothing,phone,upcoming,glyph",
      productType: "Smartphone",
      categorySlug: "smartphones",
    },
  ];

  const createdProducts: Record<string, typeof schema.products.$inferSelect> = {};

  for (const p of productsData) {
    const { categorySlug, variants, ...productData } = p;
    const category = [smartphones, tablets, accessories, smartwatches, audio, powerBanks, casesCovers, screenProtectors, cablesAdapters]
      .find((c) => c.slug === categorySlug);

    let product = await db.query.products.findFirst({ where: eq(schema.products.slug, productData.slug) });
    if (!product) {
      [product] = await db.insert(schema.products).values({
        ...productData,
        isFeatured: productData.isFeatured ?? false,
      }).returning();

      if (category) {
        await db.insert(schema.productCategories).values({ productId: product.id, categoryId: category.id }).onConflictDoNothing();
      }
    }
    createdProducts[product.slug] = product;

    // Product image
    const imgExists = await db.query.productImages.findFirst({ where: eq(schema.productImages.productId, product.id) });
    if (!imgExists) {
      await db.insert(schema.productImages).values({
        productId: product.id,
        url: placeholder(product.name.split(" ").slice(0, 3).join("+")),
        alt: product.name,
        isPrimary: true,
        position: 0,
      });
    }

    // Variants
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const existingVariant = v.sku ? await db.query.productVariants.findFirst({ where: eq(schema.productVariants.sku, v.sku) }) : null;
        if (!existingVariant) {
          await db.insert(schema.productVariants).values({ ...v, productId: product.id }).onConflictDoNothing();
        }
      }
    }
  }
  console.log(`✅ Products created: ${productsData.length} (${productsData.filter(p => p.status === "ACTIVE").length} active, ${productsData.filter(p => p.status === "DRAFT").length} draft)`);

  // ----------------------------------------------------------
  // 5. SHIPPING ZONES & RATES
  // ----------------------------------------------------------
  const existingSZ = await db.query.shippingZones.findFirst({ where: eq(schema.shippingZones.name, "Saudi Arabia") });
  if (!existingSZ) {
    const [saudiZone] = await db.insert(schema.shippingZones).values({
      name: "Saudi Arabia",
      countries: "SA",
      isActive: true,
      sortOrder: 1,
    }).returning();

    await db.insert(schema.shippingRates).values([
      { zoneId: saudiZone.id, name: "Standard Delivery", type: "FLAT", price: "25.00", estimatedDays: "3-5 business days", isActive: true, sortOrder: 1 },
      { zoneId: saudiZone.id, name: "Express Delivery", type: "FLAT", price: "50.00", estimatedDays: "1-2 business days", isActive: true, sortOrder: 2 },
      { zoneId: saudiZone.id, name: "Free Shipping (200+ SAR)", type: "FLAT", price: "0.00", minOrderAmount: "200.00", estimatedDays: "3-5 business days", isActive: true, sortOrder: 3 },
    ]);

    const [gccZone] = await db.insert(schema.shippingZones).values({
      name: "GCC Countries",
      countries: "AE,BH,KW,OM,QA",
      isActive: true,
      sortOrder: 2,
    }).returning();

    await db.insert(schema.shippingRates).values([
      { zoneId: gccZone.id, name: "Standard International", type: "FLAT", price: "75.00", estimatedDays: "5-8 business days", isActive: true, sortOrder: 1 },
      { zoneId: gccZone.id, name: "Express International", type: "FLAT", price: "150.00", estimatedDays: "2-4 business days", isActive: true, sortOrder: 2 },
    ]);
  }
  console.log("✅ Shipping zones created (Saudi Arabia + GCC)");

  // ----------------------------------------------------------
  // 6. COUPONS & DISCOUNTS
  // ----------------------------------------------------------
  await upsertCoupon({ code: "WELCOME15", description: "15% off your first order", type: "PERCENTAGE", value: "15", minOrderAmount: "100", maxDiscountAmount: "200", usageLimit: 500, isActive: true });
  await upsertCoupon({ code: "MOBILE50", description: "SAR 50 off on orders above SAR 500", type: "FIXED", value: "50", minOrderAmount: "500", usageLimit: 200, isActive: true });
  await upsertCoupon({ code: "SUMMER25", description: "25% off summer sale", type: "PERCENTAGE", value: "25", minOrderAmount: "200", maxDiscountAmount: "500", usageLimit: 100, isActive: true, expiresAt: new Date("2026-09-30") });
  await upsertCoupon({ code: "FREESHIPKSA", description: "Free shipping within Saudi Arabia", type: "FIXED", value: "25", minOrderAmount: "0", usageLimit: 1000, isActive: true });
  console.log("✅ Coupons created (4)");

  // ----------------------------------------------------------
  // 7. ORDERS
  // ----------------------------------------------------------
  const iphone16pm = createdProducts["iphone-16-pro-max"];
  const s25ultra = createdProducts["samsung-galaxy-s25-ultra"];
  const airpods = createdProducts["airpods-pro-2-usbc"];
  const magsafe = createdProducts["apple-magsafe-charger"];
  const sonyXM5 = createdProducts["sony-wh-1000xm5"];
  const ipadPro = createdProducts["ipad-pro-m4-11"];
  const galaxyWatch = createdProducts["samsung-galaxy-watch-7"];
  const ankerPB = createdProducts["anker-737-power-bank"];
  const iphone16 = createdProducts["iphone-16"];
  const clearCase = createdProducts["apple-iphone-16-pm-clear-case"];

  if (iphone16pm && s25ultra) {
    const ordersToCreate = [
      {
        orderNumber: "MH-2026-0001",
        email: customer1.email,
        userId: customer1.id,
        phone: customer1.phone,
        status: "DELIVERED",
        paymentStatus: "PAID",
        fulfillmentStatus: "FULFILLED",
        paymentMethod: "TAP",
        shippingMethod: "Express Delivery",
        source: "ONLINE",
        items: [
          { product: iphone16pm, name: "iPhone 16 Pro Max - 256GB Desert Titanium", sku: "IPH16PM-256-DT", price: "5199.00", quantity: 1 },
          { product: clearCase, name: "Apple Clear Case with MagSafe", sku: "AIPH16PM-CC", price: "249.00", quantity: 1 },
        ],
        daysAgo: 25,
        shippingAddress: { firstName: "Ahmed", lastName: "Al-Dosari", address1: "123 King Fahd Road", city: "Riyadh", state: "Riyadh", postalCode: "12211", country: "Saudi Arabia", phone: "+966 55 123 4567" },
      },
      {
        orderNumber: "MH-2026-0002",
        email: customer2.email,
        userId: customer2.id,
        phone: customer2.phone,
        status: "DELIVERED",
        paymentStatus: "PAID",
        fulfillmentStatus: "FULFILLED",
        paymentMethod: "TAP",
        shippingMethod: "Standard Delivery",
        source: "ONLINE",
        items: [
          { product: s25ultra, name: "Samsung Galaxy S25 Ultra - 512GB Titanium Blue", sku: "SGS25U-512-TBL", price: "5599.00", quantity: 1 },
          { product: galaxyWatch, name: "Samsung Galaxy Watch 7 - 44mm Green", sku: "SGW7-44-GR", price: "1299.00", quantity: 1 },
        ],
        daysAgo: 20,
        shippingAddress: { firstName: "Fatima", lastName: "Al-Harbi", address1: "45 Prince Sultan Road", city: "Jeddah", state: "Makkah", postalCode: "23424", country: "Saudi Arabia", phone: "+966 55 234 5678" },
      },
      {
        orderNumber: "MH-2026-0003",
        email: customer3.email,
        userId: customer3.id,
        phone: customer3.phone,
        status: "SHIPPED",
        paymentStatus: "PAID",
        fulfillmentStatus: "FULFILLED",
        paymentMethod: "TAP",
        shippingMethod: "Express Delivery",
        trackingNumber: "SMSA1234567890",
        source: "ONLINE",
        items: [
          { product: airpods, name: "AirPods Pro 2 (USB-C)", sku: "APP2C", price: "999.00", quantity: 2 },
          { product: magsafe, name: "Apple MagSafe Charger", sku: "APMSC", price: "199.00", quantity: 1 },
        ],
        daysAgo: 5,
        shippingAddress: { firstName: "Omar", lastName: "Al-Otaibi", address1: "78 Corniche Road", city: "Dammam", state: "Eastern Province", postalCode: "31411", country: "Saudi Arabia", phone: "+966 55 345 6789" },
      },
      {
        orderNumber: "MH-2026-0004",
        email: customer4.email,
        userId: customer4.id,
        phone: customer4.phone,
        status: "PROCESSING",
        paymentStatus: "PAID",
        fulfillmentStatus: "UNFULFILLED",
        paymentMethod: "COD",
        shippingMethod: "Standard Delivery",
        source: "ONLINE",
        items: [
          { product: sonyXM5, name: "Sony WH-1000XM5 - Black", sku: "SXMH5-BK", price: "1499.00", quantity: 1 },
          { product: ankerPB, name: "Anker 737 Power Bank (24,000mAh)", sku: "ANK737-24K", price: "449.00", quantity: 1 },
        ],
        daysAgo: 2,
        shippingAddress: { firstName: "Noura", lastName: "Al-Dawsari", address1: "22 Al Khobar Road", city: "Al Khobar", state: "Eastern Province", postalCode: "31952", country: "Saudi Arabia", phone: "+966 55 456 7890" },
      },
      {
        orderNumber: "MH-2026-0005",
        email: customer5.email,
        userId: customer5.id,
        phone: customer5.phone,
        status: "PENDING",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        paymentMethod: "TAP",
        source: "ONLINE",
        items: [
          { product: ipadPro, name: "iPad Pro M4 11-inch - 256GB Wi-Fi Space Black", sku: "IPADM4-11-256-WF-SB", price: "4199.00", quantity: 1 },
        ],
        daysAgo: 1,
        shippingAddress: { firstName: "Mohammed", lastName: "Al-Qahtani", address1: "55 Abha Main Street", city: "Abha", state: "Asir", postalCode: "61321", country: "Saudi Arabia", phone: "+966 55 567 8901" },
      },
      {
        orderNumber: "MH-2026-0006",
        email: customer1.email,
        userId: customer1.id,
        phone: customer1.phone,
        status: "DELIVERED",
        paymentStatus: "PAID",
        fulfillmentStatus: "FULFILLED",
        paymentMethod: "TAP",
        shippingMethod: "Free Shipping (200+ SAR)",
        source: "ONLINE",
        couponCode: "WELCOME15",
        items: [
          { product: iphone16, name: "iPhone 16 - 256GB Blue", sku: "IPH16-256-BL", price: "3999.00", quantity: 1 },
        ],
        daysAgo: 40,
        shippingAddress: { firstName: "Ahmed", lastName: "Al-Dosari", address1: "123 King Fahd Road", city: "Riyadh", state: "Riyadh", postalCode: "12211", country: "Saudi Arabia", phone: "+966 55 123 4567" },
      },
      {
        orderNumber: "MH-2026-0007",
        email: "guest@yahoo.com",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        fulfillmentStatus: "UNFULFILLED",
        paymentMethod: "COD",
        shippingMethod: "Standard Delivery",
        source: "POS",
        items: [
          { product: galaxyWatch, name: "Samsung Galaxy Watch 7 - 40mm Cream", sku: "SGW7-40-CR", price: "1099.00", quantity: 1 },
        ],
        daysAgo: 3,
        shippingAddress: { firstName: "Abdulaziz", lastName: "Al-Saud", address1: "10 Olaya District", city: "Riyadh", state: "Riyadh", postalCode: "12241", country: "Saudi Arabia", phone: "+966 55 999 1234" },
      },
      {
        orderNumber: "MH-2026-0008",
        email: customer2.email,
        userId: customer2.id,
        phone: customer2.phone,
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
        fulfillmentStatus: "UNFULFILLED",
        paymentMethod: "TAP",
        cancelReason: "Customer requested cancellation - wrong color selected",
        source: "ONLINE",
        items: [
          { product: s25ultra, name: "Samsung Galaxy S25 Ultra - 256GB Titanium Silver", sku: "SGS25U-256-TS", price: "4999.00", quantity: 1 },
        ],
        daysAgo: 15,
        shippingAddress: { firstName: "Fatima", lastName: "Al-Harbi", address1: "45 Prince Sultan Road", city: "Jeddah", state: "Makkah", postalCode: "23424", country: "Saudi Arabia", phone: "+966 55 234 5678" },
      },
    ];

    for (const o of ordersToCreate) {
      const existingOrder = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, o.orderNumber) });
      if (existingOrder) continue;

      const subtotal = o.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
      const taxAmount = subtotal * 0.15;
      const shippingAmount = o.shippingMethod?.includes("Express") ? 50 : o.shippingMethod?.includes("Free") ? 0 : 25;
      const discountAmount = o.couponCode === "WELCOME15" ? Math.min(subtotal * 0.15, 200) : 0;
      const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

      // Create order first (without address ref)
      const [order] = await db.insert(schema.orders).values({
        orderNumber: o.orderNumber,
        email: o.email,
        userId: o.userId || null,
        phone: o.phone || null,
        status: o.status,
        paymentStatus: o.paymentStatus,
        fulfillmentStatus: o.fulfillmentStatus,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        shippingAmount: shippingAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        source: o.source || "ONLINE",
        paymentMethod: o.paymentMethod || null,
        shippingMethod: o.shippingMethod || null,
        trackingNumber: o.trackingNumber || null,
        cancelReason: o.cancelReason || null,
        couponCode: o.couponCode || null,
        createdAt: daysAgo(o.daysAgo || 0),
      }).returning();

      // Create shipping address linked to order
      const [shippingAddr] = await db.insert(schema.orderAddresses).values({
        orderId: order.id,
        type: "SHIPPING",
        ...o.shippingAddress,
      }).returning();

      // Link address to order
      await db.update(schema.orders).set({ shippingAddressId: shippingAddr.id }).where(eq(schema.orders.id, order.id));

      // Order items
      for (const item of o.items) {
        await db.insert(schema.orderItems).values({
          orderId: order.id,
          productId: item.product.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          totalPrice: (Number(item.price) * item.quantity).toFixed(2),
        });
      }

      // Timeline entries
      await db.insert(schema.orderTimeline).values({
        orderId: order.id, title: "Order placed", type: "INFO", createdAt: daysAgo(o.daysAgo || 0),
      });

      if (o.paymentStatus === "PAID") {
        await db.insert(schema.orderTimeline).values({
          orderId: order.id, title: `Payment confirmed (${o.paymentMethod})`, type: "PAYMENT", createdAt: daysAgo((o.daysAgo || 0) - 0.01),
        });
      }

      if (o.status === "SHIPPED" || o.status === "DELIVERED") {
        await db.insert(schema.orderTimeline).values({
          orderId: order.id, title: "Order shipped", message: o.trackingNumber ? `Tracking: ${o.trackingNumber}` : undefined, type: "FULFILLMENT", createdAt: daysAgo(Math.max(0, (o.daysAgo || 0) - 3)),
        });
      }

      if (o.status === "DELIVERED") {
        await db.insert(schema.orderTimeline).values({
          orderId: order.id, title: "Order delivered", type: "INFO", createdAt: daysAgo(Math.max(0, (o.daysAgo || 0) - 5)),
        });
      }

      if (o.status === "CANCELLED") {
        await db.insert(schema.orderTimeline).values({
          orderId: order.id, title: "Order cancelled", message: o.cancelReason, type: "CANCELLED", createdAt: daysAgo(Math.max(0, (o.daysAgo || 0) - 1)),
        });
      }
    }
    console.log(`✅ Orders created: ${ordersToCreate.length}`);
  }

  // ----------------------------------------------------------
  // 8. CUSTOMER ADDRESSES
  // ----------------------------------------------------------
  await upsertAddress(customer1.id, { label: "Home", firstName: "Ahmed", lastName: "Al-Dosari", address1: "123 King Fahd Road", city: "Riyadh", state: "Riyadh", postalCode: "12211", country: "Saudi Arabia", phone: "+966 55 123 4567", isDefault: true });
  await upsertAddress(customer1.id, { label: "Office", firstName: "Ahmed", lastName: "Al-Dosari", company: "TechCorp SA", address1: "456 Olaya Street, Floor 12", city: "Riyadh", state: "Riyadh", postalCode: "12244", country: "Saudi Arabia", phone: "+966 55 123 4567", isDefault: false });
  await upsertAddress(customer2.id, { label: "Home", firstName: "Fatima", lastName: "Al-Harbi", address1: "45 Prince Sultan Road", city: "Jeddah", state: "Makkah", postalCode: "23424", country: "Saudi Arabia", phone: "+966 55 234 5678", isDefault: true });
  await upsertAddress(customer3.id, { label: "Home", firstName: "Omar", lastName: "Al-Otaibi", address1: "78 Corniche Road", city: "Dammam", state: "Eastern Province", postalCode: "31411", country: "Saudi Arabia", phone: "+966 55 345 6789", isDefault: true });
  console.log("✅ Customer addresses created (4)");

  // ----------------------------------------------------------
  // 9. REVIEWS
  // ----------------------------------------------------------
  const reviewsData = [
    { productSlug: "iphone-16-pro-max", userId: customer1.id, rating: 5, title: "Best iPhone ever!", comment: "The camera is absolutely stunning. Titanium design feels premium and lightweight. Battery easily lasts all day. Worth every riyal.", isApproved: true },
    { productSlug: "iphone-16-pro-max", userId: customer3.id, rating: 4, title: "Great but pricey", comment: "Excellent phone with amazing features. The only downside is the price. But if you can afford it, it's the best smartphone experience.", isApproved: true },
    { productSlug: "samsung-galaxy-s25-ultra", userId: customer2.id, rating: 5, title: "Samsung nailed it!", comment: "Galaxy AI is incredible. The S Pen is perfect for note-taking. 200MP camera takes jaw-dropping photos. Best Android phone period.", isApproved: true },
    { productSlug: "samsung-galaxy-s25-ultra", userId: customer5.id, rating: 4, title: "Almost perfect", comment: "Excellent phone. Galaxy AI features are genuinely useful. S Pen is great. Only wish the battery lasted a bit longer with heavy use.", isApproved: true },
    { productSlug: "airpods-pro-2-usbc", userId: customer3.id, rating: 5, title: "Amazing ANC!", comment: "Noise cancellation is on another level. Sound quality is superb. The USB-C case is a welcome change. Best earbuds I've owned.", isApproved: true },
    { productSlug: "airpods-pro-2-usbc", userId: customer4.id, rating: 4, title: "Great for iPhone users", comment: "Seamless integration with iPhone. ANC is excellent. Wish the battery case was a bit smaller.", isApproved: true },
    { productSlug: "sony-wh-1000xm5", userId: customer1.id, rating: 5, title: "King of ANC headphones", comment: "These headphones are incredible. The noise cancellation is the best in class. Super comfortable for long flights. 30-hour battery is real.", isApproved: true },
    { productSlug: "ipad-pro-m4-11", userId: customer5.id, rating: 5, title: "Best tablet for creatives", comment: "M4 chip is blazing fast. The OLED display is gorgeous. Apple Pencil Pro support makes this perfect for design work.", isApproved: true },
    { productSlug: "apple-watch-ultra-2", userId: customer1.id, rating: 5, title: "Built for adventure", comment: "Titanium build is incredibly durable. GPS accuracy is remarkable. Battery lasts through weekend hiking trips. Best smartwatch for outdoor enthusiasts.", isApproved: true },
    { productSlug: "samsung-galaxy-watch-7", userId: customer2.id, rating: 4, title: "Great value smartwatch", comment: "Health tracking is comprehensive. Galaxy AI features are useful. Battery could be better - lasts about 1.5 days with AOD on.", isApproved: true },
    { productSlug: "jbl-flip-6", userId: customer4.id, rating: 5, title: "Perfect portable speaker", comment: "Amazing sound for its size. Waterproof design is perfect for pool parties. Battery lasts all day. Highly recommended!", isApproved: true },
    { productSlug: "anker-737-power-bank", userId: customer3.id, rating: 4, title: "Massive capacity", comment: "24,000mAh is a beast. Charges my MacBook and iPhone simultaneously. A bit heavy but that's expected for the capacity.", isApproved: true },
    { productSlug: "spigen-tough-armor-s25-ultra", userId: customer2.id, rating: 5, title: "Excellent protection", comment: "Dropped my phone twice and zero damage. Kickstand is super useful for watching videos. Great fit and premium feel.", isApproved: true },
    { productSlug: "belkin-ultraglass-iphone-16-pm", userId: customer1.id, rating: 4, title: "Easy installation", comment: "Alignment tray makes installation a breeze. Glass feels smooth and responsive. No bubbles at all. Just wish it covered the edges more.", isApproved: false },
  ];

  for (const r of reviewsData) {
    const product = createdProducts[r.productSlug];
    if (!product) continue;

    const existing = await db.query.reviews.findFirst({
      where: and(eq(schema.reviews.productId, product.id), eq(schema.reviews.userId, r.userId)),
    });
    if (!existing) {
      await db.insert(schema.reviews).values({
        productId: product.id,
        userId: r.userId,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isApproved: r.isApproved,
      });
    }
  }

  // Update product review stats
  for (const slug of Object.keys(createdProducts)) {
    const product = createdProducts[slug];
    const productReviews = reviewsData.filter(r => r.productSlug === slug && r.isApproved);
    if (productReviews.length > 0) {
      const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
      await db.update(schema.products).set({
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: productReviews.length,
      }).where(eq(schema.products.id, product.id));
    }
  }
  console.log(`✅ Reviews created: ${reviewsData.length} (${reviewsData.filter(r => r.isApproved).length} approved)`);

  // ----------------------------------------------------------
  // 10. GIFT CARDS
  // ----------------------------------------------------------
  const giftCardsData = [
    { code: "GIFT-MH-500", initialBalance: "500.00", currentBalance: "500.00", recipientEmail: "friend@example.com", recipientName: "Friend", senderName: "Ahmed", message: "Happy birthday! Enjoy shopping at MobileHub 🎁", isActive: true, expiresAt: new Date("2027-12-31") },
    { code: "GIFT-MH-1000", initialBalance: "1000.00", currentBalance: "750.00", recipientEmail: customer4.email, recipientName: customer4.name, senderName: "MobileHub Team", message: "Thank you for being a loyal customer!", isActive: true, customerId: customer4.id, expiresAt: new Date("2027-06-30") },
    { code: "GIFT-MH-200", initialBalance: "200.00", currentBalance: "0.00", isActive: false, expiresAt: new Date("2025-12-31") },
  ];

  for (const gc of giftCardsData) {
    const existing = await db.query.giftCards.findFirst({ where: eq(schema.giftCards.code, gc.code) });
    if (!existing) {
      await db.insert(schema.giftCards).values(gc);
    }
  }
  console.log("✅ Gift cards created (3)");

  // ----------------------------------------------------------
  // 11. BLOG POSTS
  // ----------------------------------------------------------
  const blogData = [
    {
      title: "iPhone 16 Pro Max vs Samsung Galaxy S25 Ultra: Which Flagship Should You Buy?",
      slug: "iphone-16-pro-max-vs-samsung-galaxy-s25-ultra",
      content: `<h2>The Battle of the Titans</h2><p>Choosing between the iPhone 16 Pro Max and Samsung Galaxy S25 Ultra is one of the hardest decisions in tech. Both phones represent the absolute pinnacle of smartphone engineering in 2026.</p><h3>Design & Build</h3><p>Apple's titanium design is lighter at 227g versus Samsung's 218g. Both feel premium with aerospace-grade materials. Samsung retains the integrated S Pen, while Apple focuses on a cleaner, button-less interaction.</p><h3>Camera</h3><p>Samsung leads in raw megapixels with 200MP vs Apple's 48MP, but Apple's computational photography often produces more natural-looking images. For video, Apple maintains its lead with ProRes and cinematic stabilization.</p><h3>AI Features</h3><p>Samsung's Galaxy AI offers real-time translation, Circle to Search, and AI-generated summaries. Apple Intelligence focuses on Siri improvements, Writing Tools, and Image Playground. Both are compelling but different approaches.</p><h3>Verdict</h3><p>If you're in the Apple ecosystem, the iPhone 16 Pro Max is a no-brainer. If you want the most versatile Android experience with AI at the forefront, the S25 Ultra is unbeatable. Available now at MobileHub.</p>`,
      excerpt: "A detailed comparison of 2026's two best flagship smartphones to help you decide which one deserves a spot in your pocket.",
      tags: "iphone,samsung,comparison,flagship,review",
      isPublished: true,
      publishedAt: daysAgo(10),
      seoTitle: "iPhone 16 Pro Max vs Galaxy S25 Ultra Comparison | MobileHub Blog",
      authorId: admin.id,
    },
    {
      title: "Top 5 Must-Have Accessories for Your New Smartphone",
      slug: "top-5-must-have-smartphone-accessories",
      content: `<h2>Essential Accessories Every Phone Owner Needs</h2><p>You've just bought a premium smartphone. Now protect your investment and enhance your experience with these essential accessories.</p><h3>1. A Quality Case</h3><p>A good case is non-negotiable. Whether you prefer the sleek Apple Clear Case with MagSafe or the rugged protection of a Spigen Tough Armor, protect your phone from day one.</p><h3>2. Tempered Glass Screen Protector</h3><p>Modern screens are tough but not scratch-proof. The Belkin UltraGlass offers 9H hardness and anti-microbial protection.</p><h3>3. Fast Charger</h3><p>Stock chargers (if included) are often slow. Upgrade to a 45W+ charger like the Samsung 45W or Anker Nano 67W for rapid charging.</p><h3>4. Power Bank</h3><p>For travelers and heavy users, the Anker 737 with 24,000mAh ensures you never run out of battery.</p><h3>5. Premium Earbuds</h3><p>Complete your setup with AirPods Pro 2 or Galaxy Buds3 Pro for an immersive audio experience.</p><p>Shop all accessories at MobileHub with free delivery on orders over SAR 200.</p>`,
      excerpt: "From cases to chargers, here are the 5 accessories you should buy alongside your new smartphone.",
      tags: "accessories,guide,tips,shopping",
      isPublished: true,
      publishedAt: daysAgo(5),
      seoTitle: "5 Must-Have Smartphone Accessories | MobileHub Blog",
      authorId: admin.id,
    },
    {
      title: "Galaxy AI: How Samsung is Changing the Way We Use Phones",
      slug: "galaxy-ai-how-samsung-changing-phones",
      content: `<h2>The AI Revolution in Your Pocket</h2><p>Samsung's Galaxy AI represents one of the most significant software advancements in smartphone history. Here's how it's changing everyday phone usage.</p><h3>Real-Time Translation</h3><p>Make phone calls in your language and the other party hears theirs. Galaxy AI translates in real-time, breaking down language barriers instantly.</p><h3>Circle to Search</h3><p>See something interesting? Simply circle it on your screen and Google instantly identifies it. Works on text, images, and even videos.</p><h3>AI Photo Editing</h3><p>Move subjects, remove objects, and enhance photos with a tap. Galaxy AI's photo tools make professional editing accessible to everyone.</p><h3>Chat Assist</h3><p>Change the tone of your messages, translate them, or get AI-suggested replies. Communication has never been easier.</p><p>Experience Galaxy AI on the Galaxy S25 series, available now at MobileHub.</p>`,
      excerpt: "Discover how Samsung's Galaxy AI features are transforming the smartphone experience with real-time translation, smart search, and more.",
      tags: "samsung,galaxy-ai,technology,innovation",
      isPublished: true,
      publishedAt: daysAgo(18),
      authorId: admin.id,
    },
    {
      title: "Upcoming: Nothing Phone (3) - Everything We Know So Far",
      slug: "nothing-phone-3-everything-we-know",
      content: `<h2>The Most Anticipated Mid-Range Phone</h2><p>Nothing has been making waves in the smartphone industry with their unique transparent design philosophy. Here's everything we know about the upcoming Nothing Phone (3).</p><h3>Expected Features</h3><ul><li>Next-gen Glyph Interface 2.0</li><li>Snapdragon 8s Gen 3 chipset</li><li>50MP main + 50MP ultrawide camera</li><li>5000mAh battery with 65W charging</li></ul><p>Stay tuned for pre-order availability at MobileHub.</p>`,
      excerpt: "Everything we know about the upcoming Nothing Phone (3) including specs, design, and expected pricing.",
      tags: "nothing,phone,upcoming,leak,preview",
      isPublished: false,
    },
  ];

  for (const post of blogData) {
    const existing = await db.query.blogPosts.findFirst({ where: eq(schema.blogPosts.slug, post.slug) });
    if (!existing) {
      await db.insert(schema.blogPosts).values(post);
    }
  }
  console.log(`✅ Blog posts created: ${blogData.length} (${blogData.filter(p => p.isPublished).length} published)`);

  // ----------------------------------------------------------
  // 12. NAVIGATION
  // ----------------------------------------------------------
  const existingNav = await db.query.navigations.findFirst({ where: eq(schema.navigations.slug, "main-menu") });
  if (existingNav) {
    await db.update(schema.navigations).set({
      items: JSON.stringify([
        { title: "Home", href: "/" },
        { title: "Smartphones", href: "/collections/smartphones" },
        { title: "Tablets", href: "/collections/tablets" },
        { title: "Accessories", href: "/collections/accessories", children: [
          { title: "Cases & Covers", href: "/collections/cases-covers" },
          { title: "Screen Protectors", href: "/collections/screen-protectors" },
          { title: "Cables & Adapters", href: "/collections/cables-adapters" },
        ] },
        { title: "Audio", href: "/collections/audio" },
        { title: "Smartwatches", href: "/collections/smartwatches" },
        { title: "Blog", href: "/blog" },
        { title: "Contact", href: "/contact" },
      ]),
    }).where(eq(schema.navigations.id, existingNav.id));
  } else {
    await db.insert(schema.navigations).values({
      title: "Main Menu",
      slug: "main-menu",
      items: JSON.stringify([
        { title: "Home", href: "/" },
        { title: "Smartphones", href: "/collections/smartphones" },
        { title: "Tablets", href: "/collections/tablets" },
        { title: "Accessories", href: "/collections/accessories", children: [
          { title: "Cases & Covers", href: "/collections/cases-covers" },
          { title: "Screen Protectors", href: "/collections/screen-protectors" },
          { title: "Cables & Adapters", href: "/collections/cables-adapters" },
        ] },
        { title: "Audio", href: "/collections/audio" },
        { title: "Smartwatches", href: "/collections/smartwatches" },
        { title: "Blog", href: "/blog" },
        { title: "Contact", href: "/contact" },
      ]),
    });
  }
  console.log("✅ Navigation updated");

  // ----------------------------------------------------------
  // 13. TEMPLATE
  // ----------------------------------------------------------
  const existingTemplate = await db.query.templates.findFirst({ where: eq(schema.templates.slug, "default") });
  if (existingTemplate) {
    // Update template sections for mobile shop
    await db.delete(schema.templateSections).where(eq(schema.templateSections.templateId, existingTemplate.id));
    await db.insert(schema.templateSections).values([
      { templateId: existingTemplate.id, name: "Hero Banner", type: "HERO", sortOrder: 0, isVisible: true, content: JSON.stringify({ title: "Welcome to MobileHub", subtitle: "Saudi Arabia's #1 destination for smartphones, tablets & accessories. Free delivery on orders over SAR 200.", buttonText: "Shop Smartphones", buttonLink: "/collections/smartphones" }) },
      { templateId: existingTemplate.id, name: "Featured Products", type: "FEATURED_PRODUCTS", sortOrder: 1, isVisible: true, config: JSON.stringify({ limit: 8, columns: 4 }) },
      { templateId: existingTemplate.id, name: "Categories", type: "CATEGORIES", sortOrder: 2, isVisible: true, config: JSON.stringify({ layout: "grid", showImage: true }) },
      { templateId: existingTemplate.id, name: "Newsletter", type: "NEWSLETTER", sortOrder: 3, isVisible: true, content: JSON.stringify({ title: "Get the Latest Deals", subtitle: "Subscribe for exclusive offers, new product launches, and tech news" }) },
    ]);
  }
  console.log("✅ Template sections updated");

  // ----------------------------------------------------------
  // 14. NEWSLETTER SUBSCRIBERS
  // ----------------------------------------------------------
  const subscribersData = [
    "ahmed@gmail.com", "fatima@gmail.com", "omar@gmail.com",
    "tech.lover@gmail.com", "gadgets.ksa@gmail.com", "smart.buyer@outlook.com",
    "khalid.tech@yahoo.com", "mona.shops@gmail.com",
  ];

  for (const email of subscribersData) {
    const existing = await db.query.subscribers.findFirst({ where: eq(schema.subscribers.email, email) });
    if (!existing) {
      await db.insert(schema.subscribers).values({ email, status: "ACTIVE" });
    }
  }
  console.log(`✅ Newsletter subscribers: ${subscribersData.length}`);

  // ----------------------------------------------------------
  // 15. ABANDONED CARTS
  // ----------------------------------------------------------
  const existingAC = await db.query.abandonedCarts.findFirst({ where: eq(schema.abandonedCarts.email, "interested.buyer@gmail.com") });
  if (!existingAC) {
    await db.insert(schema.abandonedCarts).values({
      email: "interested.buyer@gmail.com",
      items: JSON.stringify([
        { productId: iphone16pm?.id, name: "iPhone 16 Pro Max", price: 5199, quantity: 1, image: placeholder("iPhone+16+Pro+Max") },
        { productId: airpods?.id, name: "AirPods Pro 2", price: 999, quantity: 1, image: placeholder("AirPods+Pro+2") },
      ]),
      subtotal: "6198.00",
      status: "ABANDONED",
    });
  }

  const existingAC2 = await db.query.abandonedCarts.findFirst({ where: eq(schema.abandonedCarts.email, "window.shopper@gmail.com") });
  if (!existingAC2) {
    await db.insert(schema.abandonedCarts).values({
      userId: customer5.id,
      email: customer5.email,
      items: JSON.stringify([
        { productId: s25ultra?.id, name: "Samsung Galaxy S25 Ultra", price: 4999, quantity: 1, image: placeholder("Galaxy+S25+Ultra") },
      ]),
      subtotal: "4999.00",
      status: "EMAIL_SENT",
      emailSentAt: daysAgo(2),
    });
  }
  console.log("✅ Abandoned carts created (2)");

  // ----------------------------------------------------------
  // 16. SMART COLLECTIONS
  // ----------------------------------------------------------
  const smartCollectionsData = [
    { name: "Apple Products", slug: "apple-products", description: "All Apple devices and accessories", rules: JSON.stringify([{ field: "vendor", operator: "equals", value: "Apple" }]), isActive: true, sortOrder: 1 },
    { name: "Samsung Collection", slug: "samsung-collection", description: "All Samsung devices and accessories", rules: JSON.stringify([{ field: "vendor", operator: "equals", value: "Samsung" }]), isActive: true, sortOrder: 2 },
    { name: "Budget Friendly (Under SAR 1000)", slug: "budget-friendly", description: "Great products under SAR 1,000", rules: JSON.stringify([{ field: "price", operator: "less_than", value: "1000" }]), isActive: true, sortOrder: 3 },
    { name: "Premium Flagships", slug: "premium-flagships", description: "Top-tier flagship devices", rules: JSON.stringify([{ field: "price", operator: "greater_than", value: "4000" }, { field: "tags", operator: "contains", value: "flagship" }]), isActive: true, sortOrder: 4 },
    { name: "New Arrivals", slug: "new-arrivals", description: "Recently added products", rules: JSON.stringify([{ field: "created_at", operator: "within_days", value: "30" }]), isActive: true, sortOrder: 5 },
  ];

  for (const sc of smartCollectionsData) {
    const existing = await db.query.smartCollections.findFirst({ where: eq(schema.smartCollections.slug, sc.slug) });
    if (!existing) {
      await db.insert(schema.smartCollections).values(sc);
    }
  }
  console.log("✅ Smart collections created (5)");

  // ----------------------------------------------------------
  // 17. PAGES (CMS)
  // ----------------------------------------------------------
  const pagesData = [
    { title: "About MobileHub", slug: "about", content: "<h2>About MobileHub</h2><p>MobileHub is Saudi Arabia's premier destination for smartphones, tablets, and mobile accessories. Founded in 2024, we are committed to bringing the latest technology to your doorstep with competitive pricing and exceptional customer service.</p><h3>Our Promise</h3><ul><li>100% genuine products with manufacturer warranty</li><li>Free delivery across Saudi Arabia on orders over SAR 200</li><li>Easy 14-day return policy</li><li>Expert customer support in Arabic and English</li></ul><h3>Visit Us</h3><p>Olaya Street, Riyadh 12251, Saudi Arabia<br/>Open: Sun-Thu 9AM-10PM, Fri-Sat 2PM-10PM</p>", isPublished: true, seoTitle: "About MobileHub | Saudi Arabia's #1 Mobile Store" },
    { title: "Shipping Policy", slug: "shipping-policy", content: "<h2>Shipping Policy</h2><h3>Domestic (Saudi Arabia)</h3><p><strong>Standard Delivery:</strong> 3-5 business days — SAR 25</p><p><strong>Express Delivery:</strong> 1-2 business days — SAR 50</p><p><strong>Free Shipping:</strong> On orders above SAR 200</p><h3>GCC Countries</h3><p><strong>Standard:</strong> 5-8 business days — SAR 75</p><p><strong>Express:</strong> 2-4 business days — SAR 150</p><h3>Order Tracking</h3><p>You will receive a tracking number via email once your order is shipped.</p>", isPublished: true },
    { title: "Warranty & Returns", slug: "warranty-returns", content: "<h2>Warranty & Returns</h2><h3>Return Policy</h3><p>You may return any unopened item within 14 days of delivery for a full refund. Opened electronics can be returned within 7 days if defective.</p><h3>Warranty</h3><p>All products come with the manufacturer's warranty plus an additional 1-year MobileHub warranty on selected items.</p><h3>How to Return</h3><ol><li>Go to your Account → Orders → Select the order</li><li>Click 'Request Return' and fill out the form</li><li>We'll arrange pickup or provide a shipping label</li><li>Refund is processed within 5-7 business days</li></ol>", isPublished: true },
  ];

  for (const page of pagesData) {
    const existing = await db.query.pages.findFirst({ where: eq(schema.pages.slug, page.slug) });
    if (!existing) {
      await db.insert(schema.pages).values(page);
    }
  }
  console.log("✅ CMS pages created (3)");

  // ----------------------------------------------------------
  // 18. NOTIFICATIONS
  // ----------------------------------------------------------
  const notifications = [
    { userId: admin.id, title: "New Order MH-2026-0005", message: "Mohammed Al-Qahtani placed an order for iPad Pro M4 — SAR 4,199.00", type: "NEW_ORDER", isRead: false },
    { userId: admin.id, title: "Low Stock Alert", message: "Samsung Galaxy Z Fold 6 (Silver) has only 10 units remaining", type: "LOW_STOCK", isRead: false },
    { userId: admin.id, title: "New Review", message: "Ahmed Al-Dosari left a 5-star review on iPhone 16 Pro Max", type: "NEW_REVIEW", isRead: true },
    { userId: admin.id, title: "Order Delivered", message: "Order MH-2026-0001 was delivered successfully to Ahmed Al-Dosari", type: "NEW_ORDER", isRead: true },
  ];

  for (const n of notifications) {
    const existing = await db.query.notifications.findFirst({
      where: and(eq(schema.notifications.userId, n.userId), eq(schema.notifications.title, n.title)),
    });
    if (!existing) {
      await db.insert(schema.notifications).values(n);
    }
  }
  console.log("✅ Notifications created (4)");

  // ----------------------------------------------------------
  // DONE
  // ----------------------------------------------------------
  console.log("\n🎉 Mobile Shop seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("  Admin:    admin@mobilehub.sa / admin123");
  console.log("  Staff:    staff@mobilehub.sa / staff123");
  console.log("  Customer: ahmed@gmail.com / customer123");
  console.log("  Customer: fatima@gmail.com / customer123");
  console.log("  Customer: omar@gmail.com / customer123");
  console.log("  Customer: noura@gmail.com / customer123");
  console.log("  Customer: mohammed@gmail.com / customer123");
  console.log("\n📦 Data summary:");
  console.log("  • 28 products (smartphones, tablets, watches, audio, chargers, cases)");
  console.log("  • 9 categories (6 main + 3 sub)");
  console.log("  • 8 orders (various statuses)");
  console.log("  • 14 reviews");
  console.log("  • 3 gift cards");
  console.log("  • 4 blog posts");
  console.log("  • 5 smart collections");
  console.log("  • 4 coupons");
  console.log("  • 2 shipping zones with rates");
  console.log("  • 2 abandoned carts");
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

interface ProductSeed {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  costPrice?: string;
  quantity: number;
  status: string;
  isFeatured?: boolean;
  vendor?: string;
  tags?: string;
  productType?: string;
  weight?: number;
  countryOfOrigin?: string;
  warrantyInfo?: string;
  estimatedDelivery?: string;
  seoTitle?: string;
  seoDescription?: string;
  categorySlug: string;
  variants?: {
    name: string;
    sku: string;
    price: string;
    compareAtPrice?: string;
    costPrice?: string;
    quantity: number;
    option1?: string;
    option2?: string;
    option3?: string;
  }[];
}

async function upsertUser(data: { email: string; name: string; password: string; role: string; phone?: string }) {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, data.email) });
  if (existing) return existing;
  const [user] = await db.insert(schema.users).values({ ...data, emailVerified: new Date() }).returning();
  return user;
}

async function upsertCategory(data: { name: string; slug: string; description?: string; parentId?: string; sortOrder?: number; isActive?: boolean }) {
  const existing = await db.query.categories.findFirst({ where: eq(schema.categories.slug, data.slug) });
  if (existing) return existing;
  const [cat] = await db.insert(schema.categories).values(data).returning();
  return cat;
}

async function upsertCoupon(data: { code: string; description?: string; type: string; value: string; minOrderAmount?: string; maxDiscountAmount?: string; usageLimit?: number; isActive?: boolean; expiresAt?: Date }) {
  const existing = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, data.code) });
  if (existing) return existing;
  const [coupon] = await db.insert(schema.coupons).values(data).returning();
  return coupon;
}

async function upsertAddress(userId: string, data: { label?: string; firstName: string; lastName: string; company?: string; address1: string; address2?: string; city: string; state?: string; postalCode: string; country: string; phone?: string; isDefault: boolean }) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(schema.addresses.userId, userId), eq(schema.addresses.address1, data.address1)),
  });
  if (existing) return existing;
  const [addr] = await db.insert(schema.addresses).values({ ...data, userId }).returning();
  return addr;
}

// ============================================================
// RUN
// ============================================================

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
