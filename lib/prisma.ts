import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Important: don't throw at import time. Some build environments (e.g. Vercel previews)
    // may not provide DATABASE_URL during bundling/prerender, even though runtime will.
    // We instead throw only if code actually tries to use Prisma.
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("DATABASE_URL is not set");
      },
    });
  }

  neonConfig.webSocketConstructor = ws;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
