// Drizzle ORM Schema
// All tables use CUID2 for primary keys — Neon PostgreSQL

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  real,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// Helper for CUID default
const cuid = () => text("id").primaryKey().$defaultFn(() => createId());

// ============================================================
// AUTH & USERS
// ============================================================

export const users = pgTable("User", {
  id: cuid(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: text("role").notNull().default("CUSTOMER"),
  phone: text("phone"),
  tags: text("tags"), // comma-separated customer tags
  notes: text("notes"), // admin notes about customer
  taxExempt: boolean("taxExempt").notNull().default(false),
  acceptsMarketing: boolean("acceptsMarketing").notNull().default(false),
  totalSpent: decimal("totalSpent", { precision: 12, scale: 2 }).notNull().default("0"),
  orderCount: integer("orderCount").notNull().default(0),
  storeCreditBalance: decimal("storeCreditBalance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orders: many(orders),
  reviews: many(reviews),
  addresses: many(addresses),
  cart: one(carts),
  wishlist: many(wishlistItems),
  staffPermissions: many(staffPermissions),
}));

export const accounts = pgTable("Account", {
  id: cuid(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [
  uniqueIndex("Account_provider_providerAccountId_key").on(t.provider, t.providerAccountId),
]);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = pgTable("Session", {
  id: cuid(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = pgTable("VerificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [
  uniqueIndex("VerificationToken_identifier_token_key").on(t.identifier, t.token),
]);

// ============================================================
// PRODUCTS & CATALOG
// ============================================================

export const categories = pgTable("Category", {
  id: cuid(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  parentId: text("parentId").references((): any => categories.id, { onDelete: "set null" }),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("Category_isActive_idx").on(t.isActive),
  index("Category_parentId_idx").on(t.parentId),
]);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "CategoryTree" }),
  children: many(categories, { relationName: "CategoryTree" }),
  products: many(productCategories),
}));

export const products = pgTable("Product", {
  id: cuid(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("shortDescription"),
  sku: text("sku").unique(),
  barcode: text("barcode"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: decimal("compareAtPrice", { precision: 12, scale: 2 }),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }),
  taxable: boolean("taxable").notNull().default(true),
  taxRate: real("taxRate").notNull().default(0),
  trackInventory: boolean("trackInventory").notNull().default(true),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("lowStockThreshold").notNull().default(5),
  continueSellingWhenOOS: boolean("continueSellingWhenOOS").notNull().default(false),
  weight: real("weight"),
  weightUnit: text("weightUnit").notNull().default("kg"),
  length: real("length"),
  width: real("width"),
  height: real("height"),
  dimensionUnit: text("dimensionUnit").notNull().default("cm"),
  status: text("status").notNull().default("DRAFT"),
  productType: text("productType"),
  vendor: text("vendor"),
  tags: text("tags"),
  isFeatured: boolean("isFeatured").notNull().default(false),
  isDigital: boolean("isDigital").notNull().default(false),
  isGiftCard: boolean("isGiftCard").notNull().default(false),
  requiresShipping: boolean("requiresShipping").notNull().default(true),
  averageRating: real("averageRating").notNull().default(0),
  reviewCount: integer("reviewCount").notNull().default(0),
  sortOrder: integer("sortOrder").notNull().default(0),
  seoTitle: text("seoTitle"),
  seoDescription: text("seoDescription"),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  scheduledAt: timestamp("scheduledAt", { mode: "date" }),
  customBadge: text("customBadge"),
  warrantyInfo: text("warrantyInfo"),
  estimatedDelivery: text("estimatedDelivery"),
  hsCode: text("hsCode"),
  countryOfOrigin: text("countryOfOrigin"),
  minOrderQty: integer("minOrderQty").notNull().default(1),
  maxOrderQty: integer("maxOrderQty"),
  salePriceFrom: timestamp("salePriceFrom", { mode: "date" }),
  salePriceTo: timestamp("salePriceTo", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("Product_status_idx").on(t.status),
  index("Product_createdAt_idx").on(t.createdAt),
  index("Product_isFeatured_idx").on(t.isFeatured),
]);

export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  variants: many(productVariants),
  categories: many(productCategories),
  reviews: many(reviews),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
  wishlist: many(wishlistItems),
  attributeValues: many(productAttributeValues),
  bundleItems: many(productBundles, { relationName: "BundleParent" }),
  bundledIn: many(productBundles, { relationName: "BundleChild" }),
  channels: many(channelProducts),
}));

export const productBundles = pgTable("ProductBundle", {
  id: cuid(),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  childId: text("childId").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  discount: real("discount").notNull().default(0),
}, (t) => [
  uniqueIndex("ProductBundle_productId_childId_key").on(t.productId, t.childId),
]);

