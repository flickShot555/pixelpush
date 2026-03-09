"use client";

import { useEffect, useMemo, useState } from "react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { PixelGrid } from "@/components/ui/PixelGrid";
import { PixelDiffGrid } from "@/components/ui/PixelDiffGrid";
import { useTheme } from "@/lib/theme";

type GraphGrid = number[][];

type ProgressResponse =
  | {
      ok: true;
  username?: string;
      design: null;
      targetGrid: null;
      currentGrid: null;
      stats: null;
      upcoming: Array<unknown>;
    }
  | {
      ok: true;
      username?: string;
      design: {
        id: string;
        name: string;
        theme: string;
        startedAt: string;
        targetEndAt: string | null;
      };
      targetGrid: GraphGrid;
      currentGrid: GraphGrid;
      stats: {
        completionPct: number;
        streakDays: number;
        totalCommitsMade: number;
        targetCommitsRemaining: number;
        daysOnSchedule: number;
        daysElapsed: number;
        daysMissed: number;
      };
      upcoming: Array<{
        date: string;
        dateLabel: string;
        targetCount: number;
        actualCount: number;
        status: "pending" | "completed" | "missed" | "skipped";
      }>;
    };

function milestonePercent(completionPct: number): { stage: "started" | "progress" | "completed"; percent?: number } {
  if (completionPct >= 100) return { stage: "completed" };
  if (completionPct < 25) return { stage: "started" };
  if (completionPct >= 75) return { stage: "progress", percent: 75 };
  if (completionPct >= 50) return { stage: "progress", percent: 50 };
  return { stage: "progress", percent: 25 };
}

function buildPublicShareUrl(options: { origin: string; username: string; stage: string; percent?: number }): string {
  const u = new URL(`/u/${encodeURIComponent(options.username)}`, options.origin);
  u.searchParams.set("stage", options.stage);
  if (options.percent !== undefined) u.searchParams.set("percent", String(options.percent));
  return u.toString();
}

async function webShare(options: { title: string; text: string; url: string }) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title: options.title, text: options.text, url: options.url });
      return;
    }
  } catch {
    // fall through to clipboard / new tab
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(options.url);
      return;
    }
  } catch {
    // fall through to new tab
  }

  window.open(options.url, "_blank", "noopener,noreferrer");
}

function shareOnX(options: { text: string; url: string }) {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", options.text);
  u.searchParams.set("url", options.url);
  window.open(u.toString(), "_blank", "noopener,noreferrer");
}

