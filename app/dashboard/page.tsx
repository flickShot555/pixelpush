"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Circle, Flame, Target, Zap } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { StatCard } from "@/components/ui/StatCard";
import {
  calendarToFixedWindowGrid,
  emptyGrid,
  type GitHubContributionCalendar,
  type GraphGrid,
} from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";
import { PixelGrid } from "@/components/ui/PixelGrid";

function startOfUtcWeekSunday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

function ScaledGrid({ grid }: { grid: GraphGrid }) {
  const { theme } = useTheme();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const cell = 10;
  const gap = 2;
  const naturalWidth = 52 * cell + 51 * gap;
  const scale = width > 0 ? Math.min(1, width / naturalWidth) : 1;

  return (
    <div ref={ref} style={{ width: "100%", overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "left top" }}>
        <PixelGrid data={grid} cellSize={cell} gap={gap} t={theme} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const [progressPct, setProgressPct] = useState(0);

  const [target, setTarget] = useState<GraphGrid>(() => emptyGrid());
  const [current, setCurrent] = useState<GraphGrid>(() => emptyGrid());
  const [graphError, setGraphError] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>("Midnight Cat");
  const [targetStartDate, setTargetStartDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const targetRes = await fetch("/api/target", { cache: "no-store" });

        if (!targetRes.ok) {
          const msg = await targetRes.text().catch(() => "");
          throw new Error(msg || `Target fetch failed (${targetRes.status})`);
        }
        const targetJson = (await targetRes.json()) as {
          target?: { name?: string; grid?: GraphGrid; startDate?: string };
        };

        const startDateISO = targetJson.target?.startDate;
        if (!cancelled) {
          setTargetName(targetJson.target?.name ?? "Midnight Cat");
          setTarget(targetJson.target?.grid ?? emptyGrid());
          setTargetStartDate(startDateISO ?? null);
        }

        const safeStart = startDateISO ?? new Date().toISOString();
        const from = startOfUtcWeekSunday(new Date(safeStart)).toISOString();
        const to = new Date().toISOString();

        const currentRes = await fetch(`/api/github/contributions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { cache: "no-store" }
        );

        if (!currentRes.ok) {
          const msg = await currentRes.text().catch(() => "");
          throw new Error(msg || `GitHub fetch failed (${currentRes.status})`);
        }
        const currentJson = (await currentRes.json()) as { calendar?: GitHubContributionCalendar };
        const calendar = currentJson.calendar;
        if (!calendar) throw new Error("Missing calendar from GitHub API");

        if (!cancelled) setCurrent(calendarToFixedWindowGrid(calendar, { startDateISO: safeStart }));

        if (!cancelled) setGraphError(null);
      } catch (e) {
        if (cancelled) return;
        setGraphError(e instanceof Error ? e.message : "Unable to load graphs");
        setTarget(emptyGrid());
        setCurrent(emptyGrid());
        setTargetName("Midnight Cat");
        setTargetStartDate(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setProgressPct(34), 100);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main
      className="w-full"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        overflowX: "hidden",
      }}
    >
      <div
        className="mx-auto w-full px-6"
        style={{
          maxWidth: 1400,
          paddingTop: 28,
          paddingBottom: 28,
        }}
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: theme.muted,
                fontSize: 14,
                fontFamily: "var(--pp-font-body)",
              }}
            >
              Welcome back, flickShot555. You have commits due today.
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>🔥 12 day streak</Badge>
              <Badge>🎨 Active design</Badge>
            </div>
          </div>
          <div style={{ paddingTop: 2 }}>
            <Tag>Active: {targetName} · 34% complete</Tag>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StatCard label="Current Streak" icon={<Flame size={22} />} value="12 days" subtitle="Best: 18 days" />
          <StatCard label="Design Progress" icon={<Target size={22} />} value="34%" subtitle="68 days remaining" />
          <StatCard label="Today's Target" icon={<Zap size={22} />} value="1/3" subtitle="2 commits needed" />
        </section>

        <section className="mt-4">
          <Card elevated style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div
                style={{
                  color: theme.text,
                  fontFamily: "var(--pp-font-head)",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Graph Progress
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: theme.g4,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 12, color: theme.muted }}>Target Design</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: theme.g2,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 12, color: theme.muted }}>Current Graph</span>
                </div>
              </div>
            </div>

            <div
              className="mt-5 grid gap-8"
              style={{
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: theme.muted,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: "var(--pp-font-body)",
                  }}
                >
                  TARGET
                </div>
                <div className="mt-3">
                  <ScaledGrid grid={target} />
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: theme.muted,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontFamily: "var(--pp-font-body)",
                  }}
                >
                  CURRENT
                </div>
                <div className="mt-3">
                  <ScaledGrid grid={current} />
                </div>
              </div>
            </div>

            {graphError && (
              <div style={{ marginTop: 12, fontSize: 12, color: theme.muted }}>
                Graphs unavailable: {graphError}
              </div>
            )}

            <div className="mt-6">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: theme.muted }}>Overall completion</div>
                <div style={{ fontSize: 12, color: theme.accent, fontWeight: 700 }}>34%</div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 6,
                  borderRadius: 99,
                  background: theme.surface2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    background: theme.accent,
                    borderRadius: 99,
                    transition: "width 1000ms ease",
                  }}
                />
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            elevated
            style={{
              padding: 22,
              background: `linear-gradient(135deg, ${theme.accentBg}, ${theme.surface})`,
              border: `1px solid ${theme.accentBorder}`,
            }}
          >
            <div
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Zap aria-hidden size={16} />
              <span>{"Today's Task"}</span>
            </div>
            <div
              style={{
                marginTop: 10,
                color: theme.accent,
                fontFamily: "var(--pp-font-head)",
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              3 commits
            </div>
            <div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>
              Due by end of day to stay on schedule
            </div>

            <div className="mt-4 flex gap-2">
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.borderRadius,
                  background: theme.accent,
                  color: theme.onAccent,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                }}
              >
                <Check aria-hidden size={18} color={theme.onAccent} />
              </div>
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.borderRadius,
                  background: theme.surface2,
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                <Circle aria-hidden size={18} color={theme.muted} />
              </div>
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.borderRadius,
                  background: theme.surface2,
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                <Circle aria-hidden size={18} color={theme.muted} />
              </div>
            </div>
          </Card>

          <Card elevated style={{ padding: 22 }}>
            <div
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CalendarDays aria-hidden size={16} />
              <span>Upcoming</span>
            </div>

            <div className="mt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
              {[
                { when: "Tomorrow", commits: "2 commits" },
                { when: "In 2 days", commits: "4 commits" },
                { when: "In 3 days", commits: "1 commit" },
                { when: "In 4 days", commits: "3 commits" },
              ].map((row) => (
                <div
                  key={row.when}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: `1px solid ${theme.border}`,
                    fontSize: 13,
                    fontFamily: "var(--pp-font-body)",
                  }}
                >
                  <span style={{ color: theme.muted }}>{row.when}</span>
                  <span style={{ color: theme.text, fontWeight: 600 }}>{row.commits}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
