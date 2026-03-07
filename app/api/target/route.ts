import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { genTarget } from "@/lib/graph-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  // Target designs will ultimately be generated/stored per-user.
  // For now we generate a default target on the server so pages can treat it as app-generated.
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const githubId = (session.user as unknown as { githubId?: string })?.githubId;
  if (!githubId) {
    return Response.json({ error: "Missing githubId in session" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { githubId } });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const defaultGrid = genTarget();
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const targetDesign = await prisma.targetDesign.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, grid: defaultGrid, startDate },
    select: { name: true, grid: true, startDate: true },
  });

  return Response.json({ target: targetDesign });
}
