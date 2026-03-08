import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { calendarToFixedWindowGrid, emptyGrid, type GraphGrid } from "@/lib/graph-utils";
import { fetchContributionCalendar } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Stage = "started" | "progress" | "completed";

function isStage(value: string | null): value is Stage {
  return value === "started" || value === "progress" || value === "completed";
}

function parsePercent(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 0 || i > 100) return null;
  return i;
}

function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = (url.searchParams.get("username") ?? "").trim();
  const stageParam = url.searchParams.get("stage");
  const stage: Stage = isStage(stageParam) ? stageParam : "progress";
  const percent = parsePercent(url.searchParams.get("percent"));

  if (!username) {
    return NextResponse.json({ ok: false, error: "Missing username" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const design =
    stage === "completed"
      ? await prisma.design.findFirst({
          where: { userId: user.id, status: "completed" },
          orderBy: { completedAt: "desc" },
          select: { id: true, name: true, pixelData: true, startedAt: true },
        })
      : await prisma.design.findFirst({
          where: { userId: user.id, status: "active" },
          select: { id: true, name: true, pixelData: true, startedAt: true },
        });

  const targetGrid: GraphGrid = design && isGraphGrid(design.pixelData) ? design.pixelData : emptyGrid();

  let currentGrid: GraphGrid = emptyGrid();
  let connected = false;
  let computedPct: number | null = null;

  if (design) {
    const account = await prisma.account.findFirst({
      where: { userId: user.id, provider: "github", access_token: { not: null } },
      select: { access_token: true },
    });

    if (account?.access_token) {
      try {
        const calendar = await fetchContributionCalendar({ accessToken: account.access_token });
        const todayISO = toUtcDay(new Date()).toISOString();
        currentGrid = calendarToFixedWindowGrid(calendar, { startDateISO: design.startedAt.toISOString(), todayISO });
        connected = true;
      } catch {
        connected = false;
      }
    }

    const [totalDays, completedDays] = await Promise.all([
      prisma.scheduleEntry.count({ where: { designId: design.id, status: { not: "skipped" } } }),
      prisma.scheduleEntry.count({ where: { designId: design.id, status: "completed" } }),
    ]);
    computedPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }

  const displayPct = percent ?? computedPct ?? 0;

  const titleLine = stage === "started" ? "Design Started" : stage === "completed" ? "Design Completed" : "Progress Milestone";
  const subtitleLine = stage === "progress" ? `${displayPct}% complete` : connected ? "Synced with GitHub" : "Not synced";

  const leftGrid = stage === "completed" ? emptyGrid() : targetGrid;
  const leftLabel = stage === "completed" ? "Before" : "Target";
  const rightGrid = stage === "completed" ? targetGrid : currentGrid;
  const rightLabel = stage === "completed" ? "After" : "Current";

  return NextResponse.json({
    ok: true,
    username,
    titleLine,
    subtitleLine,
    leftLabel,
    rightLabel,
    leftGrid,
    rightGrid,
    designName: design?.name ?? null,
  });
}
