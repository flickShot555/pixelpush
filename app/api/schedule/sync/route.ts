import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcEndOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function toYyyyMmDdUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
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
    select: { id: true },
  });

  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const dateInput = (body as { date?: unknown } | null)?.date;
  if (typeof dateInput !== "string" || !dateInput.trim()) {
    return NextResponse.json({ ok: false, error: "Missing date" }, { status: 400 });
  }

  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid date" }, { status: 400 });
  }

  const dayStart = utcMidnight(parsed);
  const dayEnd = utcEndOfDay(parsed);
  const dayKey = toYyyyMmDdUtc(dayStart);

  const design = await prisma.design.findFirst({
    where: { userId: user.id, status: "active" },
    select: { id: true },
  });

  if (!design) {
    return NextResponse.json({ ok: false, error: "No active design" }, { status: 404 });
  }

  const entry = await prisma.scheduleEntry.findFirst({
    where: { designId: design.id, date: dayStart },
    select: { id: true, date: true, targetCount: true, actualCount: true, status: true },
  });

  if (!entry) {
    return NextResponse.json({ ok: false, error: "Schedule entry not found" }, { status: 404 });
  }

  const calendar = await fetchContributionCalendar({
    accessToken,
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  });

  let actualCount = 0;
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      if (day.date === dayKey) {
        actualCount = day.contributionCount;
        break;
      }
    }
  }

  const todayStart = utcMidnight(new Date());

  let status: "pending" | "completed" | "missed" | "skipped" = entry.status;
  if (entry.status !== "skipped") {
    if (actualCount >= entry.targetCount) status = "completed";
    else if (dayStart < todayStart) status = "missed";
    else status = "pending";
  }

  const updated = await prisma.scheduleEntry.update({
    where: { id: entry.id },
    data: {
      actualCount,
      status,
    },
    select: { date: true, targetCount: true, actualCount: true, status: true },
  });

  return NextResponse.json({ ok: true, entry: updated });
}
