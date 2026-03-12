ALTER TABLE "Refund" ADD COLUMN "zatcaStatus" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "Refund" ADD COLUMN "zatcaReportedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Refund" ADD COLUMN "zatcaInvoiceHash" text;--> statement-breakpoint
ALTER TABLE "Refund" ADD COLUMN "zatcaCreditNoteNumber" text;