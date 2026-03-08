import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseMonth(month: string | null): { year: number; monthIndex: number } | null {
  if (!month) return null;
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
  return { year, monthIndex: mm - 1 };
}

function monthRangeUtc(year: number, monthIndex: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, monthIndex, 1));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { from, to };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

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

  const url = new URL(req.url);
  const parsed = parseMonth(url.searchParams.get("month"));
  const now = new Date();
  const year = parsed?.year ?? now.getUTCFullYear();
  const monthIndex = parsed?.monthIndex ?? now.getUTCMonth();
  const range = monthRangeUtc(year, monthIndex);

  const design = await prisma.design.findFirst({
    where: { userId: user.id, status: "active" },
    select: { id: true, name: true, theme: true, startedAt: true, targetEndAt: true },
  });

  if (!design) {
    return NextResponse.json({ ok: true, design: null, entries: [], range: { year, month: monthIndex + 1 } });
  }

  const entries = await prisma.scheduleEntry.findMany({
    where: {
      designId: design.id,
      date: {
        gte: range.from > design.startedAt ? range.from : design.startedAt,
        lte: range.to,
      },
    },
    orderBy: { date: "asc" },
    select: { date: true, targetCount: true, actualCount: true, status: true },
  });

  return NextResponse.json({
    ok: true,
    design,
    entries,
    range: { year, month: monthIndex + 1 },
  });
}
