export type GraphGrid = number[][]; // [rows=7][cols=52], values 0..4

export type GitHubContributionCalendar = {
  weeks: Array<{
    contributionDays: Array<{
      date: string;
      contributionCount: number;
      color: string;
    }>;
  }>;
};

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeekSunday(date: Date): Date {
  const d = utcMidnight(date);
  const dow = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - dow);
  return utcMidnight(d);
}

export function nextUtcSunday(date: Date): Date {
  const d = utcMidnight(date);
  const dow = d.getUTCDay();
  const daysUntil = dow === 0 ? 0 : 7 - dow;
  d.setUTCDate(d.getUTCDate() + daysUntil);
  return utcMidnight(d);
}

export function emptyGrid(): GraphGrid {
  return Array.from({ length: 7 }, () => Array.from({ length: 52 }, () => 0));
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

function computeThresholds(counts: number[]): [number, number, number, number] {
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

/**
 * Convert GitHub's contributionCalendar into a 7x52 grid of levels 0..4.
 * Takes the most recent 52 weeks returned by the API.
 */
export function calendarToGrid(calendar: GitHubContributionCalendar): GraphGrid {
  const grid = emptyGrid();
  const weeks = calendar.weeks.slice(-52);
  const counts: number[] = [];

  for (const week of weeks) {
    for (const day of week.contributionDays) {
      counts.push(day.contributionCount);
    }
  }

  const thresholds = computeThresholds(counts);

  for (let c = 0; c < weeks.length; c += 1) {
    const week = weeks[c];
    for (let r = 0; r < 7; r += 1) {
      const day = week.contributionDays[r];
      const count = day?.contributionCount ?? 0;
      grid[r][c] = clampInt(levelFromCount(count, thresholds), 0, 4);
    }
  }

  return grid;
}

/**
 * Convert GitHub's contributionCalendar into a 7x52 grid of levels 0..4,
 * anchored to a fixed design start date so the grid doesn't slide over time.
 *
 * - The rendered window is always 52 weeks (364 days) starting at the Sunday
 *   of the week that contains `startDate`.
 * - Days before `startDate` are left empty (0) so the design appears to begin
 *   when the user starts the process.
 * - Days after `today` are left empty (0).
 */
export function calendarToFixedWindowGrid(
  calendar: GitHubContributionCalendar,
  options: { startDateISO: string; todayISO?: string }
): GraphGrid {
  const grid = emptyGrid();
  const startDate = utcMidnight(new Date(options.startDateISO));
  const today = utcMidnight(options.todayISO ? new Date(options.todayISO) : new Date());
  const windowStart = startOfUtcWeekSunday(startDate);
  const windowDays = 52 * 7;

  const dayCounts = new Map<string, number>();
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      dayCounts.set(day.date, day.contributionCount);
    }
  }

  const countsInWindow: number[] = [];
  for (let dayOffset = 0; dayOffset < windowDays; dayOffset += 1) {
    const date = new Date(windowStart);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    if (date < startDate) continue;
    if (date > today) continue;
    const dateKey = date.toISOString().slice(0, 10);
    countsInWindow.push(dayCounts.get(dateKey) ?? 0);
  }
  const thresholds = computeThresholds(countsInWindow);

  for (let dayOffset = 0; dayOffset < windowDays; dayOffset += 1) {
    const date = new Date(windowStart);
    date.setUTCDate(date.getUTCDate() + dayOffset);

    if (date < startDate) continue;
    if (date > today) continue;

    const dateKey = date.toISOString().slice(0, 10);
    const count = dayCounts.get(dateKey) ?? 0;

    const col = Math.floor(dayOffset / 7);
    const row = dayOffset % 7; // 0=Sun ... 6=Sat
    grid[row][col] = clampInt(levelFromCount(count, thresholds), 0, 4);
  }

  return grid;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic pseudo-random contribution-like grid.
 * Returns a 7x52 grid of intensity levels 0..4.
 */
export function genGraph(seed: number): GraphGrid {
  const rand = mulberry32(seed);
  const rows = 7;
  const cols = 52;
  const grid: GraphGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  for (let c = 0; c < cols; c += 1) {
    // Slight per-column bias so the pattern feels "graph-like".
    const columnBoost = 0.06 * Math.sin((c / cols) * Math.PI * 2);
    for (let r = 0; r < rows; r += 1) {
      const x = rand() + columnBoost;
      const v = x < 0.56 ? 0 : x < 0.76 ? 1 : x < 0.90 ? 2 : x < 0.97 ? 3 : 4;
      grid[r][c] = Math.max(0, Math.min(4, v));
    }
  }

  return grid;
}

/**
 * Pixel-art target design (cat face) encoded into a 7x52 grid of 0..4.
 */
export function genTarget(): GraphGrid {
  const rows = 7;
  const cols = 52;
  const grid: GraphGrid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  const cx = 25;

  // Background fill (face)
  for (let r = 1; r < 6; r += 1) {
    for (let c = cx - 12; c <= cx + 12; c += 1) {
      if (c >= 0 && c < cols) grid[r][c] = 1;
    }
  }

  // Ears
  for (let c = cx - 10; c <= cx - 7; c += 1) {
    if (c >= 0 && c < cols) grid[0][c] = 2;
  }
  for (let c = cx + 7; c <= cx + 10; c += 1) {
    if (c >= 0 && c < cols) grid[0][c] = 2;
  }

  // Eyes
  for (let c = cx - 6; c <= cx - 4; c += 1) {
    if (c >= 0 && c < cols) grid[2][c] = 4;
  }
  for (let c = cx + 4; c <= cx + 6; c += 1) {
    if (c >= 0 && c < cols) grid[2][c] = 4;
  }

  // Nose
  grid[3][cx] = 4;
  grid[3][cx - 1] = 3;
  grid[3][cx + 1] = 3;

  // Mouth
  for (let c = cx - 3; c <= cx + 3; c += 1) {
    grid[4][c] = 2;
  }
  grid[5][cx] = 2;

  // Whiskers
  for (let c = cx - 13; c <= cx - 9; c += 1) {
    if (c >= 0 && c < cols) grid[3][c] = 2;
  }
  for (let c = cx + 9; c <= cx + 13; c += 1) {
    if (c >= 0 && c < cols) grid[3][c] = 2;
  }

  return grid;
}

function blankDesign(): GraphGrid {
  return Array.from({ length: 7 }, () => Array.from({ length: 52 }, () => 0));
}

function setCell(grid: GraphGrid, r: number, c: number, v: number) {
  if (r < 0 || r >= 7) return;
  if (c < 0 || c >= 52) return;
  grid[r][c] = Math.max(0, Math.min(4, v));
}

/**
 * Dummy design generators (used for Design Selection cards).
 * These are intentionally simple, deterministic drawings.
 */
export function genMidnightCat(): GraphGrid {
  const grid = blankDesign();
  const cx = 25;

  // Face
  for (let r = 2; r <= 5; r += 1) {
    for (let c = cx - 10; c <= cx + 10; c += 1) setCell(grid, r, c, 1);
  }

  // Ears
  for (let c = cx - 9; c <= cx - 6; c += 1) setCell(grid, 1, c, 2);
  for (let c = cx + 6; c <= cx + 9; c += 1) setCell(grid, 1, c, 2);

  // Eyes
  for (let c = cx - 5; c <= cx - 3; c += 1) setCell(grid, 3, c, 4);
  for (let c = cx + 3; c <= cx + 5; c += 1) setCell(grid, 3, c, 4);

  // Nose + mouth
  setCell(grid, 4, cx, 4);
  setCell(grid, 5, cx - 1, 3);
  setCell(grid, 5, cx + 1, 3);

  // Tail
  for (let c = cx + 11; c <= cx + 15; c += 1) setCell(grid, 4, c, 2);
  setCell(grid, 3, cx + 15, 2);
  setCell(grid, 5, cx + 15, 2);

  return grid;
}

export function genMountainRange(): GraphGrid {
  const grid = blankDesign();

  // Layered peaks
  for (let c = 0; c < 52; c += 1) {
    const h1 = Math.round(2 + 2 * Math.abs(Math.sin((c / 52) * Math.PI * 2)));
    const h2 = Math.round(1 + 2 * Math.abs(Math.sin((c / 52) * Math.PI * 4 + 0.8)));
    for (let r = 6; r >= 6 - h1; r -= 1) setCell(grid, r, c, 2);
    for (let r = 6; r >= 6 - h2; r -= 1) setCell(grid, r, c, 1);
  }

  // Snowcaps
  for (let c = 0; c < 52; c += 1) {
    if (grid[2][c] >= 2) setCell(grid, 2, c, 4);
    if (grid[3][c] >= 2 && c % 3 === 0) setCell(grid, 3, c, 3);
  }

  return grid;
}

export function genPixelHeart(): GraphGrid {
  const grid = blankDesign();
  const cx = 25;

  const points = [
    [2, cx - 2],
    [2, cx + 2],
    [3, cx - 4],
    [3, cx - 3],
    [3, cx - 2],
    [3, cx - 1],
    [3, cx],
    [3, cx + 1],
    [3, cx + 2],
    [3, cx + 3],
    [3, cx + 4],
    [4, cx - 3],
    [4, cx - 2],
    [4, cx - 1],
    [4, cx],
    [4, cx + 1],
    [4, cx + 2],
    [4, cx + 3],
    [5, cx - 2],
    [5, cx - 1],
    [5, cx],
    [5, cx + 1],
    [5, cx + 2],
    [6, cx],
  ] as const;

  for (const [r, c] of points) setCell(grid, r, c, 4);
  // Inner shading
  for (let c = cx - 1; c <= cx + 1; c += 1) setCell(grid, 4, c, 3);
  setCell(grid, 5, cx, 3);

  return grid;
}

export function genOceanWave(): GraphGrid {
  const grid = blankDesign();

  for (let c = 0; c < 52; c += 1) {
    const y = 3 + Math.round(1.5 * Math.sin((c / 52) * Math.PI * 2));
    setCell(grid, y, c, 4);
    setCell(grid, y + 1, c, 2);
    if (c % 4 === 0) setCell(grid, y - 1, c, 3);
    if (c % 7 === 0) setCell(grid, y + 2, c, 1);
  }

  return grid;
}

export function genSpaceRocket(): GraphGrid {
  const grid = blankDesign();
  const cx = 25;

  // Body
  for (let r = 1; r <= 5; r += 1) {
    setCell(grid, r, cx, 3);
    setCell(grid, r, cx - 1, 2);
    setCell(grid, r, cx + 1, 2);
  }

  // Nose cone
  setCell(grid, 0, cx, 4);
  setCell(grid, 1, cx, 4);

  // Window
  setCell(grid, 3, cx, 4);

  // Fins
  setCell(grid, 4, cx - 2, 2);
  setCell(grid, 4, cx + 2, 2);
  setCell(grid, 5, cx - 2, 2);
  setCell(grid, 5, cx + 2, 2);

  // Flame
  setCell(grid, 6, cx, 4);
  setCell(grid, 6, cx - 1, 3);
  setCell(grid, 6, cx + 1, 3);

  // Stars
  for (let c = 0; c < 52; c += 8) setCell(grid, 1, c, 1);
  for (let c = 4; c < 52; c += 10) setCell(grid, 2, c, 2);

  return grid;
}
