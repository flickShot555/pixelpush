const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");

require("dotenv").config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set in .env");

  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename::text AS tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const hasBadge = Array.isArray(tables) && tables.some((t) => t.tablename === "Badge");
    console.log({ hasBadge });

    if (hasBadge) {
      const badgeCols = await prisma.$queryRawUnsafe(`
        SELECT column_name::text AS column_name, data_type::text AS data_type, is_nullable::text AS is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Badge'
        ORDER BY ordinal_position;
      `);
      console.log({ badgeCols });

      const badgeIdx = await prisma.$queryRawUnsafe(`
        SELECT indexname::text AS indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'Badge'
        ORDER BY indexname;
      `);
      console.log({ badgeIdx });

      const badgeFks = await prisma.$queryRawUnsafe(`
        SELECT conname::text AS conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = '"Badge"'::regclass AND contype = 'f'
        ORDER BY conname;
      `);
      console.log({ badgeFks });
    }

    const designIdx = await prisma.$queryRawUnsafe(`
      SELECT indexname::text AS indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Design'
      ORDER BY indexname;
    `);
    console.log({ designIdx });

    const designUnique = await prisma.$queryRawUnsafe(`
      SELECT indexname::text AS indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Design' AND indexdef ILIKE '%UNIQUE%'
      ORDER BY indexname;
    `);
    console.log({ designUnique });

    const hasOneActiveIdx =
      Array.isArray(designIdx) && designIdx.some((i) => i.indexname === "Design_one_active_per_user");
    console.log({ hasDesignOneActivePerUserIndex: hasOneActiveIdx });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
