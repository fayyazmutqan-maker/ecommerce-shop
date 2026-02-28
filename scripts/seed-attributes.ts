import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import * as schema from "../lib/schema";
import "dotenv/config";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function main() {
  console.log("🏷️  Seeding product groups and attributes...");

  // ============================================================
  // PRODUCT GROUPS
  // ============================================================

  const groups = [
    { name: "Clothing", slug: "clothing", icon: "👕", sortOrder: 1 },
    { name: "Shoes", slug: "shoes", icon: "👟", sortOrder: 2 },
    { name: "Jewelry & Accessories", slug: "jewelry", icon: "💍", sortOrder: 3 },
    { name: "Bags & Luggage", slug: "bags", icon: "👜", sortOrder: 4 },
    { name: "Electronics", slug: "electronics", icon: "📱", sortOrder: 5 },
    { name: "Furniture", slug: "furniture", icon: "🪑", sortOrder: 6 },
    { name: "Home & Kitchen", slug: "home-kitchen", icon: "🏠", sortOrder: 7 },
    { name: "Car & Automotive", slug: "automotive", icon: "🚗", sortOrder: 8 },
    { name: "Sports & Outdoors", slug: "sports", icon: "⚽", sortOrder: 9 },
    { name: "Beauty & Personal Care", slug: "beauty", icon: "💄", sortOrder: 10 },
  ];

  const createdGroups: Record<string, string> = {};

  for (const g of groups) {
    const existing = await db.query.productGroups.findFirst({ where: eq(schema.productGroups.slug, g.slug) });
    if (existing) {
      createdGroups[g.slug] = existing.id;
    } else {
      const [created] = await db.insert(schema.productGroups).values(g).returning();
      createdGroups[g.slug] = created.id;
    }
  }
  console.log(`✅ Created ${groups.length} product groups`);

  // ============================================================
  // ATTRIBUTES PER GROUP
  // ============================================================

  const attributesDef = [
    // ---- CLOTHING ----
    {
      groupSlug: "clothing",
      name: "Clothing Size",
      slug: "clothing-size",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 1,
      options: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
    },
    {
      groupSlug: "clothing",
      name: "Color",
      slug: "clothing-color",
      type: "color",
      isFilterable: true,
      sortOrder: 2,
      options: [
        "Black:#000000", "White:#FFFFFF", "Red:#DC2626", "Blue:#2563EB",
        "Navy:#1E3A5F", "Green:#16A34A", "Yellow:#EAB308", "Pink:#EC4899",
        "Purple:#9333EA", "Orange:#EA580C", "Brown:#92400E", "Grey:#6B7280",
        "Beige:#D2B48C", "Cream:#FFFDD0", "Burgundy:#800020", "Teal:#0D9488",
        "Olive:#808000", "Coral:#FF7F50", "Lavender:#E6E6FA", "Charcoal:#36454F",
      ],
    },
    {
      groupSlug: "clothing",
      name: "Material",
      slug: "clothing-material",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 3,
      options: [
        "Cotton", "Polyester", "Linen", "Silk", "Wool", "Cashmere",
        "Denim", "Leather", "Nylon", "Rayon", "Spandex", "Velvet",
        "Chiffon", "Satin", "Fleece", "Tweed", "Organic Cotton",
      ],
    },
    {
      groupSlug: "clothing",
      name: "Fit",
      slug: "clothing-fit",
      type: "select",
      isFilterable: true,
      sortOrder: 4,
      options: ["Regular", "Slim", "Relaxed", "Oversized", "Tailored", "Athletic", "Loose"],
    },
    {
      groupSlug: "clothing",
      name: "Gender",
      slug: "clothing-gender",
      type: "select",
      isFilterable: true,
      sortOrder: 5,
      options: ["Men", "Women", "Unisex", "Boys", "Girls", "Kids"],
    },
    {
      groupSlug: "clothing",
      name: "Season",
      slug: "clothing-season",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 6,
      options: ["Spring", "Summer", "Fall", "Winter", "All Season"],
    },
    {
      groupSlug: "clothing",
      name: "Sleeve Length",
      slug: "clothing-sleeve",
      type: "select",
      isFilterable: false,
      sortOrder: 7,
      options: ["Sleeveless", "Short Sleeve", "3/4 Sleeve", "Long Sleeve", "Cap Sleeve"],
    },
    {
      groupSlug: "clothing",
      name: "Neckline",
      slug: "clothing-neckline",
      type: "select",
      isFilterable: false,
      sortOrder: 8,
      options: ["Crew Neck", "V-Neck", "Round Neck", "Scoop Neck", "Turtleneck", "Collared", "Hooded", "Mock Neck", "Off-Shoulder"],
    },
    {
      groupSlug: "clothing",
      name: "Pattern",
      slug: "clothing-pattern",
      type: "select",
      isFilterable: true,
      sortOrder: 9,
      options: ["Solid", "Striped", "Plaid", "Floral", "Polka Dot", "Geometric", "Abstract", "Animal Print", "Camo", "Tie-Dye", "Check"],
    },

    // ---- SHOES ----
    {
      groupSlug: "shoes",
      name: "Shoe Size (US)",
      slug: "shoe-size-us",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 1,
      options: ["4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14", "15", "16"],
    },
    {
      groupSlug: "shoes",
      name: "Shoe Size (EU)",
      slug: "shoe-size-eu",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 2,
      options: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"],
    },
    {
      groupSlug: "shoes",
      name: "Color",
      slug: "shoe-color",
      type: "color",
      isFilterable: true,
      sortOrder: 3,
      options: [
        "Black:#000000", "White:#FFFFFF", "Brown:#92400E", "Tan:#D2B48C",
        "Red:#DC2626", "Blue:#2563EB", "Navy:#1E3A5F", "Grey:#6B7280",
        "Green:#16A34A", "Pink:#EC4899", "Beige:#F5F5DC", "Gold:#FFD700",
        "Silver:#C0C0C0", "Multi:#FF00FF",
      ],
    },
    {
      groupSlug: "shoes",
      name: "Width",
      slug: "shoe-width",
      type: "select",
      isFilterable: true,
      sortOrder: 4,
      options: ["Narrow (AA)", "Standard (B)", "Wide (D)", "Extra Wide (EE)", "Extra Extra Wide (4E)"],
    },
    {
      groupSlug: "shoes",
      name: "Material",
      slug: "shoe-material",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 5,
      options: ["Leather", "Suede", "Canvas", "Synthetic", "Mesh", "Knit", "Rubber", "Patent Leather", "Nubuck", "Textile"],
    },
    {
      groupSlug: "shoes",
      name: "Heel Height",
      slug: "shoe-heel",
      type: "select",
      isFilterable: true,
      sortOrder: 6,
      options: ["Flat (0-1\")", "Low (1-2\")", "Mid (2-3\")", "High (3-4\")", "Ultra High (4\"+)", "Platform", "Wedge"],
    },
    {
      groupSlug: "shoes",
      name: "Closure Type",
      slug: "shoe-closure",
      type: "select",
      isFilterable: false,
      sortOrder: 7,
      options: ["Lace-Up", "Slip-On", "Velcro", "Buckle", "Zipper", "Pull-On", "Hook & Loop"],
    },
    {
      groupSlug: "shoes",
      name: "Shoe Type",
      slug: "shoe-type",
      type: "select",
      isFilterable: true,
      sortOrder: 8,
      options: ["Sneakers", "Running", "Boots", "Sandals", "Loafers", "Heels", "Flats", "Oxfords", "Mules", "Slides", "Espadrilles", "Clogs", "Wedges", "Athletic"],
    },

    // ---- JEWELRY ----
    {
      groupSlug: "jewelry",
      name: "Metal Type",
      slug: "jewelry-metal",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Gold", "White Gold", "Rose Gold", "Platinum", "Sterling Silver", "Stainless Steel", "Titanium", "Brass", "Copper", "Vermeil", "Gold-Plated", "Rhodium-Plated"],
    },
    {
      groupSlug: "jewelry",
      name: "Gemstone",
      slug: "jewelry-gemstone",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 2,
      options: ["Diamond", "Ruby", "Sapphire", "Emerald", "Pearl", "Amethyst", "Topaz", "Opal", "Garnet", "Aquamarine", "Citrine", "Turquoise", "Zirconia", "Moissanite", "None"],
    },
    {
      groupSlug: "jewelry",
      name: "Ring Size",
      slug: "jewelry-ring-size",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 3,
      options: ["3", "3.5", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"],
    },
    {
      groupSlug: "jewelry",
      name: "Necklace Length",
      slug: "jewelry-chain-length",
      type: "select",
      isFilterable: true,
      sortOrder: 4,
      options: ["14\" Choker", "16\" Collar", "18\" Princess", "20\" Matinee", "24\" Matinee", "30\" Opera", "36\"+ Rope", "Adjustable"],
    },
    {
      groupSlug: "jewelry",
      name: "Bracelet Size",
      slug: "jewelry-bracelet-size",
      type: "select",
      isFilterable: true,
      sortOrder: 5,
      options: ["6\" Extra Small", "6.5\" Small", "7\" Medium", "7.5\" Large", "8\" Extra Large", "Adjustable"],
    },
    {
      groupSlug: "jewelry",
      name: "Jewelry Style",
      slug: "jewelry-style",
      type: "select",
      isFilterable: true,
      sortOrder: 6,
      options: ["Classic", "Modern", "Vintage", "Bohemian", "Minimalist", "Statement", "Bridal", "Everyday", "Luxury"],
    },
    {
      groupSlug: "jewelry",
      name: "Karat",
      slug: "jewelry-karat",
      type: "select",
      isFilterable: true,
      sortOrder: 7,
      options: ["10K", "14K", "18K", "22K", "24K", "925 Sterling"],
    },

    // ---- BAGS ----
    {
      groupSlug: "bags",
      name: "Bag Type",
      slug: "bag-type",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Tote", "Crossbody", "Shoulder Bag", "Backpack", "Clutch", "Satchel", "Hobo", "Bucket Bag", "Messenger", "Duffel", "Briefcase", "Wallet", "Luggage", "Travel Set"],
    },
    {
      groupSlug: "bags",
      name: "Material",
      slug: "bag-material",
      type: "select",
      isFilterable: true,
      sortOrder: 2,
      options: ["Leather", "Vegan Leather", "Canvas", "Nylon", "Polyester", "Cotton", "Straw", "Suede", "Patent Leather", "Exotic Leather"],
    },
    {
      groupSlug: "bags",
      name: "Color",
      slug: "bag-color",
      type: "color",
      isFilterable: true,
      sortOrder: 3,
      options: [
        "Black:#000000", "Brown:#92400E", "Tan:#D2B48C", "White:#FFFFFF",
        "Red:#DC2626", "Navy:#1E3A5F", "Burgundy:#800020", "Grey:#6B7280",
        "Pink:#EC4899", "Green:#16A34A", "Beige:#F5F5DC", "Cognac:#9A3324",
      ],
    },

    // ---- ELECTRONICS ----
    {
      groupSlug: "electronics",
      name: "Color",
      slug: "electronics-color",
      type: "color",
      isFilterable: true,
      sortOrder: 1,
      options: [
        "Black:#000000", "White:#FFFFFF", "Silver:#C0C0C0", "Space Grey:#4A4A4A",
        "Gold:#FFD700", "Rose Gold:#B76E79", "Blue:#2563EB", "Red:#DC2626",
        "Green:#16A34A", "Purple:#9333EA",
      ],
    },
    {
      groupSlug: "electronics",
      name: "Storage",
      slug: "electronics-storage",
      type: "select",
      isFilterable: true,
      sortOrder: 2,
      options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB", "4TB"],
    },
    {
      groupSlug: "electronics",
      name: "RAM",
      slug: "electronics-ram",
      type: "select",
      isFilterable: true,
      sortOrder: 3,
      options: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB", "64GB", "128GB"],
    },
    {
      groupSlug: "electronics",
      name: "Screen Size",
      slug: "electronics-screen",
      type: "select",
      isFilterable: true,
      sortOrder: 4,
      options: ["5\"", "5.5\"", "6\"", "6.1\"", "6.5\"", "6.7\"", "10\"", "11\"", "12.9\"", "13\"", "14\"", "15\"", "16\"", "17\"", "24\"", "27\"", "32\"", "43\"", "55\"", "65\"", "75\"", "85\""],
    },
    {
      groupSlug: "electronics",
      name: "Connectivity",
      slug: "electronics-connectivity",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 5,
      options: ["WiFi", "Bluetooth", "USB-C", "Lightning", "NFC", "5G", "4G LTE", "WiFi 6E", "Thunderbolt", "HDMI", "Ethernet"],
    },
    {
      groupSlug: "electronics",
      name: "Battery Life",
      slug: "electronics-battery",
      type: "select",
      isFilterable: false,
      sortOrder: 6,
      options: ["Up to 5h", "Up to 8h", "Up to 10h", "Up to 15h", "Up to 20h", "Up to 24h", "Up to 36h", "Up to 48h"],
    },

    // ---- FURNITURE ----
    {
      groupSlug: "furniture",
      name: "Material",
      slug: "furniture-material",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Solid Wood", "Engineered Wood", "Metal", "Glass", "Marble", "Rattan", "Wicker", "Upholstered", "Leather", "Bamboo", "Acrylic", "Concrete"],
    },
    {
      groupSlug: "furniture",
      name: "Color / Finish",
      slug: "furniture-color",
      type: "color",
      isFilterable: true,
      sortOrder: 2,
      options: [
        "Natural Wood:#DEB887", "Walnut:#5C4033", "Oak:#C8AD7F", "White:#FFFFFF",
        "Black:#000000", "Grey:#6B7280", "Espresso:#3C1414", "Cherry:#800020",
        "Mahogany:#C04000", "Ash:#B2BEB5", "Teak:#B8860B", "Matte White:#F5F5F5",
      ],
    },
    {
      groupSlug: "furniture",
      name: "Room",
      slug: "furniture-room",
      type: "select",
      isFilterable: true,
      sortOrder: 3,
      options: ["Living Room", "Bedroom", "Dining Room", "Office", "Bathroom", "Kitchen", "Outdoor", "Entryway", "Kids Room", "Nursery"],
    },
    {
      groupSlug: "furniture",
      name: "Style",
      slug: "furniture-style",
      type: "select",
      isFilterable: true,
      sortOrder: 4,
      options: ["Modern", "Contemporary", "Mid-Century Modern", "Scandinavian", "Industrial", "Rustic", "Traditional", "Bohemian", "Art Deco", "Minimalist", "Coastal", "Farmhouse"],
    },
    {
      groupSlug: "furniture",
      name: "Assembly",
      slug: "furniture-assembly",
      type: "select",
      isFilterable: false,
      sortOrder: 5,
      options: ["No Assembly Required", "Minimal Assembly", "Full Assembly Required", "Professional Assembly Recommended"],
    },

    // ---- CAR & AUTOMOTIVE ----
    {
      groupSlug: "automotive",
      name: "Vehicle Type",
      slug: "auto-vehicle-type",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Sedan", "SUV", "Truck", "Van", "Coupe", "Convertible", "Hatchback", "Wagon", "Motorcycle", "Universal"],
    },
    {
      groupSlug: "automotive",
      name: "Part Category",
      slug: "auto-part-category",
      type: "select",
      isFilterable: true,
      sortOrder: 2,
      options: ["Engine", "Brakes", "Suspension", "Exhaust", "Interior", "Exterior", "Electrical", "Tires & Wheels", "Lighting", "Audio & Electronics", "Performance", "Body Parts", "Fluids & Chemicals"],
    },
    {
      groupSlug: "automotive",
      name: "Compatibility",
      slug: "auto-compatibility",
      type: "text",
      isFilterable: false,
      sortOrder: 3,
      options: [],
    },
    {
      groupSlug: "automotive",
      name: "Condition",
      slug: "auto-condition",
      type: "select",
      isFilterable: true,
      sortOrder: 4,
      options: ["New", "Refurbished", "Used - Like New", "Used - Good", "Used - Fair"],
    },
    {
      groupSlug: "automotive",
      name: "Brand Fit",
      slug: "auto-brand-fit",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 5,
      options: ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Hyundai", "Kia", "Nissan", "Tesla", "Jeep", "Subaru", "Mazda", "Lexus", "Universal"],
    },

    // ---- SPORTS & OUTDOORS ----
    {
      groupSlug: "sports",
      name: "Sport Type",
      slug: "sports-type",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Running", "Cycling", "Yoga", "Swimming", "Basketball", "Football", "Tennis", "Golf", "Hiking", "Camping", "Fishing", "Gym & Fitness", "Soccer", "Baseball", "MMA/Boxing"],
    },
    {
      groupSlug: "sports",
      name: "Size",
      slug: "sports-size",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 2,
      options: ["XS", "S", "M", "L", "XL", "XXL", "One Size"],
    },
    {
      groupSlug: "sports",
      name: "Color",
      slug: "sports-color",
      type: "color",
      isFilterable: true,
      sortOrder: 3,
      options: [
        "Black:#000000", "White:#FFFFFF", "Red:#DC2626", "Blue:#2563EB",
        "Green:#16A34A", "Grey:#6B7280", "Orange:#EA580C", "Yellow:#EAB308",
        "Pink:#EC4899", "Navy:#1E3A5F", "Neon Green:#39FF14", "Neon Yellow:#CCFF00",
      ],
    },

    // ---- BEAUTY ----
    {
      groupSlug: "beauty",
      name: "Skin Type",
      slug: "beauty-skin-type",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Normal", "Dry", "Oily", "Combination", "Sensitive", "All Skin Types"],
    },
    {
      groupSlug: "beauty",
      name: "Shade",
      slug: "beauty-shade",
      type: "color",
      isFilterable: true,
      sortOrder: 2,
      options: [
        "Fair:#FFE4C4", "Light:#FFDAB9", "Medium:#D2B48C", "Tan:#C8A882",
        "Deep:#8B6914", "Rich:#654321", "Ebony:#3D2B1F",
      ],
    },
    {
      groupSlug: "beauty",
      name: "Concern",
      slug: "beauty-concern",
      type: "multi-select",
      isFilterable: true,
      sortOrder: 3,
      options: ["Anti-Aging", "Acne", "Hydration", "Brightening", "Sun Protection", "Dark Spots", "Redness", "Pores", "Wrinkles", "Dullness"],
    },
    {
      groupSlug: "beauty",
      name: "Ingredients",
      slug: "beauty-ingredients",
      type: "multi-select",
      isFilterable: false,
      sortOrder: 4,
      options: ["Retinol", "Hyaluronic Acid", "Vitamin C", "Niacinamide", "Salicylic Acid", "Peptides", "Ceramides", "AHA", "BHA", "SPF", "Collagen", "Squalane"],
    },
    {
      groupSlug: "beauty",
      name: "Formulation",
      slug: "beauty-formulation",
      type: "select",
      isFilterable: true,
      sortOrder: 5,
      options: ["Cream", "Serum", "Gel", "Oil", "Lotion", "Mist", "Foam", "Balm", "Powder", "Stick"],
    },

    // ---- HOME & KITCHEN ----
    {
      groupSlug: "home-kitchen",
      name: "Material",
      slug: "home-material",
      type: "select",
      isFilterable: true,
      sortOrder: 1,
      options: ["Stainless Steel", "Cast Iron", "Ceramic", "Glass", "Silicone", "Wood", "Bamboo", "Plastic", "Copper", "Non-Stick", "Porcelain"],
    },
    {
      groupSlug: "home-kitchen",
      name: "Color",
      slug: "home-color",
      type: "color",
      isFilterable: true,
      sortOrder: 2,
      options: [
        "Black:#000000", "White:#FFFFFF", "Silver:#C0C0C0", "Red:#DC2626",
        "Blue:#2563EB", "Green:#16A34A", "Grey:#6B7280", "Cream:#FFFDD0",
        "Gold:#FFD700", "Copper:#B87333",
      ],
    },
  ];

  for (const attr of attributesDef) {
    const groupId = createdGroups[attr.groupSlug];
    const existing = await db.query.productAttributes.findFirst({
      where: eq(schema.productAttributes.slug, attr.slug),
    });
    if (!existing) {
      await db.insert(schema.productAttributes).values({
        groupId,
        name: attr.name,
        slug: attr.slug,
        type: attr.type,
        isFilterable: attr.isFilterable,
        sortOrder: attr.sortOrder,
        options: JSON.stringify(attr.options),
      });
    }
  }
  console.log(`✅ Created ${attributesDef.length} product attributes`);

  console.log("🎉 Attribute seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
