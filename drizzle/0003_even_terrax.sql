CREATE TABLE "BlogCategory" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "BlogCategory_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "BlogPostCategory" (
	"postId" text NOT NULL,
	"categoryId" text NOT NULL,
	CONSTRAINT "BlogPostCategory_postId_categoryId_pk" PRIMARY KEY("postId","categoryId")
);
--> statement-breakpoint
ALTER TABLE "CouponUsage" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "CouponUsage" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "BlogPostCategory" ADD CONSTRAINT "BlogPostCategory_postId_BlogPost_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."BlogPost"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BlogPostCategory" ADD CONSTRAINT "BlogPostCategory_categoryId_BlogCategory_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."BlogCategory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "CouponUsage_email_idx" ON "CouponUsage" USING btree ("email");