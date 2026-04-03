import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import Groq from "groq-sdk";

import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";
import type { GraphGrid } from "@/lib/graph-utils";
import { computeContributionThresholds } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type WeekStart = "sunday" | "monday";

type Candidate = {
  name: string;
  theme: string;
  grid: GraphGrid;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date, weekStart: WeekStart): Date {
  const d = utcMidnight(date);
  const dow = d.getUTCDay(); // 0=Sun

  if (weekStart === "sunday") {
    d.setUTCDate(d.getUTCDate() - dow);
    return utcMidnight(d);
  }

  // monday
  const shift = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - shift);
  return utcMidnight(d);
}

function emptyGrid(): GraphGrid {
  return Array.from({ length: 7 }, () => Array.from({ length: 52 }, () => 0));
}

function clampLevel(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 4) return 4;
  return Math.round(v);
}

function isGraphGrid(value: unknown): value is GraphGrid {
  if (!Array.isArray(value) || value.length !== 7) return false;
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 52) return false;
    for (const cell of row) {
      if (typeof cell !== "number" || !Number.isFinite(cell)) return false;
      if (cell < 0 || cell > 4) return false;
    }
  }
  return true;
}

function normalizeCandidate(value: unknown): Candidate | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<Candidate>;

  const name = typeof v.name === "string" ? v.name.trim() : "";
  const theme = typeof v.theme === "string" ? v.theme.trim() : "";

  if (!name || !theme) return null;
  if (!isGraphGrid(v.grid)) return null;

  // Defensive: clamp levels.
  const grid: GraphGrid = v.grid.map((row) => row.map((cell) => clampLevel(cell)));
  return { name, theme, grid };
}

function levelsForLockedDays(options: {
  dayCounts: Map<string, number>;
  thresholds: [number, number, number, number];
  weekStart: Date;
  today: Date;
}): { lockedMask: GraphGrid; lockedLevels: GraphGrid } {
  const { dayCounts, thresholds, weekStart, today } = options;

  const lockedMask = emptyGrid();
  const lockedLevels = emptyGrid();

  // The 52-week window starts at the most recent week boundary, so locked
  // pixels are in column 0 from weekStart up to today.
  const daysSinceStart = Math.max(0, Math.min(6, Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))));

  const levelFromCount = (count: number) => {
    const [t1, t2, t3] = thresholds;
    if (count <= 0) return 0;
    if (count <= t1) return 1;
    if (count <= t2) return 2;
    if (count <= t3) return 3;
    return 4;
  };

  for (let dayOffset = 0; dayOffset <= daysSinceStart; dayOffset += 1) {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const key = date.toISOString().slice(0, 10);
    const count = dayCounts.get(key) ?? 0;

    // Row 0 = weekStart day (Sun or Mon depending on weekStart).
    const row = dayOffset;
    const col = 0;

    lockedMask[row][col] = 1;
    lockedLevels[row][col] = clampLevel(levelFromCount(count));
  }

  return { lockedMask, lockedLevels };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!accessToken) return badRequest("Connect GitHub to generate candidates.");

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ ok: false, error: "GROQ_API_KEY is not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const theme = (url.searchParams.get("theme") ?? "").trim();
  const weekStartParam = (url.searchParams.get("weekStart") ?? "sunday").toLowerCase();
  const weekStart: WeekStart = weekStartParam === "monday" ? "monday" : "sunday";

  if (!theme) return badRequest("theme is required");

  // Pull a full year so thresholds match the user's real intensity distribution.
  const calendar = await fetchContributionCalendar({ accessToken });
  const thresholds = computeContributionThresholds(calendar);

  const dayCounts = new Map<string, number>();
  for (const w of calendar.weeks) {
    for (const day of w.contributionDays) {
      dayCounts.set(day.date, day.contributionCount);
    }
  }

  const today = utcMidnight(new Date());
  const weekStartDate = startOfUtcWeek(today, weekStart);

  const { lockedMask, lockedLevels } = levelsForLockedDays({
    dayCounts,
    thresholds,
    weekStart: weekStartDate,
    today,
  });

  const systemPrompt =
    "You are PixelPush's pixel-art generator. " +
    "The canvas is a 7x52 grid of integers 0..4 (0=empty, 4=darkest). " +
    "You generate TARGET designs that users will draw on their GitHub contribution graph. " +
    "You MUST output raw JSON only (no markdown, no backticks).";

  const userPrompt =
    `Generate 5 candidate pixel-art target grids for the theme '${theme}'.\n` +
    `These candidates MUST CONTINUE from existing commits in the current week.\n` +
    `The design starts at the most recent ${weekStart} UTC week boundary, so the locked pixels are in column 0.\n` +
    `You must preserve all locked pixels EXACTLY where lockedMask has 1 by copying lockedLevels values.\n\n` +
    `Output JSON as an array of 5 objects. Each object must be:\n` +
    `- name: string (short design name)\n` +
    `- theme: string (echo '${theme}')\n` +
    `- grid: number[7][52] (integers 0..4)\n\n` +
    `Hard constraints:\n` +
    `- grid has exactly 7 rows, each exactly 52 integers\n` +
    `- every cell is an integer 0..4\n` +
    `- for every cell where lockedMask[row][col] == 1, grid[row][col] MUST equal lockedLevels[row][col]\n` +
    `- make candidates visually distinct and high quality\n\n` +
    `lockedMask (7x52, 1 means locked):\n${JSON.stringify(lockedMask)}\n\n` +
    `lockedLevels (7x52 levels to preserve):\n${JSON.stringify(lockedLevels)}\n`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 3500,
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown JSON parse error";
    return NextResponse.json(
      {
        ok: false,
        error: `AI returned invalid JSON (${message})`,
      },
      { status: 500 }
    );
  }

  if (!Array.isArray(parsed)) {
    return NextResponse.json({ ok: false, error: "AI returned non-array" }, { status: 500 });
  }

  const candidates = parsed
    .map(normalizeCandidate)
    .filter(Boolean) as Candidate[];

  if (candidates.length < 1) {
    return NextResponse.json({ ok: false, error: "AI returned no valid candidates" }, { status: 500 });
  }

  // Ensure lock invariants server-side.
  for (const cand of candidates) {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 52; c += 1) {
        if (lockedMask[r][c] === 1 && cand.grid[r][c] !== lockedLevels[r][c]) {
          cand.grid[r][c] = lockedLevels[r][c];
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    theme,
    weekStart,
    locked: { weekStartISO: weekStartDate.toISOString(), todayISO: today.toISOString() },
    candidates: candidates.slice(0, 5),
  });
}
