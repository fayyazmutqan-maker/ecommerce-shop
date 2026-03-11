CREATE TABLE "ContentTranslation" (
	"id" text PRIMARY KEY NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"locale" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentTranslation_entity_locale_field_idx" ON "ContentTranslation" USING btree ("entityType","entityId","locale","field");--> statement-breakpoint
CREATE INDEX "ContentTranslation_entityType_entityId_idx" ON "ContentTranslation" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "ContentTranslation_locale_idx" ON "ContentTranslation" USING btree ("locale");