export const productBundlesRelations = relations(productBundles, ({ one }) => ({
  product: one(products, { fields: [productBundles.productId], references: [products.id], relationName: "BundleParent" }),
  child: one(products, { fields: [productBundles.childId], references: [products.id], relationName: "BundleChild" }),
}));

// ============================================================
// PRODUCT ATTRIBUTES & FILTERS
// ============================================================

export const productGroups = pgTable("ProductGroup", {
  id: cuid(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const productGroupsRelations = relations(productGroups, ({ many }) => ({
  attributes: many(productAttributes),
}));

export const productAttributes = pgTable("ProductAttribute", {
  id: cuid(),
  groupId: text("groupId").references(() => productGroups.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("select"),
  isFilterable: boolean("isFilterable").notNull().default(true),
  isRequired: boolean("isRequired").notNull().default(false),
  sortOrder: integer("sortOrder").notNull().default(0),
  options: text("options"), // JSON array
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const productAttributesRelations = relations(productAttributes, ({ one, many }) => ({
  group: one(productGroups, { fields: [productAttributes.groupId], references: [productGroups.id] }),
  values: many(productAttributeValues),
}));

export const productAttributeValues = pgTable("ProductAttributeValue", {
  id: cuid(),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  attributeId: text("attributeId").notNull().references(() => productAttributes.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
}, (t) => [
  uniqueIndex("ProductAttributeValue_productId_attributeId_value_key").on(t.productId, t.attributeId, t.value),
]);

export const productAttributeValuesRelations = relations(productAttributeValues, ({ one }) => ({
  product: one(products, { fields: [productAttributeValues.productId], references: [products.id] }),
  attribute: one(productAttributes, { fields: [productAttributeValues.attributeId], references: [productAttributes.id] }),
}));

export const productImages = pgTable("ProductImage", {
  id: cuid(),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("isPrimary").notNull().default(false),
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariants = pgTable("ProductVariant", {
  id: cuid(),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  barcode: text("barcode"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  compareAtPrice: decimal("compareAtPrice", { precision: 12, scale: 2 }),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }),
  quantity: integer("quantity").notNull().default(0),
  weight: real("weight"),
  option1: text("option1"),
  option2: text("option2"),
  option3: text("option3"),
  image: text("image"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("ProductVariant_productId_idx").on(t.productId),
]);

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

export const productCategories = pgTable("ProductCategory", {
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: text("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.productId, t.categoryId] }),
]);

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}));

export const reviews = pgTable("Review", {
  id: cuid(),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  isApproved: boolean("isApproved").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("Review_productId_idx").on(t.productId),
  index("Review_userId_idx").on(t.userId),
  index("Review_isApproved_idx").on(t.isApproved),
]);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

// ============================================================
// ORDERS & CHECKOUT
// ============================================================

export const orders = pgTable("Order", {
  id: cuid(),
  orderNumber: text("orderNumber").notNull().unique(),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("PENDING"),
  paymentStatus: text("paymentStatus").notNull().default("PENDING"),
  fulfillmentStatus: text("fulfillmentStatus").notNull().default("UNFULFILLED"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingAmount: decimal("shippingAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("SAR"),
  notes: text("notes"),
  source: text("source").notNull().default("ONLINE"),
  paymentMethod: text("paymentMethod"),
  shippingMethod: text("shippingMethod"),
  trackingNumber: text("trackingNumber"),
  cancelReason: text("cancelReason"),
  refundReason: text("refundReason"),
  couponCode: text("couponCode"),
  autoDiscountIds: text("autoDiscountIds"),
  tags: text("tags"), // comma-separated order tags
  isDraft: boolean("isDraft").notNull().default(false),
  idempotencyKey: text("idempotencyKey").unique(),
  giftCardCode: text("giftCardCode"),
  giftCardAmount: decimal("giftCardAmount", { precision: 12, scale: 2 }),
  storeCreditAmount: decimal("storeCreditAmount", { precision: 12, scale: 2 }),
  shippingAddressId: text("shippingAddressId").unique(),
  billingAddressId: text("billingAddressId").unique(),
  // ZATCA e-invoicing
  zatcaStatus: text("zatcaStatus").notNull().default("PENDING"), // PENDING | REPORTED | CLEARED | FAILED | NOT_APPLICABLE
  zatcaReportedAt: timestamp("zatcaReportedAt", { mode: "date" }),
  zatcaInvoiceHash: text("zatcaInvoiceHash"),
  zatcaRequestId: text("zatcaRequestId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("Order_userId_idx").on(t.userId),
  index("Order_status_idx").on(t.status),
  index("Order_createdAt_idx").on(t.createdAt),
  index("Order_paymentStatus_idx").on(t.paymentStatus),
  index("Order_fulfillmentStatus_idx").on(t.fulfillmentStatus),
  index("Order_email_idx").on(t.email),
]);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  shippingAddress: one(orderAddresses, { fields: [orders.shippingAddressId], references: [orderAddresses.id], relationName: "ShippingAddress" }),
  billingAddress: one(orderAddresses, { fields: [orders.billingAddressId], references: [orderAddresses.id], relationName: "BillingAddress" }),
  transactions: many(transactions),
  timeline: many(orderTimeline),
  refunds: many(refunds),
  returns: many(returns),
  fulfillments: many(fulfillments),
  channelOrders: many(channelOrders),
}));

export const orderItems = pgTable("OrderItem", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "restrict" }),
  variantId: text("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  variantName: text("variantName"),
}, (t) => [
  index("OrderItem_orderId_idx").on(t.orderId),
]);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const orderAddresses = pgTable("OrderAddress", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  company: text("company"),
  address1: text("address1").notNull(),
  address2: text("address2"),
  city: text("city").notNull(),
  state: text("state"),
  postalCode: text("postalCode").notNull(),
  country: text("country").notNull(),
  phone: text("phone"),
}, (t) => [
  uniqueIndex("OrderAddress_orderId_type_key").on(t.orderId, t.type),
]);

export const orderAddressesRelations = relations(orderAddresses, ({ one }) => ({
  shippingOrder: one(orders, { fields: [orderAddresses.id], references: [orders.shippingAddressId], relationName: "ShippingAddress" }),
  billingOrder: one(orders, { fields: [orderAddresses.id], references: [orders.billingAddressId], relationName: "BillingAddress" }),
}));

export const transactions = pgTable("Transaction", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("SAR"),
  paymentMethod: text("paymentMethod").notNull(),
  reference: text("reference"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
}));

export const orderTimeline = pgTable("OrderTimeline", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message"),
  type: text("type").notNull().default("INFO"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const orderTimelineRelations = relations(orderTimeline, ({ one }) => ({
  order: one(orders, { fields: [orderTimeline.orderId], references: [orders.id] }),
}));

// ============================================================
// CART
// ============================================================

export const carts = pgTable("Cart", {
  id: cuid(),
  userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItems = pgTable("CartItem", {
  id: cuid(),
  cartId: text("cartId").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: text("variantId").references(() => productVariants.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
}, (t) => [
  uniqueIndex("CartItem_cartId_productId_variantId_key").on(t.cartId, t.productId, t.variantId),
]);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const wishlistItems = pgTable("WishlistItem", {
  id: cuid(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("WishlistItem_userId_productId_key").on(t.userId, t.productId),
]);

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

// ============================================================
// REFUNDS
// ============================================================

export const refunds = pgTable("Refund", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason"),
  notes: text("notes"),
  status: text("status").notNull().default("PENDING"), // PENDING | APPROVED | COMPLETED | REJECTED
  type: text("type").notNull().default("PARTIAL"), // FULL | PARTIAL
  restockItems: boolean("restockItems").notNull().default(false),
  processedBy: text("processedBy"),
  // ZATCA credit note tracking
  zatcaStatus: text("zatcaStatus").notNull().default("PENDING"), // PENDING | REPORTED | FAILED | NOT_APPLICABLE
  zatcaReportedAt: timestamp("zatcaReportedAt", { mode: "date" }),
  zatcaInvoiceHash: text("zatcaInvoiceHash"),
  zatcaCreditNoteNumber: text("zatcaCreditNoteNumber"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const refundsRelations = relations(refunds, ({ one, many }) => ({
  order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
  items: many(refundItems),
}));

export const refundItems = pgTable("RefundItem", {
  id: cuid(),
  refundId: text("refundId").notNull().references(() => refunds.id, { onDelete: "cascade" }),
  orderItemId: text("orderItemId").notNull().references(() => orderItems.id),
  quantity: integer("quantity").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
});

export const refundItemsRelations = relations(refundItems, ({ one }) => ({
  refund: one(refunds, { fields: [refundItems.refundId], references: [refunds.id] }),
  orderItem: one(orderItems, { fields: [refundItems.orderItemId], references: [orderItems.id] }),
}));

// ============================================================
// RETURNS
// ============================================================

export const returns = pgTable("Return", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  returnNumber: text("returnNumber").notNull().unique(),
  status: text("status").notNull().default("REQUESTED"), // REQUESTED | APPROVED | RECEIVED | COMPLETED | REJECTED
  reason: text("reason").notNull(),
  customerNotes: text("customerNotes"),
  adminNotes: text("adminNotes"),
  action: text("action").notNull().default("REFUND"), // REFUND | EXCHANGE | STORE_CREDIT
  trackingNumber: text("trackingNumber"),
  processedBy: text("processedBy"),
  refundId: text("refundId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const returnsRelations = relations(returns, ({ one, many }) => ({
  order: one(orders, { fields: [returns.orderId], references: [orders.id] }),
  items: many(returnItems),
}));

export const returnItems = pgTable("ReturnItem", {
  id: cuid(),
  returnId: text("returnId").notNull().references(() => returns.id, { onDelete: "cascade" }),
  orderItemId: text("orderItemId").notNull().references(() => orderItems.id),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  condition: text("condition"), // NEW | OPENED | DAMAGED
});

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  returnReq: one(returns, { fields: [returnItems.returnId], references: [returns.id] }),
  orderItem: one(orderItems, { fields: [returnItems.orderItemId], references: [orderItems.id] }),
}));

// ============================================================
// FULFILLMENTS
// ============================================================

export const fulfillments = pgTable("Fulfillment", {
  id: cuid(),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("PENDING"), // PENDING | SHIPPED | DELIVERED | CANCELLED
  trackingNumber: text("trackingNumber"),
  trackingUrl: text("trackingUrl"),
  carrier: text("carrier"),
  notes: text("notes"),
  shippedAt: timestamp("shippedAt", { mode: "date" }),
  deliveredAt: timestamp("deliveredAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const fulfillmentsRelations = relations(fulfillments, ({ one, many }) => ({
  order: one(orders, { fields: [fulfillments.orderId], references: [orders.id] }),
  items: many(fulfillmentItems),
}));

export const fulfillmentItems = pgTable("FulfillmentItem", {
  id: cuid(),
  fulfillmentId: text("fulfillmentId").notNull().references(() => fulfillments.id, { onDelete: "cascade" }),
  orderItemId: text("orderItemId").notNull().references(() => orderItems.id),
  quantity: integer("quantity").notNull(),
});

export const fulfillmentItemsRelations = relations(fulfillmentItems, ({ one }) => ({
  fulfillment: one(fulfillments, { fields: [fulfillmentItems.fulfillmentId], references: [fulfillments.id] }),
  orderItem: one(orderItems, { fields: [fulfillmentItems.orderItemId], references: [orderItems.id] }),
}));

// ============================================================
// CUSTOMER ADDRESSES
// ============================================================

export const addresses = pgTable("Address", {
  id: cuid(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label"),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  company: text("company"),
  address1: text("address1").notNull(),
  address2: text("address2"),
  city: text("city").notNull(),
  state: text("state"),
  postalCode: text("postalCode").notNull(),
  country: text("country").notNull(),
  phone: text("phone"),
  isDefault: boolean("isDefault").notNull().default(false),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

// ============================================================
// DISCOUNTS & COUPONS
// ============================================================

export const coupons = pgTable("Coupon", {
  id: cuid(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: text("type").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 12, scale: 2 }),
  maxDiscountAmount: decimal("maxDiscountAmount", { precision: 12, scale: 2 }),
  usageLimit: integer("usageLimit"),
  usedCount: integer("usedCount").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  startsAt: timestamp("startsAt", { mode: "date" }),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  usages: many(couponUsages),
}));

// Per-customer/guest coupon usage tracking
export const couponUsages = pgTable("CouponUsage", {
  id: cuid(),
  couponId: text("couponId").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  orderId: text("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("CouponUsage_couponId_idx").on(t.couponId),
  index("CouponUsage_userId_idx").on(t.userId),
  index("CouponUsage_email_idx").on(t.email),
  uniqueIndex("CouponUsage_couponId_orderId_key").on(t.couponId, t.orderId),
]);

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, { fields: [couponUsages.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponUsages.userId], references: [users.id] }),
  order: one(orders, { fields: [couponUsages.orderId], references: [orders.id] }),
}));

// ============================================================
// STORE SETTINGS & CONFIGURATION
// ============================================================

export const storeSettings = pgTable("StoreSettings", {
  id: cuid(),
  storeName: text("storeName").notNull().default("My Store"),
  storeDescription: text("storeDescription"),
  storeLogo: text("storeLogo"),
  storeFavicon: text("storeFavicon"),
  storeEmail: text("storeEmail"),
  storePhone: text("storePhone"),
  storeAddress: text("storeAddress"),
  currency: text("currency").notNull().default("SAR"),
  currencySymbol: text("currencySymbol").notNull().default("SAR"),
  taxRate: real("taxRate").notNull().default(0),
  taxIncluded: boolean("taxIncluded").notNull().default(false),
  shippingEnabled: boolean("shippingEnabled").notNull().default(true),
  freeShippingMin: decimal("freeShippingMin", { precision: 12, scale: 2 }),
  flatShippingRate: decimal("flatShippingRate", { precision: 12, scale: 2 }),
  timezone: text("timezone").notNull().default("UTC"),
  weightUnit: text("weightUnit").notNull().default("kg"),
  socialFacebook: text("socialFacebook"),
  socialInstagram: text("socialInstagram"),
  socialTwitter: text("socialTwitter"),
  socialYoutube: text("socialYoutube"),
  metaTitle: text("metaTitle"),
  metaDescription: text("metaDescription"),
  googleAnalyticsId: text("googleAnalyticsId"),
  customCss: text("customCss"),
  customJs: text("customJs"),
  maintenanceMode: boolean("maintenanceMode").notNull().default(false),
  posEnabled: boolean("posEnabled").notNull().default(true),
  tapEnabled: boolean("tapEnabled").notNull().default(false),
  tapTestMode: boolean("tapTestMode").notNull().default(true),
  tapPublicKey: text("tapPublicKey"),
  tapSecretKey: text("tapSecretKey"),
  codEnabled: boolean("codEnabled").notNull().default(true),
  // ZATCA e-invoicing
  zatcaEnabled: boolean("zatcaEnabled").notNull().default(true),
  vatNumber: text("vatNumber"),
  commercialRegNo: text("commercialRegNo"),
  // ZATCA API integration (Phase 2)
  zatcaEnvironment: text("zatcaEnvironment").notNull().default("sandbox"), // sandbox | simulation | production
  zatcaCsid: text("zatcaCsid"), // Base64-encoded compliance/production certificate
  zatcaSecret: text("zatcaSecret"), // Secret key returned with CSID
  zatcaPcsid: text("zatcaPcsid"), // Production CSID (Base64)
  zatcaPcsidSecret: text("zatcaPcsidSecret"), // Production secret
  zatcaInvoiceCounter: integer("zatcaInvoiceCounter").notNull().default(0),
  zatcaPreviousHash: text("zatcaPreviousHash").notNull().default("NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=="), // Base64 of SHA-256 hash of "0"
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// TEMPLATE SYSTEM
// ============================================================

export const templates = pgTable("Template", {
  id: cuid(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  isActive: boolean("isActive").notNull().default(false),
  isDefault: boolean("isDefault").notNull().default(false),
  config: text("config"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const templatesRelations = relations(templates, ({ many }) => ({
  sections: many(templateSections),
}));

export const templateSections = pgTable("TemplateSection", {
  id: cuid(),
  templateId: text("templateId").notNull().references(() => templates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: text("config"),
  content: text("content"),
  sortOrder: integer("sortOrder").notNull().default(0),
  isVisible: boolean("isVisible").notNull().default(true),
});

export const templateSectionsRelations = relations(templateSections, ({ one }) => ({
  template: one(templates, { fields: [templateSections.templateId], references: [templates.id] }),
}));

// ============================================================
// NAVIGATION
// ============================================================

export const navigations = pgTable("Navigation", {
  id: cuid(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  items: text("items").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// PAGES (CMS)
// ============================================================

export const pages = pgTable("Page", {
  id: cuid(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  isPublished: boolean("isPublished").notNull().default(false),
  seoTitle: text("seoTitle"),
  seoDescription: text("seoDescription"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// POS SESSIONS
// ============================================================

export const posSessions = pgTable("PosSession", {
  id: cuid(),
  staffId: text("staffId").notNull(),
  staffName: text("staffName").notNull(),
  openedAt: timestamp("openedAt", { mode: "date" }).notNull().defaultNow(),
  closedAt: timestamp("closedAt", { mode: "date" }),
  openingBalance: decimal("openingBalance", { precision: 12, scale: 2 }).notNull().default("0"),
  closingBalance: decimal("closingBalance", { precision: 12, scale: 2 }),
  totalSales: decimal("totalSales", { precision: 12, scale: 2 }).notNull().default("0"),
  totalOrders: integer("totalOrders").notNull().default(0),
  notes: text("notes"),
  status: text("status").notNull().default("OPEN"),
});

// ============================================================
// NEWSLETTER SUBSCRIBERS
// ============================================================

export const subscribers = pgTable("Subscriber", {
  id: cuid(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("ACTIVE"),
  subscribedAt: timestamp("subscribedAt", { mode: "date" }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribedAt", { mode: "date" }),
});

// ============================================================
// ABANDONED CARTS
// ============================================================

export const abandonedCarts = pgTable("AbandonedCart", {
  id: cuid(),
  userId: text("userId"),
  email: text("email"),
  phone: text("phone"),
  items: text("items").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  recoveryToken: text("recoveryToken").notNull().unique().$defaultFn(() => createId()),
  status: text("status").notNull().default("ABANDONED"),
  emailSentAt: timestamp("emailSentAt", { mode: "date" }),
  recoveredAt: timestamp("recoveredAt", { mode: "date" }),
  orderId: text("orderId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// SHIPPING ZONES & RATES
// ============================================================

export const shippingZones = pgTable("ShippingZone", {
  id: cuid(),
  name: text("name").notNull(),
  countries: text("countries").notNull(),
  regions: text("regions"),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
  rates: many(shippingRates),
}));

export const shippingRates = pgTable("ShippingRate", {
  id: cuid(),
  zoneId: text("zoneId").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("FLAT"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull().default("0"),
  minWeight: real("minWeight"),
  maxWeight: real("maxWeight"),
  minOrderAmount: decimal("minOrderAmount", { precision: 12, scale: 2 }),
  maxOrderAmount: decimal("maxOrderAmount", { precision: 12, scale: 2 }),
  estimatedDays: text("estimatedDays"),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({
  zone: one(shippingZones, { fields: [shippingRates.zoneId], references: [shippingZones.id] }),
}));

// ============================================================
// AUTOMATIC DISCOUNTS
// ============================================================

export const autoDiscounts = pgTable("AutoDiscount", {
  id: cuid(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  priority: integer("priority").notNull().default(0),
  combinesWith: boolean("combinesWith").notNull().default(false),
  minQuantity: integer("minQuantity"),
  minOrderAmount: decimal("minOrderAmount", { precision: 12, scale: 2 }),
  buyProductIds: text("buyProductIds"),
  buyCategoryIds: text("buyCategoryIds"),
  customerIds: text("customerIds"),
  discountType: text("discountType").notNull().default("PERCENTAGE"),
  discountValue: real("discountValue").notNull().default(0),
  getQuantity: integer("getQuantity"),
  getProductIds: text("getProductIds"),
  getCategoryIds: text("getCategoryIds"),
  maxUsesTotal: integer("maxUsesTotal"),
  maxUsesPerCustomer: integer("maxUsesPerCustomer"),
  usedCount: integer("usedCount").notNull().default(0),
  startsAt: timestamp("startsAt", { mode: "date" }),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// DRAFT ORDERS
// ============================================================

export const draftOrders = pgTable("DraftOrder", {
  id: cuid(),
  draftNumber: text("draftNumber").notNull().unique(),
  customerId: text("customerId"),
  customerEmail: text("customerEmail"),
  customerPhone: text("customerPhone"),
  customerName: text("customerName"),
  items: text("items").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingAmount: decimal("shippingAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  shippingAddress: text("shippingAddress"),
  billingAddress: text("billingAddress"),
  status: text("status").notNull().default("OPEN"),
  orderId: text("orderId"),
  createdBy: text("createdBy").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// STAFF PERMISSIONS
// ============================================================

export const staffPermissions = pgTable("StaffPermission", {
  id: cuid(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(), // e.g. "products", "orders", "customers", "settings"
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("StaffPermission_userId_permission_key").on(t.userId, t.permission),
]);

export const staffPermissionsRelations = relations(staffPermissions, ({ one }) => ({
  user: one(users, { fields: [staffPermissions.userId], references: [users.id] }),
}));

// ============================================================
// GIFT CARDS
// ============================================================

export const giftCards = pgTable("GiftCard", {
  id: cuid(),
  code: text("code").notNull().unique(),
  initialBalance: decimal("initialBalance", { precision: 12, scale: 2 }).notNull(),
  currentBalance: decimal("currentBalance", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("SAR"),
  recipientEmail: text("recipientEmail"),
  recipientName: text("recipientName"),
  senderName: text("senderName"),
  message: text("message"),
  orderId: text("orderId"),
  customerId: text("customerId"),
  isActive: boolean("isActive").notNull().default(true),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
  lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("GiftCard_code_idx").on(t.code),
  index("GiftCard_customerId_idx").on(t.customerId),
]);

export const giftCardTransactions = pgTable("GiftCardTransaction", {
  id: cuid(),
  giftCardId: text("giftCardId").notNull().references(() => giftCards.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(), // CREDIT | DEBIT
  orderId: text("orderId"),
  note: text("note"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const giftCardsRelations = relations(giftCards, ({ many }) => ({
  transactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(giftCardTransactions, ({ one }) => ({
  giftCard: one(giftCards, { fields: [giftCardTransactions.giftCardId], references: [giftCards.id] }),
}));

// ============================================================
// BLOG
// ============================================================

export const blogCategories = pgTable("BlogCategory", {
  id: cuid(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: text("parentId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const blogPostCategories = pgTable("BlogPostCategory", {
  postId: text("postId").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  categoryId: text("categoryId").notNull().references(() => blogCategories.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.postId, t.categoryId] }),
]);

export const blogPosts = pgTable("BlogPost", {
  id: cuid(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  excerpt: text("excerpt"),
  featuredImage: text("featuredImage"),
  authorId: text("authorId").references(() => users.id, { onDelete: "set null" }),
  tags: text("tags"), // comma-separated
  isPublished: boolean("isPublished").notNull().default(false),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  seoTitle: text("seoTitle"),
  seoDescription: text("seoDescription"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("BlogPost_isPublished_idx").on(t.isPublished),
  index("BlogPost_publishedAt_idx").on(t.publishedAt),
]);

export const blogCategoriesRelations = relations(blogCategories, ({ one, many }) => ({
  parent: one(blogCategories, { fields: [blogCategories.parentId], references: [blogCategories.id], relationName: "blogCategoryParent" }),
  children: many(blogCategories, { relationName: "blogCategoryParent" }),
  postCategories: many(blogPostCategories),
}));

export const blogPostCategoriesRelations = relations(blogPostCategories, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostCategories.postId], references: [blogPosts.id] }),
  category: one(blogCategories, { fields: [blogPostCategories.categoryId], references: [blogCategories.id] }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
  postCategories: many(blogPostCategories),
}));

// ============================================================
// SMART COLLECTIONS
// ============================================================

export const smartCollections = pgTable("SmartCollection", {
  id: cuid(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  rules: text("rules").notNull(), // JSON: array of { field, operator, value }
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  seoTitle: text("seoTitle"),
  seoDescription: text("seoDescription"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ============================================================
// STORE CREDIT
// ============================================================

export const storeCreditTransactions = pgTable("StoreCreditTransaction", {
  id: cuid(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type").notNull(), // CREDIT | DEBIT
  reason: text("reason"),
  orderId: text("orderId"),
  processedBy: text("processedBy"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("StoreCreditTransaction_userId_idx").on(t.userId),
]);

export const storeCreditTransactionsRelations = relations(storeCreditTransactions, ({ one }) => ({
  user: one(users, { fields: [storeCreditTransactions.userId], references: [users.id] }),
}));

// ============================================================
// ACTIVITY LOG (Admin-visible audit trail)
// ============================================================

export const activityLogs = pgTable("ActivityLog", {
  id: cuid(),
  userId: text("userId"),
  userName: text("userName"),
  action: text("action").notNull(),
  entityType: text("entityType").notNull(), // ORDER | PRODUCT | CUSTOMER | SETTING | GIFT_CARD | ...
  entityId: text("entityId"),
  details: text("details"), // JSON extra info
  ipAddress: text("ipAddress"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("ActivityLog_userId_idx").on(t.userId),
  index("ActivityLog_entityType_idx").on(t.entityType),
  index("ActivityLog_createdAt_idx").on(t.createdAt),
]);

// ============================================================
// NOTIFICATIONS (Admin in-app notifications)
// ============================================================

export const notifications = pgTable("Notification", {
  id: cuid(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // NEW_ORDER | LOW_STOCK | NEW_CUSTOMER | RETURN_REQUEST | NEW_REVIEW | ...
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("isRead").notNull().default(false),
  entityType: text("entityType"),
  entityId: text("entityId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("Notification_userId_idx").on(t.userId),
  index("Notification_isRead_idx").on(t.isRead),
  index("Notification_createdAt_idx").on(t.createdAt),
]);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ============================================================
// INVENTORY ADJUSTMENTS HISTORY
// ============================================================

export const inventoryAdjustments = pgTable("InventoryAdjustment", {
  id: cuid(),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: text("variantId"),
  previousQuantity: integer("previousQuantity").notNull(),
  newQuantity: integer("newQuantity").notNull(),
  adjustmentQuantity: integer("adjustmentQuantity").notNull(),
  reason: text("reason").notNull(), // MANUAL | ORDER | RESTOCK | RETURN | CORRECTION | TRANSFER
  note: text("note"),
  userId: text("userId"),
  userName: text("userName"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("InventoryAdjustment_productId_idx").on(t.productId),
  index("InventoryAdjustment_createdAt_idx").on(t.createdAt),
]);

// ============================================================
// CONTENT TRANSLATIONS (Dynamic content i18n)
// ============================================================
// Generic translation table for any translatable entity:
// products, categories, pages, blogPosts, smartCollections

export const contentTranslations = pgTable("ContentTranslation", {
  id: cuid(),
  entityType: text("entityType").notNull(), // product | category | page | blogPost | smartCollection
  entityId: text("entityId").notNull(),
  locale: text("locale").notNull(), // e.g. "ar", "en"
  field: text("field").notNull(), // e.g. "name", "description", "seoTitle"
  value: text("value").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("ContentTranslation_entity_locale_field_idx").on(t.entityType, t.entityId, t.locale, t.field),
  index("ContentTranslation_entityType_entityId_idx").on(t.entityType, t.entityId),
  index("ContentTranslation_locale_idx").on(t.locale),
]);

// ============================================================
// SALES CHANNELS (Facebook, Instagram, Google, TikTok)
// ============================================================

export const salesChannels = pgTable("SalesChannel", {
  id: cuid(),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // FACEBOOK | INSTAGRAM | GOOGLE | WHATSAPP | TIKTOK
  status: text("status").notNull().default("DISCONNECTED"), // ACTIVE | PAUSED | DISCONNECTED | ERROR
  // OAuth / API credentials (encrypted JSON: { accessToken, pageAccessToken, refreshToken, expiresAt })
  credentials: text("credentials"),
  // Platform-specific identifiers
  externalAccountId: text("externalAccountId"), // Business Account ID
  externalPageId: text("externalPageId"), // FB Page ID or IG Business ID
  externalCatalogId: text("externalCatalogId"), // Platform catalog ID
  pixelId: text("pixelId"), // Meta Pixel / Conversions API dataset ID
  // Sync settings (JSON: { autoSync, syncFrequency, syncInventory, syncOrders })
  settings: text("settings"),
  lastSyncAt: timestamp("lastSyncAt", { mode: "date" }),
  lastSyncStatus: text("lastSyncStatus"), // SUCCESS | PARTIAL | FAILED
  lastSyncError: text("lastSyncError"),
  syncedProductCount: integer("syncedProductCount").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("SalesChannel_platform_idx").on(t.platform),
  index("SalesChannel_status_idx").on(t.status),
]);

export const salesChannelsRelations = relations(salesChannels, ({ many }) => ({
  products: many(channelProducts),
  orders: many(channelOrders),
  syncLogs: many(channelSyncLogs),
}));

export const channelProducts = pgTable("ChannelProduct", {
  id: cuid(),
  channelId: text("channelId").notNull().references(() => salesChannels.id, { onDelete: "cascade" }),
  productId: text("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
  externalProductId: text("externalProductId"), // Platform-side product/item ID
  externalVariantIds: text("externalVariantIds"), // JSON: { variantId: externalId }
  status: text("status").notNull().default("PENDING"), // PENDING | SYNCED | REJECTED | ERROR
  lastSyncAt: timestamp("lastSyncAt", { mode: "date" }),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("ChannelProduct_channelId_productId_key").on(t.channelId, t.productId),
  index("ChannelProduct_channelId_idx").on(t.channelId),
  index("ChannelProduct_productId_idx").on(t.productId),
  index("ChannelProduct_status_idx").on(t.status),
]);

export const channelProductsRelations = relations(channelProducts, ({ one }) => ({
  channel: one(salesChannels, { fields: [channelProducts.channelId], references: [salesChannels.id] }),
  product: one(products, { fields: [channelProducts.productId], references: [products.id] }),
}));

export const channelOrders = pgTable("ChannelOrder", {
  id: cuid(),
  channelId: text("channelId").notNull().references(() => salesChannels.id, { onDelete: "cascade" }),
  orderId: text("orderId").references(() => orders.id, { onDelete: "set null" }),
  externalOrderId: text("externalOrderId").notNull(), // Platform order ID
  externalCustomerId: text("externalCustomerId"),
  platform: text("platform").notNull(), // FACEBOOK | INSTAGRAM | WHATSAPP | TIKTOK
  status: text("status").notNull().default("PENDING"), // PENDING | IMPORTED | FULFILLED | ERROR
  rawPayload: text("rawPayload"), // Raw JSON from platform
  lastError: text("lastError"),
  processedAt: timestamp("processedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("ChannelOrder_channelId_externalOrderId_key").on(t.channelId, t.externalOrderId),
  index("ChannelOrder_channelId_idx").on(t.channelId),
  index("ChannelOrder_orderId_idx").on(t.orderId),
  index("ChannelOrder_status_idx").on(t.status),
]);

export const channelOrdersRelations = relations(channelOrders, ({ one }) => ({
  channel: one(salesChannels, { fields: [channelOrders.channelId], references: [salesChannels.id] }),
  order: one(orders, { fields: [channelOrders.orderId], references: [orders.id] }),
}));

export const channelSyncLogs = pgTable("ChannelSyncLog", {
  id: cuid(),
  channelId: text("channelId").notNull().references(() => salesChannels.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // CATALOG_FULL | CATALOG_INCREMENTAL | ORDER_IMPORT | FULFILLMENT_PUSH | INVENTORY_UPDATE
  status: text("status").notNull().default("PENDING"), // PENDING | RUNNING | SUCCESS | PARTIAL | FAILED
  totalItems: integer("totalItems").notNull().default(0),
  successCount: integer("successCount").notNull().default(0),
  failureCount: integer("failureCount").notNull().default(0),
  errors: text("errors"), // JSON array of { productId, error }
  startedAt: timestamp("startedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("ChannelSyncLog_channelId_idx").on(t.channelId),
  index("ChannelSyncLog_type_idx").on(t.type),
  index("ChannelSyncLog_createdAt_idx").on(t.createdAt),
]);

export const channelSyncLogsRelations = relations(channelSyncLogs, ({ one }) => ({
  channel: one(salesChannels, { fields: [channelSyncLogs.channelId], references: [salesChannels.id] }),
}));
