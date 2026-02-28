CREATE TABLE "AbandonedCart" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"email" text,
	"phone" text,
	"items" text NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"recoveryToken" text NOT NULL,
	"status" text DEFAULT 'ABANDONED' NOT NULL,
	"emailSentAt" timestamp,
	"recoveredAt" timestamp,
	"orderId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AbandonedCart_recoveryToken_unique" UNIQUE("recoveryToken")
);
--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "Address" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"label" text,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"company" text,
	"address1" text NOT NULL,
	"address2" text,
	"city" text NOT NULL,
	"state" text,
	"postalCode" text NOT NULL,
	"country" text NOT NULL,
	"phone" text,
	"isDefault" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AutoDiscount" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"combinesWith" boolean DEFAULT false NOT NULL,
	"minQuantity" integer,
	"minOrderAmount" numeric(12, 2),
	"buyProductIds" text,
	"buyCategoryIds" text,
	"customerIds" text,
	"discountType" text DEFAULT 'PERCENTAGE' NOT NULL,
	"discountValue" real DEFAULT 0 NOT NULL,
	"getQuantity" integer,
	"getProductIds" text,
	"getCategoryIds" text,
	"maxUsesTotal" integer,
	"maxUsesPerCustomer" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"startsAt" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CartItem" (
	"id" text PRIMARY KEY NOT NULL,
	"cartId" text NOT NULL,
	"productId" text NOT NULL,
	"variantId" text,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Cart" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Cart_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "Category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"parentId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "Coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"minOrderAmount" numeric(12, 2),
	"maxDiscountAmount" numeric(12, 2),
	"usageLimit" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"startsAt" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "DraftOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"draftNumber" text NOT NULL,
	"customerId" text,
	"customerEmail" text,
	"customerPhone" text,
	"customerName" text,
	"items" text NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shippingAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"shippingAddress" text,
	"billingAddress" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"orderId" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DraftOrder_draftNumber_unique" UNIQUE("draftNumber")
);
--> statement-breakpoint
CREATE TABLE "FulfillmentItem" (
	"id" text PRIMARY KEY NOT NULL,
	"fulfillmentId" text NOT NULL,
	"orderItemId" text NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Fulfillment" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"trackingNumber" text,
	"trackingUrl" text,
	"carrier" text,
	"notes" text,
	"shippedAt" timestamp,
	"deliveredAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Navigation" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"items" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Navigation_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "OrderAddress" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"type" text NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"company" text,
	"address1" text NOT NULL,
	"address2" text,
	"city" text NOT NULL,
	"state" text,
	"postalCode" text NOT NULL,
	"country" text NOT NULL,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "OrderItem" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"productId" text NOT NULL,
	"variantId" text,
	"name" text NOT NULL,
	"sku" text,
	"price" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"totalPrice" numeric(12, 2) NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"variantName" text
);
--> statement-breakpoint
CREATE TABLE "OrderTimeline" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"type" text DEFAULT 'INFO' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Order" (
	"id" text PRIMARY KEY NOT NULL,
	"orderNumber" text NOT NULL,
	"userId" text,
	"email" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"paymentStatus" text DEFAULT 'PENDING' NOT NULL,
	"fulfillmentStatus" text DEFAULT 'UNFULFILLED' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shippingAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalAmount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"notes" text,
	"source" text DEFAULT 'ONLINE' NOT NULL,
	"paymentMethod" text,
	"shippingMethod" text,
	"trackingNumber" text,
	"cancelReason" text,
	"refundReason" text,
	"couponCode" text,
	"autoDiscountIds" text,
	"isDraft" boolean DEFAULT false NOT NULL,
	"idempotencyKey" text,
	"shippingAddressId" text,
	"billingAddressId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Order_orderNumber_unique" UNIQUE("orderNumber"),
	CONSTRAINT "Order_idempotencyKey_unique" UNIQUE("idempotencyKey"),
	CONSTRAINT "Order_shippingAddressId_unique" UNIQUE("shippingAddressId"),
	CONSTRAINT "Order_billingAddressId_unique" UNIQUE("billingAddressId")
);
--> statement-breakpoint
CREATE TABLE "Page" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text,
	"isPublished" boolean DEFAULT false NOT NULL,
	"seoTitle" text,
	"seoDescription" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Page_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "PosSession" (
	"id" text PRIMARY KEY NOT NULL,
	"staffId" text NOT NULL,
	"staffName" text NOT NULL,
	"openedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp,
	"openingBalance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"closingBalance" numeric(12, 2),
	"totalSales" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalOrders" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"status" text DEFAULT 'OPEN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProductAttributeValue" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"attributeId" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProductAttribute" (
	"id" text PRIMARY KEY NOT NULL,
	"groupId" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'select' NOT NULL,
	"isFilterable" boolean DEFAULT true NOT NULL,
	"isRequired" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"options" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ProductAttribute_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ProductBundle" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"childId" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"discount" real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProductCategory" (
	"productId" text NOT NULL,
	"categoryId" text NOT NULL,
	CONSTRAINT "ProductCategory_productId_categoryId_pk" PRIMARY KEY("productId","categoryId")
);
--> statement-breakpoint
CREATE TABLE "ProductGroup" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ProductGroup_name_unique" UNIQUE("name"),
	CONSTRAINT "ProductGroup_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ProductImage" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"url" text NOT NULL,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProductVariant" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"barcode" text,
	"price" numeric(12, 2) NOT NULL,
	"compareAtPrice" numeric(12, 2),
	"costPrice" numeric(12, 2),
	"quantity" integer DEFAULT 0 NOT NULL,
	"weight" real,
	"option1" text,
	"option2" text,
	"option3" text,
	"image" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ProductVariant_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "Product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"shortDescription" text,
	"sku" text,
	"barcode" text,
	"price" numeric(12, 2) NOT NULL,
	"compareAtPrice" numeric(12, 2),
	"costPrice" numeric(12, 2),
	"taxable" boolean DEFAULT true NOT NULL,
	"taxRate" real DEFAULT 0 NOT NULL,
	"trackInventory" boolean DEFAULT true NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"lowStockThreshold" integer DEFAULT 5 NOT NULL,
	"continueSellingWhenOOS" boolean DEFAULT false NOT NULL,
	"weight" real,
	"weightUnit" text DEFAULT 'kg' NOT NULL,
	"length" real,
	"width" real,
	"height" real,
	"dimensionUnit" text DEFAULT 'cm' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"productType" text,
	"vendor" text,
	"tags" text,
	"isFeatured" boolean DEFAULT false NOT NULL,
	"isDigital" boolean DEFAULT false NOT NULL,
	"isGiftCard" boolean DEFAULT false NOT NULL,
	"requiresShipping" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"seoTitle" text,
	"seoDescription" text,
	"publishedAt" timestamp,
	"scheduledAt" timestamp,
	"customBadge" text,
	"warrantyInfo" text,
	"estimatedDelivery" text,
	"hsCode" text,
	"countryOfOrigin" text,
	"minOrderQty" integer DEFAULT 1 NOT NULL,
	"maxOrderQty" integer,
	"salePriceFrom" timestamp,
	"salePriceTo" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "Product_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "RefundItem" (
	"id" text PRIMARY KEY NOT NULL,
	"refundId" text NOT NULL,
	"orderItemId" text NOT NULL,
	"quantity" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Refund" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text,
	"notes" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"type" text DEFAULT 'PARTIAL' NOT NULL,
	"restockItems" boolean DEFAULT false NOT NULL,
	"processedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ReturnItem" (
	"id" text PRIMARY KEY NOT NULL,
	"returnId" text NOT NULL,
	"orderItemId" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"condition" text
);
--> statement-breakpoint
CREATE TABLE "Return" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"returnNumber" text NOT NULL,
	"status" text DEFAULT 'REQUESTED' NOT NULL,
	"reason" text NOT NULL,
	"customerNotes" text,
	"adminNotes" text,
	"action" text DEFAULT 'REFUND' NOT NULL,
	"trackingNumber" text,
	"processedBy" text,
	"refundId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Return_returnNumber_unique" UNIQUE("returnNumber")
);
--> statement-breakpoint
CREATE TABLE "Review" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"userId" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"isApproved" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "Session_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "ShippingRate" (
	"id" text PRIMARY KEY NOT NULL,
	"zoneId" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'FLAT' NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"minWeight" real,
	"maxWeight" real,
	"minOrderAmount" numeric(12, 2),
	"maxOrderAmount" numeric(12, 2),
	"estimatedDays" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ShippingZone" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"countries" text NOT NULL,
	"regions" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "StaffPermission" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"permission" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "StoreSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"storeName" text DEFAULT 'My Store' NOT NULL,
	"storeDescription" text,
	"storeLogo" text,
	"storeFavicon" text,
	"storeEmail" text,
	"storePhone" text,
	"storeAddress" text,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"currencySymbol" text DEFAULT 'SAR' NOT NULL,
	"taxRate" real DEFAULT 0 NOT NULL,
	"taxIncluded" boolean DEFAULT false NOT NULL,
	"shippingEnabled" boolean DEFAULT true NOT NULL,
	"freeShippingMin" numeric(12, 2),
	"flatShippingRate" numeric(12, 2),
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"weightUnit" text DEFAULT 'kg' NOT NULL,
	"socialFacebook" text,
	"socialInstagram" text,
	"socialTwitter" text,
	"socialYoutube" text,
	"metaTitle" text,
	"metaDescription" text,
	"googleAnalyticsId" text,
	"customCss" text,
	"customJs" text,
	"maintenanceMode" boolean DEFAULT false NOT NULL,
	"posEnabled" boolean DEFAULT true NOT NULL,
	"tapEnabled" boolean DEFAULT false NOT NULL,
	"tapTestMode" boolean DEFAULT true NOT NULL,
	"tapPublicKey" text,
	"tapSecretKey" text,
	"codEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"subscribedAt" timestamp DEFAULT now() NOT NULL,
	"unsubscribedAt" timestamp,
	CONSTRAINT "Subscriber_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "TemplateSection" (
	"id" text PRIMARY KEY NOT NULL,
	"templateId" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" text,
	"content" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isVisible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"thumbnail" text,
	"isActive" boolean DEFAULT false NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"config" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Template_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "Transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"orderId" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"paymentMethod" text NOT NULL,
	"reference" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"role" text DEFAULT 'CUSTOMER' NOT NULL,
	"phone" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "VerificationToken_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "WishlistItem" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"productId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_Cart_id_fk" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_fulfillmentId_Fulfillment_id_fk" FOREIGN KEY ("fulfillmentId") REFERENCES "public"."Fulfillment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_orderItemId_OrderItem_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderTimeline" ADD CONSTRAINT "OrderTimeline_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_ProductAttribute_id_fk" FOREIGN KEY ("attributeId") REFERENCES "public"."ProductAttribute"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_groupId_ProductGroup_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."ProductGroup"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductBundle" ADD CONSTRAINT "ProductBundle_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductBundle" ADD CONSTRAINT "ProductBundle_childId_Product_id_fk" FOREIGN KEY ("childId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_Category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_Refund_id_fk" FOREIGN KEY ("refundId") REFERENCES "public"."Refund"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_orderItemId_OrderItem_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_Return_id_fk" FOREIGN KEY ("returnId") REFERENCES "public"."Return"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_OrderItem_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Return" ADD CONSTRAINT "Return_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_zoneId_ShippingZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."ShippingZone"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StaffPermission" ADD CONSTRAINT "StaffPermission_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TemplateSection" ADD CONSTRAINT "TemplateSection_templateId_Template_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."Template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX "CartItem_cartId_productId_variantId_key" ON "CartItem" USING btree ("cartId","productId","variantId");--> statement-breakpoint
CREATE INDEX "Category_isActive_idx" ON "Category" USING btree ("isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "OrderAddress_orderId_type_key" ON "OrderAddress" USING btree ("orderId","type");--> statement-breakpoint
CREATE INDEX "Order_userId_idx" ON "Order" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Order_status_idx" ON "Order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Order_createdAt_idx" ON "Order" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_value_key" ON "ProductAttributeValue" USING btree ("productId","attributeId","value");--> statement-breakpoint
CREATE UNIQUE INDEX "ProductBundle_productId_childId_key" ON "ProductBundle" USING btree ("productId","childId");--> statement-breakpoint
CREATE INDEX "Product_status_idx" ON "Product" USING btree ("status");--> statement-breakpoint
CREATE INDEX "Product_createdAt_idx" ON "Product" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Product_isFeatured_idx" ON "Product" USING btree ("isFeatured");--> statement-breakpoint
CREATE INDEX "Review_productId_idx" ON "Review" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "Review_userId_idx" ON "Review" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "StaffPermission_userId_permission_key" ON "StaffPermission" USING btree ("userId","permission");--> statement-breakpoint
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken" USING btree ("identifier","token");--> statement-breakpoint
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem" USING btree ("userId","productId");