ALTER TABLE "Order" ADD COLUMN "zatcaStatus" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "zatcaReportedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "zatcaInvoiceHash" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "zatcaRequestId" text;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaEnvironment" text DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaCsid" text;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaSecret" text;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaPcsid" text;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaPcsidSecret" text;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaInvoiceCounter" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "StoreSettings" ADD COLUMN "zatcaPreviousHash" text DEFAULT 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==' NOT NULL;