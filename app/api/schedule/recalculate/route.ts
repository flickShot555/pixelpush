import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";
import { prisma } from "@/lib/prisma";
import { computeContributionThresholds, generateSchedule } from "@/lib/schedule";
import type { GraphGrid } from "@/lib/graph-utils";
import { isPro } from "@/lib/check-plan";

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

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const planUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true },
  });

  if (!planUser) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  if (!isPro({ plan: planUser.plan })) {
    return NextResponse.json({ ok: false, error: "Pro plan required" }, { status: 403 });
  }

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Connect GitHub to recalculate your schedule." }, { status: 400 });
  }

  const userId = planUser.id;

  const design = await prisma.design.findFirst({
    where: { userId, status: "active" },
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
  const seed = Date.now() ^ userId.length;
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
