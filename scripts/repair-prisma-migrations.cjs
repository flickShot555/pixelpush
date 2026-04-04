const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");

require("dotenv").config();

const MIGRATION_NAME = "20260307105708_first";
const MIGRATION_FILE = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  MIGRATION_NAME,
  "migration.sql"
);

function sha256FileHex(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in the environment (.env)");
  }

  if (!fs.existsSync(MIGRATION_FILE)) {
    throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
  }

  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });
  try {
    const expectedChecksum = sha256FileHex(MIGRATION_FILE);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT migration_name, checksum FROM "_prisma_migrations" WHERE migration_name = '${MIGRATION_NAME}' LIMIT 1;`
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        `No row found in _prisma_migrations for migration_name='${MIGRATION_NAME}'. ` +
          `Is this DB initialized via Prisma migrations?`
      );
    }

    const currentChecksum = rows[0].checksum;
    console.log({ migration: MIGRATION_NAME, currentChecksum, expectedChecksum });

    if (currentChecksum === expectedChecksum) {
      console.log("Checksum already matches; no update needed.");
      return;
    }

    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" SET checksum = '${expectedChecksum}' WHERE migration_name = '${MIGRATION_NAME}';`
    );

    console.log(`Updated checksum rows: ${updated}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
