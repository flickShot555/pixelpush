import { spawnSync } from "node:child_process";

function run(command, args) {
  const res = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

const vercelEnv = (process.env.VERCEL_ENV ?? "").toLowerCase();

// Important safety behavior:
// - Only run migrations on PRODUCTION deployments.
// - Preview deployments should not mutate your main database.
if (vercelEnv === "production") {
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(`[vercel-build] Skipping prisma migrate deploy (VERCEL_ENV=${vercelEnv || "unset"})`);
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
