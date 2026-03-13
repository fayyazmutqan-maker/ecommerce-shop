CREATE TABLE "ChannelOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"channelId" text NOT NULL,
	"orderId" text,
	"externalOrderId" text NOT NULL,
	"externalCustomerId" text,
	"platform" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"rawPayload" text,
	"lastError" text,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChannelProduct" (
	"id" text PRIMARY KEY NOT NULL,
	"channelId" text NOT NULL,
	"productId" text NOT NULL,
	"externalProductId" text,
	"externalVariantIds" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"lastSyncAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChannelSyncLog" (
	"id" text PRIMARY KEY NOT NULL,
	"channelId" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"totalItems" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"errors" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SalesChannel" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'DISCONNECTED' NOT NULL,
	"credentials" text,
	"externalAccountId" text,
	"externalPageId" text,
	"externalCatalogId" text,
	"pixelId" text,
	"settings" text,
	"lastSyncAt" timestamp,
	"lastSyncStatus" text,
	"lastSyncError" text,
	"syncedProductCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChannelOrder" ADD CONSTRAINT "ChannelOrder_channelId_SalesChannel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."SalesChannel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChannelOrder" ADD CONSTRAINT "ChannelOrder_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChannelProduct" ADD CONSTRAINT "ChannelProduct_channelId_SalesChannel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."SalesChannel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChannelProduct" ADD CONSTRAINT "ChannelProduct_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ChannelSyncLog" ADD CONSTRAINT "ChannelSyncLog_channelId_SalesChannel_id_fk" FOREIGN KEY ("channelId") REFERENCES "public"."SalesChannel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ChannelOrder_channelId_externalOrderId_key" ON "ChannelOrder" USING btree ("channelId","externalOrderId");--> statement-breakpoint
CREATE INDEX "ChannelOrder_channelId_idx" ON "ChannelOrder" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "ChannelOrder_orderId_idx" ON "ChannelOrder" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "ChannelOrder_status_idx" ON "ChannelOrder" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ChannelProduct_channelId_productId_key" ON "ChannelProduct" USING btree ("channelId","productId");--> statement-breakpoint
CREATE INDEX "ChannelProduct_channelId_idx" ON "ChannelProduct" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "ChannelProduct_productId_idx" ON "ChannelProduct" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "ChannelProduct_status_idx" ON "ChannelProduct" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ChannelSyncLog_channelId_idx" ON "ChannelSyncLog" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "ChannelSyncLog_type_idx" ON "ChannelSyncLog" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ChannelSyncLog_createdAt_idx" ON "ChannelSyncLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "SalesChannel_platform_idx" ON "SalesChannel" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "SalesChannel_status_idx" ON "SalesChannel" USING btree ("status");--> statement-breakpoint
ALTER TABLE "StoreSettings" DROP COLUMN "tapPublicKey";--> statement-breakpoint
ALTER TABLE "StoreSettings" DROP COLUMN "tapSecretKey";