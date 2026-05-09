ALTER TABLE "Refund"
ADD COLUMN IF NOT EXISTS "idempotencyKey" text;

CREATE UNIQUE INDEX IF NOT EXISTS "Refund_idempotencyKey_key"
ON "Refund" ("idempotencyKey");
