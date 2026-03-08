import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";
import type { GraphGrid } from "@/lib/graph-utils";
import { computeContributionThresholds } from "@/lib/schedule";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcEndOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function startOfUtcWeekSunday(date: Date): Date {
  const d = utcMidnight(date);
  const dow = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - dow);
  return utcMidnight(d);
}

function isGraphGrid(value: unknown): value is GraphGrid {
  if (!Array.isArray(value) || value.length !== 7) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 52 &&
      row.every((cell) => typeof cell === "number" && Number.isFinite(cell) && cell >= 0 && cell <= 4)
  );
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function levelFromCount(count: number, thresholds: [number, number, number, number]) {
  if (count <= 0) return 0;
  if (count <= thresholds[0]) return 1;
  if (count <= thresholds[1]) return 2;
  if (count <= thresholds[2]) return 3;
  return 4;
}

function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatShortDateUtc(dateIso: string) {
  const d = new Date(dateIso);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session || !accessToken) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
    select: { id: true, username: true },
  });

  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const design = await prisma.design.findFirst({
    where: { userId: user.id, status: "active" },
    select: {
      id: true,
      name: true,
      theme: true,
      pixelData: true,
      startedAt: true,
      targetEndAt: true,
    },
  });

  if (!design) {
    return NextResponse.json({
      ok: true,
      design: null,
      targetGrid: null,
      currentGrid: null,
      stats: null,
      upcoming: [],
    });
  }

  if (!isGraphGrid(design.pixelData)) {
    return NextResponse.json({ ok: false, error: "Design pixel data is invalid" }, { status: 500 });
  }

  const startedAt = utcMidnight(new Date(design.startedAt));
  const windowStart = startOfUtcWeekSunday(startedAt);
  const windowEnd = utcEndOfDay(new Date(windowStart.getTime() + (52 * 7 - 1) * 24 * 60 * 60 * 1000));

  const now = new Date();
  const todayStart = utcMidnight(now);
  const todayEnd = utcEndOfDay(now);

  const calendar = await fetchContributionCalendar({
    accessToken,
    from: windowStart.toISOString(),
    to: windowEnd.toISOString(),
  });

  const dayCounts = new Map<string, number>();
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      dayCounts.set(day.date, day.contributionCount);
    }
  }

  const thresholds = computeContributionThresholds(calendar);

  const currentGrid: GraphGrid = Array.from({ length: 7 }, () => Array.from({ length: 52 }, () => 0));
  for (let dayOffset = 0; dayOffset < 52 * 7; dayOffset += 1) {
    const date = new Date(windowStart);
    date.setUTCDate(date.getUTCDate() + dayOffset);

    if (date < startedAt) continue;
    if (date > todayStart) continue;

    const count = dayCounts.get(dateKeyUtc(date)) ?? 0;
    const col = Math.floor(dayOffset / 7);
    const row = dayOffset % 7;
    currentGrid[row][col] = clampInt(levelFromCount(count, thresholds), 0, 4);
  }

  const entries = await prisma.scheduleEntry.findMany({
    where: {
      designId: design.id,
      date: { gte: startedAt },
    },
    orderBy: { date: "asc" },
    select: { id: true, date: true, targetCount: true, actualCount: true, status: true },
  });

  // Live sync: update past/present scheduled days based on GitHub counts.
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const synced = entries.map((e) => {
    const dayStart = utcMidnight(new Date(e.date));
    const key = dateKeyUtc(dayStart);
    const actualCount = dayCounts.get(key) ?? 0;

    let status: "pending" | "completed" | "missed" | "skipped" = e.status;
    if (e.status !== "skipped") {
      if (actualCount >= e.targetCount) status = "completed";
      else if (dayStart < todayStart) status = "missed";
      else status = "pending";
    }

    const changed = (e.actualCount ?? 0) !== actualCount || e.status !== status;
    if (changed && dayStart <= todayEnd) {
      updates.push(
        prisma.scheduleEntry.update({
          where: { id: e.id },
          data: { actualCount, status },
          select: { id: true },
        })
      );
    }

    return {
      ...e,
      date: dayStart,
      actualCount,
      status,
    };
  });

  if (updates.length) {
    await prisma.$transaction(updates);
  }

  const totalDays = synced.filter((e) => e.status !== "skipped").length;
  const completedDays = synced.filter((e) => e.status === "completed").length;
  const daysMissed = synced.filter((e) => e.status === "missed").length;

  const elapsed = synced.filter((e) => e.status !== "skipped" && e.date <= todayStart);
  const daysElapsed = elapsed.length;
  const daysOnSchedule = elapsed.filter((e) => e.status === "completed").length;

  const completionPct = totalDays ? Math.round((completedDays / totalDays) * 100) : 0;

  // Streak: consecutive completed scheduled days, starting from the most recent scheduled day <= today.
  let streakDays = 0;
  for (let i = synced.length - 1; i >= 0; i -= 1) {
    const e = synced[i];
    if (e.status === "skipped") continue;
    if (e.date > todayStart) continue;
    if (e.status === "completed") {
      streakDays += 1;
      continue;
    }
    break;
  }

  const totalCommitsMade = synced.reduce((sum, e) => sum + (e.actualCount ?? 0), 0);
  const targetCommitsRemaining = synced
    .filter((e) => e.status !== "skipped" && e.status !== "completed")
    .reduce((sum, e) => sum + Math.max(0, e.targetCount - (e.actualCount ?? 0)), 0);

  const upcoming = synced
    .filter((e) => e.status !== "skipped" && e.date >= todayStart && e.date <= utcMidnight(new Date(todayStart.getTime() + 6 * 24 * 60 * 60 * 1000)))
    .map((e) => ({
      date: e.date.toISOString(),
      dateLabel: formatShortDateUtc(e.date.toISOString()),
      targetCount: e.targetCount,
      actualCount: e.actualCount ?? 0,
      status: e.status,
    }));

  return NextResponse.json({
    ok: true,
    username: user.username,
    design: {
      id: design.id,
      name: design.name,
      theme: design.theme,
      startedAt: design.startedAt,
      targetEndAt: design.targetEndAt,
    },
    targetGrid: design.pixelData,
    currentGrid,
    stats: {
      completionPct,
      streakDays,
      totalCommitsMade,
      targetCommitsRemaining,
      daysOnSchedule,
      daysElapsed,
      daysMissed,
    },
    upcoming,
  });
}
