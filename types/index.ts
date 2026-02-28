// Shared type definitions for the ecommerce app

export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "REFUNDED"
  | "FAILED";

export type FulfillmentStatus =
  | "UNFULFILLED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED";

export type OrderSource = "ONLINE" | "POS" | "MANUAL";

export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export type TemplateSectionType =
  | "HERO"
  | "FEATURED_PRODUCTS"
  | "CATEGORIES"
  | "BANNER"
  | "NEWSLETTER"
  | "TESTIMONIALS"
  | "CUSTOM";

export interface CartItemData {
  id: string;
  productId?: string;
  variantId?: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variantName?: string;
  maxQuantity?: number;
}

export interface StoreConfig {
  storeName: string;
  storeDescription?: string;
  storeLogo?: string;
  currency: string;
  currencySymbol: string;
}

export interface NavItem {
  title: string;
  href: string;
  children?: NavItem[];
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  productsChange: number;
}

export interface ChartData {
  name: string;
  value: number;
}
