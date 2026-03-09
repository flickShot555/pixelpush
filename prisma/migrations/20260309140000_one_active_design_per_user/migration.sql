-- Ensure a user can only have one active design at a time.
-- Keep the most recent active design and abandon older ones.

WITH ranked AS (
  SELECT
    id,
    "userId",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "startedAt" DESC, "createdAt" DESC
    ) AS rn
  FROM "Design"
  WHERE "status" = 'active'::"DesignStatus"
)
UPDATE "Design" d
SET "status" = 'abandoned'::"DesignStatus"
FROM ranked r
WHERE d.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Design_one_active_per_user"
ON "Design" ("userId")
WHERE ("status" = 'active'::"DesignStatus");
