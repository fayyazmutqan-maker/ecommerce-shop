CREATE TABLE "NewsletterCampaign" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"previewText" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"sentAt" timestamp,
	"sentBy" text,
	"recipientCount" integer DEFAULT 0 NOT NULL,
	"successCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
