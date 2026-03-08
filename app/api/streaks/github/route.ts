import { NextResponse } from "next/server";

import { fetchContributionCalendar } from "@/lib/github";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function computeCommitStreakDays(calendar: { weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }> }): number {
  const counts = new Map<string, number>();
  for (const w of calendar.weeks) {
    for (const day of w.contributionDays) {
      counts.set(day.date, day.contributionCount);
    }
  }

  const today = toUtcDay(new Date());
  const d = new Date(today);

  let streak = 0;
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    const c = counts.get(key) ?? 0;
    if (c <= 0) break;
    streak += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return streak;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = (url.searchParams.get("username") ?? "").trim();
  if (!username) return badRequest("Missing username");

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, accessToken: true },
  });

  if (!user) {
    return NextResponse.json({ ok: true, connected: false, streakDays: null });
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      provider: "github",
      access_token: { not: null },
    },
    select: { access_token: true },
  });

  const accessToken = account?.access_token ?? user.accessToken ?? null;

  if (!accessToken) {
    return NextResponse.json({ ok: true, connected: false, streakDays: null });
  }

  try {
    const calendar = await fetchContributionCalendar({ accessToken });
    const streakDays = computeCommitStreakDays(calendar);
    return NextResponse.json({ ok: true, connected: true, streakDays });
  } catch {
    return NextResponse.json({ ok: true, connected: false, streakDays: null });
  }
}
