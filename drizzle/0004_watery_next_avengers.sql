ALTER TABLE "StoreSettings" ADD COLUMN "zatcaEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "vatNumber" text;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "commercialRegNo" text;