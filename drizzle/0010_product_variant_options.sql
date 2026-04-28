ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "variantOptions" jsonb NOT NULL DEFAULT '[]'::jsonb;
