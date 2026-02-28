CREATE TABLE "ActivityLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"userName" text,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text,
	"details" text,
	"ipAddress" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BlogPost" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text,
	"excerpt" text,
	"featuredImage" text,
	"authorId" text,
	"tags" text,
	"isPublished" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp,
	"seoTitle" text,
	"seoDescription" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "BlogPost_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "CouponUsage" (
	"id" text PRIMARY KEY NOT NULL,
	"couponId" text NOT NULL,
	"userId" text NOT NULL,
	"orderId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GiftCardTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"giftCardId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"orderId" text,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GiftCard" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"initialBalance" numeric(12, 2) NOT NULL,
	"currentBalance" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"recipientEmail" text,
	"recipientName" text,
	"senderName" text,
	"message" text,
	"orderId" text,
	"customerId" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"expiresAt" timestamp,
	"lastUsedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "GiftCard_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "InventoryAdjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"variantId" text,
	"previousQuantity" integer NOT NULL,
	"newQuantity" integer NOT NULL,
	"adjustmentQuantity" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"userId" text,
	"userName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"entityType" text,
	"entityId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SmartCollection" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"rules" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"seoTitle" text,
	"seoDescription" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SmartCollection_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "StoreCreditTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"orderId" text,
	"processedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_Product_id_fk";
--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "giftCardCode" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "giftCardAmount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "storeCreditAmount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "averageRating" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "reviewCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "taxExempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "acceptsMarketing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "totalSpent" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "orderCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "storeCreditBalance" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_User_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_Coupon_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_GiftCard_id_fk" FOREIGN KEY ("giftCardId") REFERENCES "public"."GiftCard"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StoreCreditTransaction" ADD CONSTRAINT "StoreCreditTransaction_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ActivityLog_entityType_idx" ON "ActivityLog" USING btree ("entityType");--> statement-breakpoint
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "BlogPost_isPublished_idx" ON "BlogPost" USING btree ("isPublished");--> statement-breakpoint
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage" USING btree ("couponId");--> statement-breakpoint
CREATE INDEX "CouponUsage_userId_idx" ON "CouponUsage" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "CouponUsage_couponId_orderId_key" ON "CouponUsage" USING btree ("couponId","orderId");--> statement-breakpoint
CREATE INDEX "GiftCard_code_idx" ON "GiftCard" USING btree ("code");--> statement-breakpoint
CREATE INDEX "GiftCard_customerId_idx" ON "GiftCard" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "InventoryAdjustment_productId_idx" ON "InventoryAdjustment" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "InventoryAdjustment_createdAt_idx" ON "InventoryAdjustment" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Notification_userId_idx" ON "Notification" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Notification_isRead_idx" ON "Notification" USING btree ("isRead");--> statement-breakpoint
CREATE INDEX "Notification_createdAt_idx" ON "Notification" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "StoreCreditTransaction_userId_idx" ON "StoreCreditTransaction" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_ProductVariant_id_fk" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_Category_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderAddress" ADD CONSTRAINT "OrderAddress_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_ProductVariant_id_fk" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Category_parentId_idx" ON "Category" USING btree ("parentId");--> statement-breakpoint
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "Order_paymentStatus_idx" ON "Order" USING btree ("paymentStatus");--> statement-breakpoint
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order" USING btree ("fulfillmentStatus");--> statement-breakpoint
CREATE INDEX "Order_email_idx" ON "Order" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "Review_isApproved_idx" ON "Review" USING btree ("isApproved");