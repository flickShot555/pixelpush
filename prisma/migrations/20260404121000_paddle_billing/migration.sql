-- Add LIFETIME to plan enum
ALTER TYPE "UserPlan" ADD VALUE IF NOT EXISTS 'LIFETIME';

-- Add Paddle billing fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paddleCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paddleSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paddleSubscriptionStatus" TEXT;

-- Uniqueness constraints (implemented as unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS "User_paddleCustomerId_key" ON "User"("paddleCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_paddleSubscriptionId_key" ON "User"("paddleSubscriptionId");
