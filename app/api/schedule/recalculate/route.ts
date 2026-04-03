import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { computeContributionThresholds, generateSchedule } from "@/lib/schedule";
import type { GraphGrid } from "@/lib/graph-utils";

export const runtime = "nodejs";

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeekSunday(date: Date): Date {
  const d = utcMidnight(date);
  const dow = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - dow);
  return utcMidnight(d);
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

export async function POST() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Connect GitHub to recalculate your schedule." }, { status: 400 });
  }

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

  const design = await prisma.design.findFirst({
    where: { userId: user.id, status: "active" },
    select: { id: true, pixelData: true },
  });

  if (!design) {
    return NextResponse.json({ ok: false, error: "No active design" }, { status: 404 });
  }

  if (!isGraphGrid(design.pixelData)) {
    return NextResponse.json({ ok: false, error: "Design pixel data is invalid" }, { status: 500 });
  }

  const calendar = await fetchContributionCalendar({ accessToken });
  const thresholds = computeContributionThresholds(calendar);

  const today = utcMidnight(new Date());
  const designStartedAt = startOfUtcWeekSunday(today);
  const seed = Date.now() ^ user.id.length;
  const generated = generateSchedule({ grid: design.pixelData, startDate: today, thresholds, seed });

  const result = await prisma.$transaction(async (tx) => {
    await tx.design.update({
      where: { id: design.id },
      data: {
        startedAt: designStartedAt,
        targetEndAt: generated.targetEndAt ?? undefined,
        completedAt: null,
      },
      select: { id: true },
    });

    await tx.scheduleEntry.deleteMany({
      where: {
        designId: design.id,
        date: { gte: today },
      },
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

  return NextResponse.json({ ok: true, ...result });
}
