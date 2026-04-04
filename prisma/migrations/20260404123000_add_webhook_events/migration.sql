-- Add WebhookEvent table for Paddle webhook idempotency

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
