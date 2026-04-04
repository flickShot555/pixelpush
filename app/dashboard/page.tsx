"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Circle, Flame, Target, Zap } from "lucide-react";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { StatCard } from "@/components/ui/StatCard";
import {
  emptyGrid,
  type GraphGrid,
} from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";
import { PixelGrid } from "@/components/ui/PixelGrid";

function ScaledGrid({ grid }: { grid: GraphGrid }) {
  const { theme } = useTheme();
  const cell = 10;
  const gap = 2;

  return (
    <div style={{ width: "100%" }}>
      <PixelGrid data={grid} cellSize={cell} gap={gap} t={theme} fit />
    </div>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();

  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  const [progressPctAnim, setProgressPctAnim] = useState(0);

  const [target, setTarget] = useState<GraphGrid>(() => emptyGrid());
  const [current, setCurrent] = useState<GraphGrid>(() => emptyGrid());
  const [graphError, setGraphError] = useState<string | null>(null);

  const [username, setUsername] = useState<string>("");
  const [activeDesignName, setActiveDesignName] = useState<string>("");
  const [completionPct, setCompletionPct] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [todayTarget, setTodayTarget] = useState<number | null>(null);
  const [todayActual, setTodayActual] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<Array<{ when: string; commits: string }>>([]);

  const hasGithub = Boolean((session?.user as unknown as { githubId?: string })?.githubId);

  const welcomeName = useMemo(() => {
    if (username) return username;
    const fallback = (session?.user as { username?: string } | undefined)?.username;
    return fallback ?? "";
  }, [session?.user, username]);

  const tagText = useMemo(() => {
    if (!activeDesignName) return "No active design";
    return `Active: ${activeDesignName} · ${completionPct}% complete`;
  }, [activeDesignName, completionPct]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "true") return;

    setShowUpgradeBanner(true);

    // Clean the URL so refreshes don't re-trigger the banner.
    router.replace("/dashboard");

    const t = window.setTimeout(() => setShowUpgradeBanner(false), 5_000);
    return () => window.clearTimeout(t);
  }, [router]);

  function relativeWhenLabel(dateIso: string, todayIso: string): string {
    const d = new Date(dateIso);
    const t = new Date(todayIso);
    const dayMs = 24 * 60 * 60 * 1000;
    const delta = Math.round((d.getTime() - t.getTime()) / dayMs);
    if (delta === 0) return "Today";
    if (delta === 1) return "Tomorrow";
    return `In ${delta} days`;
  }

  useEffect(() => {
    let cancelled = false;

    function utcMidnight(date: Date): Date {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    }

    const pollMs = 30_000;

    async function load() {
      try {
        const res = await fetch("/api/progress", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
              username?: string;
              design?: { name?: string; targetEndAt?: string | null } | null;
              targetGrid?: GraphGrid | null;
              currentGrid?: GraphGrid | null;
              stats?: {
                completionPct?: number;
                streakDays?: number;
              } | null;
              today?: { targetCount: number; actualCount: number } | null;
              upcoming?: Array<{ date: string; targetCount: number }>;
            }
          | null;

        if (!res.ok || !json?.ok) {
          const msg = json?.error ?? `Progress fetch failed (${res.status})`;
          throw new Error(msg);
        }

        const now = new Date();
        const today = utcMidnight(now);
        const todayIso = today.toISOString();

        const designName = json.design?.name ?? "";
        const pct = Math.max(0, Math.min(100, Math.round(json.stats?.completionPct ?? 0)));
        const streak = Math.max(0, Math.round(json.stats?.streakDays ?? 0));

        const endAtRaw = json.design?.targetEndAt ?? null;
        const remaining = endAtRaw
          ? Math.max(0, Math.ceil((new Date(endAtRaw).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)))
          : null;

        const todays = json.today ?? null;
        const tTarget = todays ? Math.max(0, Math.round(todays.targetCount)) : null;
        const tActual = todays ? Math.max(0, Math.round(todays.actualCount)) : null;

        const nextRows = (json.upcoming ?? [])
          .filter((x) => typeof x?.date === "string")
          .slice(0, 7)
          .map((x) => ({
            when: relativeWhenLabel(x.date, todayIso),
            commits: `${x.targetCount} commit${x.targetCount === 1 ? "" : "s"}`,
          }))
          .filter((x) => x.when !== "Today");

        if (cancelled) return;

        setUsername(json.username ?? "");
        setActiveDesignName(designName);
        setCompletionPct(pct);
        setStreakDays(streak);
        setDaysRemaining(remaining);
        setTodayTarget(tTarget);
        setTodayActual(tActual);
        setUpcoming(nextRows);

        setTarget(json.targetGrid ?? emptyGrid());
        setCurrent(json.currentGrid ?? emptyGrid());

        setGraphError(null);

        // Animate progress bar towards the latest value.
        setProgressPctAnim(0);
        window.setTimeout(() => {
          if (!cancelled) setProgressPctAnim(pct);
        }, 60);
      } catch (e) {
        if (cancelled) return;

        setGraphError(e instanceof Error ? e.message : "Unable to load dashboard");
        setTarget(emptyGrid());
        setCurrent(emptyGrid());
        setUsername("");
        setActiveDesignName("");
        setCompletionPct(0);
        setStreakDays(0);
        setDaysRemaining(null);
        setTodayTarget(null);
        setTodayActual(null);
        setUpcoming([]);
        setProgressPctAnim(0);
      }
    }

    load();
    const timer = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const dueTodayText = useMemo(() => {
    if (todayTarget === null) return "";
    const remaining = todayActual !== null ? Math.max(0, todayTarget - todayActual) : todayTarget;
    if (remaining <= 0) return "You’re done for today.";
    return remaining === 1 ? "You have 1 commit due today." : `You have ${remaining} commits due today.`;
  }, [todayActual, todayTarget]);

  const badges = useMemo(() => {
    const items: string[] = [];
    if (streakDays > 0) items.push(`🔥 ${streakDays} day streak`);
    if (activeDesignName) items.push("🎨 Active design");
    if (!hasGithub) items.push("⚠️ GitHub not connected");
    return items;
  }, [activeDesignName, hasGithub, streakDays]);

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
              {welcomeName ? `Welcome back, ${welcomeName}.` : "Welcome back."}
              {dueTodayText ? ` ${dueTodayText}` : ""}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {badges.length ? badges.map((b) => <Badge key={b}>{b}</Badge>) : <Badge>Loading…</Badge>}
            </div>
          </div>
          <div style={{ paddingTop: 2 }}>
            <Tag>{tagText}</Tag>
          </div>
        </header>

        {showUpgradeBanner ? (
          <div
            className="mt-4"
            style={{
              background: theme.accentBg,
              border: `1px solid ${theme.accentBorder}`,
              color: theme.accent,
              borderRadius: theme.borderRadius,
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "var(--pp-font-head)",
            }}
          >
            🎉 Welcome to PixelPush Pro! Your features are now active.
          </div>
        ) : null}

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StatCard
            label="Current Streak"
            icon={<Flame size={22} />}
            value={streakDays ? `${streakDays} day${streakDays === 1 ? "" : "s"}` : "—"}
            subtitle={activeDesignName ? "Based on scheduled days" : "No active design"}
          />
          <StatCard
            label="Design Progress"
            icon={<Target size={22} />}
            value={activeDesignName ? `${completionPct}%` : "—"}
            subtitle={
              activeDesignName
                ? daysRemaining !== null
                  ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
                  : "On track"
                : "Start a design to track progress"
            }
          />
          <StatCard
            label="Today's Target"
            icon={<Zap size={22} />}
            value={todayTarget !== null && todayActual !== null ? `${todayActual}/${todayTarget}` : "—"}
            subtitle={
              todayTarget !== null && todayActual !== null
                ? (() => {
                    const rem = Math.max(0, todayTarget - todayActual);
                    return rem === 1 ? "1 commit needed" : `${rem} commits needed`;
                  })()
                : "No task due today"
            }
          />
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
                <div style={{ fontSize: 12, color: theme.accent, fontWeight: 700 }}>{completionPct}%</div>
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
                    width: `${progressPctAnim}%`,
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
              {todayTarget !== null
                ? `${todayTarget} commit${todayTarget === 1 ? "" : "s"}`
                : "—"}
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
                {todayTarget !== null && todayActual !== null && todayActual >= todayTarget ? (
                  <Check aria-hidden size={18} color={theme.onAccent} />
                ) : (
                  <Circle aria-hidden size={18} color={theme.onAccent} />
                )}
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
              {(upcoming.length ? upcoming.slice(0, 4) : [{ when: "—", commits: "—" }]).map((row) => (
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
