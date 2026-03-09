import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchContributionCalendar } from "@/lib/github";
import { computeContributionThresholds, generateSchedule } from "@/lib/schedule";
import type { GraphGrid } from "@/lib/graph-utils";

export const runtime = "nodejs";

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

type ActivateBody = {
  name?: string;
  theme?: string;
  grid?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function isGraphGrid(value: unknown): value is GraphGrid {
  if (!Array.isArray(value) || value.length !== 7) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 52) return false;
    for (const cell of row) {
      if (typeof cell !== "number") return false;
      if (!Number.isFinite(cell)) return false;
      if (cell < 0 || cell > 4) return false;
    }
  }
  return true;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!accessToken) {
    return badRequest("Connect GitHub to generate a schedule.");
  }

  let body: ActivateBody;
  try {
    body = (await req.json()) as ActivateBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const name = (body.name ?? "").trim();
  const theme = (body.theme ?? "").trim();
  const grid = body.grid;

  if (!name) return badRequest("Design name is required");
  if (!theme) return badRequest("Theme is required");
  if (!isGraphGrid(grid)) return badRequest("Invalid design grid");

  // Find the current PixelPush user record.
  const email = session.user?.email ?? undefined;
  const username = (session.user as unknown as { username?: string })?.username;
  const githubId = (session.user as unknown as { githubId?: string })?.githubId;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email: email.toLowerCase() } : undefined,
        username ? { username } : undefined,
        githubId ? { githubId } : undefined,
      ].filter(Boolean) as Array<{ email?: string; username?: string; githubId?: string }>,
    },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  // Compute per-user thresholds from historical GitHub data (documentation requirement).
  const calendar = await fetchContributionCalendar({ accessToken });
  const thresholds = computeContributionThresholds(calendar);

  const startDate = utcMidnight(new Date());
  const seed = Date.now() ^ user.id.length;
  const generated = generateSchedule({ grid, startDate, thresholds, seed });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.design.findFirst({
      where: { userId: user.id, status: "active" },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    });

    if (existing) {
      return {
        ok: false as const,
        status: 409 as const,
        error: `You already have an active design (${existing.name}). Complete it or discard it before starting a new one.`,
      };
    }

    const design = await tx.design.create({
      data: {
        userId: user.id,
        theme,
        name,
        pixelData: grid,
        status: "active",
        startedAt: startDate,
        targetEndAt: generated.targetEndAt ?? undefined,
      },
      select: { id: true },
    });

    if (generated.entries.length) {
      await tx.scheduleEntry.createMany({
        data: generated.entries.map((e) => ({
          designId: design.id,
          date: e.date,
          targetCount: e.targetCount,
          actualCount: 0,
          status: "pending",
        })),
      });
    }

    return { designId: design.id, scheduledDays: generated.entries.length };
  });

  if ((result as { ok?: boolean }).ok === false) {
    const r = result as { ok: false; status: number; error: string };
    return NextResponse.json({ ok: false, error: r.error }, { status: r.status });
  }

  return NextResponse.json({ ok: true, ...(result as { designId: string; scheduledDays: number }) });
}
