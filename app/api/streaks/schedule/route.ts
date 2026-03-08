import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = (url.searchParams.get("username") ?? "").trim();
  if (!username) return badRequest("Missing username");

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ ok: true, streakDays: 0 });
  }

  const activeDesign = await prisma.design.findFirst({
    where: { userId: user.id, status: "active" },
    select: { id: true },
  });

  if (!activeDesign) {
    return NextResponse.json({ ok: true, streakDays: 0 });
  }

  const today = toUtcDay(new Date());

  const entries = await prisma.scheduleEntry.findMany({
    where: { designId: activeDesign.id, date: { lte: today } },
    select: { date: true, status: true },
  });

  const byDay = new Map<string, (typeof entries)[number]["status"]>();
  for (const e of entries) {
    byDay.set(e.date.toISOString().slice(0, 10), e.status);
  }

  let streakDays = 0;
  const d = new Date(today);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    const status = byDay.get(key);
    if (status !== "completed") break;
    streakDays += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return NextResponse.json({ ok: true, streakDays });
}
