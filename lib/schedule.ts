import type { GraphGrid, GitHubContributionCalendar } from "@/lib/graph-utils";

export type ContributionThresholds = [number, number, number, number];

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeekSunday(date: Date): Date {
  const d = utcMidnight(date);
  const dow = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - dow);
  return utcMidnight(d);
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(v)));
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeThresholdsFromCounts(counts: number[]): ContributionThresholds {
  const nonZero = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (nonZero.length === 0) return [1, 2, 4, 8];

  const q = (p: number) => {
    const idx = Math.max(0, Math.min(nonZero.length - 1, Math.round((nonZero.length - 1) * p)));
    return nonZero[idx];
  };

  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  const t4 = q(0.9);

  return [t1, Math.max(t2, t1 + 1), Math.max(t3, t2 + 1), Math.max(t4, t3 + 1)];
}

export function computeContributionThresholds(calendar: GitHubContributionCalendar): ContributionThresholds {
  const counts: number[] = [];
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      counts.push(day.contributionCount);
    }
  }
  return computeThresholdsFromCounts(counts);
}

function levelToTargetCount(level: number, thresholds: ContributionThresholds, seed: number): number {
  const l = clampInt(level, 0, 4);
  if (l === 0) return 0;

  // Map each level to a range derived from the user's historical thresholds.
  // This aligns with the documentation requirement that shading thresholds are per-user.
  const [t1, t2, t3, t4] = thresholds;

  const rand = mulberry32(seed);

  const pickBetween = (min: number, max: number) => {
    const lo = Math.max(1, Math.floor(min));
    const hi = Math.max(lo, Math.floor(max));
    if (lo === hi) return lo;
    return lo + Math.floor(rand() * (hi - lo + 1));
  };

  if (l === 1) return pickBetween(1, Math.max(1, t1));
  if (l === 2) return pickBetween(Math.max(1, t1), Math.max(t1, t2));
  if (l === 3) return pickBetween(Math.max(1, t2), Math.max(t2, t3));

  // Level 4: allow slightly above the top threshold for variety.
  return pickBetween(Math.max(1, t3), Math.max(t3, t4 + 2));
}

export type GeneratedScheduleEntry = {
  date: Date;
  targetCount: number;
};

export function generateSchedule(options: {
  grid: GraphGrid;
  startDate: Date;
  thresholds: ContributionThresholds;
  seed: number;
}): { windowStart: Date; entries: GeneratedScheduleEntry[]; targetEndAt: Date | null } {
  const { grid, startDate, thresholds, seed } = options;

  const activationDate = utcMidnight(startDate);
  const windowStart = startOfUtcWeekSunday(activationDate);

  const entries: GeneratedScheduleEntry[] = [];
  let lastActive: Date | null = null;

  for (let dayOffset = 0; dayOffset < 52 * 7; dayOffset += 1) {
    const date = new Date(windowStart);
    date.setUTCDate(date.getUTCDate() + dayOffset);

    if (date < activationDate) continue;

    const col = Math.floor(dayOffset / 7);
    const row = dayOffset % 7; // 0=Sun

    const level = grid?.[row]?.[col] ?? 0;
    const targetCount = levelToTargetCount(level, thresholds, seed + dayOffset);

    if (targetCount <= 0) continue;

    entries.push({ date, targetCount });
    lastActive = date;
  }

  return {
    windowStart,
    entries,
    targetEndAt: lastActive,
  };
}

export function suggestedSpacingLabel(targetCount: number): string | null {
  if (targetCount <= 1) return null;
  if (targetCount === 2) return "Suggested: morning + evening";
  if (targetCount === 3) return "Suggested: morning + afternoon + evening";
  if (targetCount === 4) return "Suggested: spread across the day";
  return "Suggested: spread across the day";
}
