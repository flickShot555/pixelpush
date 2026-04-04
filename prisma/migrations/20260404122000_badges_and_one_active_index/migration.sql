-- Reconcile drift for dev/shadow databases:
-- - Ensure Badge table exists (some DBs may have been created via db push / manual SQL)
-- - Ensure the "one active design per user" partial unique index exists

-- Badge table
CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pixelData" JSONB NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Badge_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Badge_designId_key" ON "Badge"("designId");
CREATE INDEX IF NOT EXISTS "Badge_userId_idx" ON "Badge"("userId");
CREATE INDEX IF NOT EXISTS "Badge_earnedAt_idx" ON "Badge"("earnedAt");

-- One active design per user
CREATE UNIQUE INDEX IF NOT EXISTS "Design_one_active_per_user"
ON "Design" ("userId")
WHERE ("status" = 'active'::"DesignStatus");