function shareOnLinkedIn(options: { url: string }) {
  const u = new URL("https://www.linkedin.com/sharing/share-offsite/");
  u.searchParams.set("url", options.url);
  window.open(u.toString(), "_blank", "noopener,noreferrer");
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

function formatShortDateUtc(dateIso: string) {
  const d = new Date(dateIso);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
}

function estimateMilestoneDate(startedAtIso: string, targetEndAtIso: string | null, pct: number): string | null {
  if (!targetEndAtIso) return null;
  const start = new Date(startedAtIso);
  const end = new Date(targetEndAtIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return null;
  const t = start.getTime() + (ms * pct) / 100;
  return formatShortDateUtc(new Date(t).toISOString());
}

type StatRowProps = {
  label: string;
  value: string;
  borderColor: string;
  muted: string;
  text: string;
};

function StatRow({ label, value, borderColor, muted, text }: StatRowProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "8px 0", borderBottom: `1px solid ${borderColor}` }}
    >
      <div style={{ color: muted, fontSize: 13 }}>{label}</div>
      <div style={{ color: text, fontSize: 13, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

type Milestone = {
  label: string;
  date: string;
  done: boolean;
};

type MilestoneStepProps = {
  index: number;
  milestone: Milestone;
};

function MilestoneStep({ index, milestone }: MilestoneStepProps) {
  const { theme } = useTheme();

  const circleStyle: React.CSSProperties = milestone.done
    ? {
        width: 24,
        height: 24,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.accent,
        border: `2px solid ${theme.accent}`,
        color: theme.onAccent,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--pp-font-body)",
        lineHeight: 1,
      }
    : {
        width: 24,
        height: 24,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.surface2,
        border: `2px solid ${theme.border}`,
        color: theme.muted,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--pp-font-body)",
        lineHeight: 1,
      };

  const labelColor = milestone.done ? theme.text : theme.muted;
  const dateColor = theme.faint;

  return (
    <div className="flex items-start" style={{ gap: 12, marginBottom: 16 }}>
      <div aria-hidden style={circleStyle}>
        {milestone.done ? "✓" : String(index + 1)}
      </div>

      <div>
        <div style={{ color: labelColor, fontSize: 13, fontWeight: 600 }}>
          {milestone.label}
        </div>
        <div style={{ color: dateColor, fontSize: 11, marginTop: 2 }}>
          {milestone.done ? milestone.date : `Est. ${milestone.date}`}
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { theme } = useTheme();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/progress", { method: "GET" });
        const json = (await res.json().catch(() => null)) as ProgressResponse | { ok?: boolean; error?: string } | null;
        if (cancelled) return;
        if (!res.ok || !json || (json as { ok?: boolean }).ok !== true) {
          setError((json as { error?: string } | null)?.error || "Unable to load progress");
          setData(null);
          setBusy(false);
          return;
        }
        setData(json as ProgressResponse);
        setBusy(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unable to load progress");
        setData(null);
        setBusy(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const target = useMemo(() => {
    if (!data || data.design === null) return null;
    return isGraphGrid(data.targetGrid) ? data.targetGrid : null;
  }, [data]);

  const current = useMemo(() => {
    if (!data || data.design === null) return null;
    return isGraphGrid(data.currentGrid) ? data.currentGrid : null;
  }, [data]);

  const subtitle = useMemo(() => {
    if (!data || data.design === null) return "No active design";
    const started = formatShortDateUtc(data.design.startedAt);
    const end = data.design.targetEndAt ? formatShortDateUtc(data.design.targetEndAt) : null;
    return `${data.design.name} · Started ${started}${end ? ` · Est. completion ${end}` : ""}`;
  }, [data]);

  const stats = useMemo(() => {
    if (!data || data.design === null || !data.stats) return null;
    return {
      completion: `${data.stats.completionPct}%`,
      currentStreak: `${data.stats.streakDays} days`,
      totalCommitsMade: String(data.stats.totalCommitsMade),
      targetCommitsRemaining: String(data.stats.targetCommitsRemaining),
      daysOnSchedule: `${data.stats.daysOnSchedule} / ${data.stats.daysElapsed}`,
      daysMissed: String(data.stats.daysMissed),
    } as const;
  }, [data]);

  const sharePayload = useMemo(() => {
    if (!data || data.design === null || !data.stats) return null;
    const username = data.username;
    if (!username) return null;
    const { stage, percent } = milestonePercent(data.stats.completionPct);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) return null;
    const url = buildPublicShareUrl({ origin, username, stage, percent });
    const text =
      stage === "completed"
        ? `I just completed my PixelPush design: ${data.design.name}`
        : stage === "started"
          ? `I just started a PixelPush design: ${data.design.name}`
          : `PixelPush progress: ${percent ?? data.stats.completionPct}% complete on ${data.design.name}`;
    return { username, stage, percent, url, text, title: "PixelPush" };
  }, [data]);

  const milestones = useMemo<Milestone[]>(
    () => {
      if (!data || data.design === null || !data.stats) {
        return [
          { label: "Design Activated", date: "—", done: false },
          { label: "25% Complete", date: "—", done: false },
          { label: "50% Complete", date: "—", done: false },
          { label: "75% Complete", date: "—", done: false },
          { label: "Design Complete!", date: "—", done: false },
        ];
      }

      const started = formatShortDateUtc(data.design.startedAt);
      const est25 = estimateMilestoneDate(data.design.startedAt, data.design.targetEndAt, 25) ?? "—";
      const est50 = estimateMilestoneDate(data.design.startedAt, data.design.targetEndAt, 50) ?? "—";
      const est75 = estimateMilestoneDate(data.design.startedAt, data.design.targetEndAt, 75) ?? "—";
      const est100 = (data.design.targetEndAt ? formatShortDateUtc(data.design.targetEndAt) : null) ?? "—";

      const pct = data.stats.completionPct;
      return [
        { label: "Design Activated", date: started, done: true },
        { label: "25% Complete", date: est25, done: pct >= 25 },
        { label: "50% Complete", date: est50, done: pct >= 50 },
        { label: "75% Complete", date: est75, done: pct >= 75 },
        { label: "Design Complete!", date: est100, done: pct >= 100 },
      ];
    },
    [data]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
      }}
    >
      <div className="mx-auto w-full p-8" style={{ maxWidth: 1100 }}>
        <header className="flex items-start justify-between gap-4" style={{ marginBottom: 28 }}>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 28,
                fontWeight: 800,
                marginBottom: 4,
              }}
            >
              Progress
            </h1>
            <div style={{ color: theme.muted, fontSize: 14 }}>{subtitle}</div>
            {error ? (
              <div style={{ color: theme.danger, fontSize: 13, fontWeight: 700, marginTop: 6 }}>{error}</div>
            ) : null}
          </div>

          <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
            <Btn
              disabled={!sharePayload}
              onClick={async () => {
                if (!sharePayload) return;
                await webShare({ title: sharePayload.title, text: sharePayload.text, url: sharePayload.url });
              }}
            >
              Share 🚀
            </Btn>
            <Btn
              disabled={!sharePayload}
              onClick={() => {
                if (!sharePayload) return;
                shareOnX({ text: sharePayload.text, url: sharePayload.url });
              }}
            >
              X
            </Btn>
            <Btn
              disabled={!sharePayload}
              onClick={() => {
                if (!sharePayload) return;
                shareOnLinkedIn({ url: sharePayload.url });
              }}
            >
              LinkedIn
            </Btn>
          </div>
        </header>

        <Card
          className="w-full"
          style={{ padding: "28px 32px", marginBottom: 24, overflow: "hidden" }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: "1fr 40px 1fr",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: theme.muted,
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  marginBottom: 12,
                }}
              >
                TARGET DESIGN
              </div>
              <div style={{ overflowX: "auto", overflowY: "hidden", maxWidth: "100%" }}>
                {target ? <PixelGrid data={target} cellSize={12} gap={2} t={theme} fit /> : null}
              </div>
            </div>

            <div
              aria-hidden
              style={{
                color: theme.muted,
                fontSize: 20,
                textAlign: "center",
              }}
            >
              →
            </div>

            <div>
              <div
                style={{
                  color: theme.muted,
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  marginBottom: 12,
                }}
              >
                CURRENT GRAPH
              </div>
              <div style={{ overflowX: "auto", overflowY: "hidden", maxWidth: "100%" }}>
                {current ? <PixelGrid data={current} cellSize={12} gap={2} t={theme} fit /> : null}
              </div>
            </div>
          </div>
        </Card>

        <Card className="w-full" style={{ padding: "28px 32px", marginBottom: 24, overflow: "hidden" }}>
          <div
            style={{
              color: theme.muted,
              textTransform: "uppercase",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            OVERLAY COMPARISON
          </div>
          <div style={{ overflowX: "auto", overflowY: "hidden", maxWidth: "100%" }}>
            {target && current ? (
              <PixelDiffGrid target={target} current={current} cellSize={12} gap={2} t={theme} fit />
            ) : null}
          </div>
          <div style={{ marginTop: 10, color: theme.muted, fontSize: 12 }}>
            Highlights where your current graph is behind (warn) or ahead (danger) of the target.
          </div>
        </Card>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
          <Card className="w-full h-full" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              📊 Stats
            </div>

            <StatRow
              label="Completion"
              value={stats?.completion ?? (busy ? "…" : "—")}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Current Streak"
              value={stats?.currentStreak ?? (busy ? "…" : "—")}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Total Commits Made"
              value={stats?.totalCommitsMade ?? (busy ? "…" : "—")}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Target Commits Remaining"
              value={stats?.targetCommitsRemaining ?? (busy ? "…" : "—")}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Days on Schedule"
              value={stats?.daysOnSchedule ?? (busy ? "…" : "—")}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Days Missed"
              value={stats?.daysMissed ?? (busy ? "…" : "—")}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />

            <div
              style={{
                marginTop: 16,
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Next 7 days
            </div>
            <div style={{ marginTop: 8 }}>
              {data && data.design !== null && data.upcoming.length ? (
                data.upcoming.map((t) => (
                  <div
                    key={t.date}
                    className="flex items-center justify-between"
                    style={{ padding: "8px 0", borderBottom: `1px solid ${theme.border2}` }}
                  >
                    <div style={{ color: theme.muted, fontSize: 13 }}>{t.dateLabel}</div>
                    <div style={{ color: theme.text, fontSize: 13, fontWeight: 700 }}>
                      {t.actualCount}/{t.targetCount}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: theme.muted, fontSize: 13, paddingTop: 8 }}>{busy ? "Loading…" : "No upcoming tasks"}</div>
              )}
            </div>
          </Card>

          <Card
            className="w-full h-full"
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <div
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              🏁 Milestones
            </div>

            <div style={{ flex: 1 }}>
              {milestones.map((m, idx) => (
                <MilestoneStep key={`${m.label}-${m.date}`} index={idx} milestone={m} />
              ))}
            </div>

            <Btn
              className="w-full"
              disabled={!sharePayload}
              onClick={async () => {
                if (!sharePayload) return;
                await webShare({ title: sharePayload.title, text: sharePayload.text, url: sharePayload.url });
              }}
              style={{ width: "100%" }}
            >
              Share 🚀
            </Btn>
          </Card>
        </section>
      </div>
    </main>
  );
}
