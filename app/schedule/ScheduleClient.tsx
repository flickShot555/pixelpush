"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useSession } from "next-auth/react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useTheme } from "@/lib/theme";
import { isPro as isProPlan } from "@/lib/check-plan";

type ViewMode = "calendar" | "list";

type RowStatus = "completed" | "in-progress" | "pending";

type ListRow = {
  date: string;
  target: string;
  actual: string;
  status: RowStatus;
};

function getStatusStyle(status: RowStatus, t: ReturnType<typeof useTheme>["theme"]): React.CSSProperties {
  if (status === "completed") {
    return {
      background: t.accentBg,
      color: t.accent,
    };
  }

  if (status === "in-progress") {
    return {
      background: `color-mix(in srgb, ${t.warn} 20%, transparent)`,
      color: t.warn,
    };
  }

  return {
    background: t.surface2,
    color: t.muted,
  };
}

type ApiDesign = {
  id: string;
  name: string;
  theme: string;
  startedAt: string;
  targetEndAt: string | null;
};

type ApiEntry = {
  date: string;
  targetCount: number;
  actualCount: number;
  status: "pending" | "completed" | "missed" | "skipped";
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMonthParamUtc(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

function parseMonthParam(month: string) {
  const m = /^([0-9]{4})-([0-9]{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function addMonths(year: number, monthIndex: number, delta: number) {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() };
}

function monthLabel(year: number, monthIndex: number) {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

function formatDayUtc(dateIso: string) {
  const d = new Date(dateIso);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d);
}

function daysRemaining(targetEndAt: string | null, now: Date) {
  if (!targetEndAt) return null;
  const end = new Date(targetEndAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((end.getTime() - now.getTime()) / msPerDay);
  return Math.max(0, diff);
}

export function ScheduleClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { data: session } = useSession();
  const plan = (session?.user as unknown as { plan?: string } | undefined)?.plan ?? "FREE";
  const isPro = isProPlan({ plan });

  const view: ViewMode = searchParams.get("view") === "list" ? "list" : "calendar";

  const rawMonth = searchParams.get("month");
  const monthParam = rawMonth && parseMonthParam(rawMonth) ? rawMonth : null;

  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [design, setDesign] = useState<ApiDesign | null>(null);
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const rawView = searchParams.get("view");
    const rawMonthNow = searchParams.get("month");
    const hasValidMonth = rawMonthNow != null && parseMonthParam(rawMonthNow) != null;

    if (rawView !== "calendar" && rawView !== "list") {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", "calendar");
      if (!hasValidMonth) next.set("month", toMonthParamUtc(new Date()));
      router.replace(`/schedule?${next.toString()}`);
      return;
    }

    if (!hasValidMonth) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("month", toMonthParamUtc(new Date()));
      router.replace(`/schedule?${next.toString()}`);
    }
  }, [router, searchParams]);

  function setViewAndUrl(nextView: ViewMode) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", nextView);
    router.replace(`/schedule?${next.toString()}`);
  }

  function setMonthAndUrl(nextMonth: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", nextMonth);
    router.replace(`/schedule?${next.toString()}`);
  }

  useEffect(() => {
    const month = monthParam;
    if (!month) return;
    let cancelled = false;

    async function run(m: string) {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/schedule?month=${encodeURIComponent(m)}`, { method: "GET" });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string; design?: ApiDesign | null; entries?: ApiEntry[] }
          | null;

        if (!res.ok || !json?.ok) {
          if (cancelled) return;
          setError(json?.error || "Unable to load schedule");
          setDesign(null);
          setEntries([]);
          setBusy(false);
          return;
        }

        if (cancelled) return;
        setDesign(json.design ?? null);
        setEntries(json.entries ?? []);
        setBusy(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unable to load schedule");
        setDesign(null);
        setEntries([]);
        setBusy(false);
      }
    }

    run(month);
    return () => {
      cancelled = true;
    };
  }, [monthParam, refreshToken]);

  const listRows: ListRow[] = useMemo(() => {
    const now = new Date();
    const nowKey = toMonthParamUtc(now);

    return entries
      .filter((e) => e.targetCount > 0)
      .map((e) => {
        const status: RowStatus =
          e.status === "completed"
            ? "completed"
            : toMonthParamUtc(new Date(e.date)) === nowKey && new Date(e.date).getUTCDate() === now.getUTCDate()
              ? "in-progress"
              : "pending";

        return {
          date: formatDayUtc(e.date),
          target: String(e.targetCount),
          actual: String(e.actualCount ?? 0),
          status,
        };
      });
  }, [entries]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthParts = monthParam ? parseMonthParam(monthParam) : null;
  const year = monthParts?.year ?? new Date().getUTCFullYear();
  const monthIndex = monthParts?.monthIndex ?? new Date().getUTCMonth();

  const startDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const now = new Date();
  const nowMonth = toMonthParamUtc(now);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, ApiEntry>();
    for (const e of entries) {
      const d = new Date(e.date);
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== monthIndex) continue;
      map.set(d.getUTCDate(), e);
    }
    return map;
  }, [entries, monthIndex, year]);

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
          maxWidth: 1200,
          paddingTop: 28,
          paddingBottom: 28,
        }}
      >
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1
              style={{
                margin: 0,
                marginBottom: 4,
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              Schedule
            </h1>
            <p
              style={{
                margin: 0,
                color: theme.muted,
                fontSize: 14,
                fontFamily: "var(--pp-font-body)",
              }}
            >
              {design ? (
                (() => {
                  const remaining = daysRemaining(design.targetEndAt, now);
                  return remaining != null
                    ? `Your commit plan for ${design.name} · ${remaining} days remaining`
                    : `Your commit plan for ${design.name}`;
                })()
              ) : (
                "Your commit plan"
              )}
            </p>
          </div>

          <div className="flex items-center" style={{ paddingTop: 2, gap: 10 }}>
            {design && isPro ? (
              <Btn
                variant="secondary"
                small
                disabled={busy || recalculating}
                onClick={async () => {
                  if (recalculating) return;
                  setRecalculating(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/schedule/recalculate", { method: "POST" });
                    const json = (await res.json().catch(() => null)) as
                      | { ok?: boolean; error?: string }
                      | null;
                    if (!res.ok || !json?.ok) {
                      setError(json?.error || "Unable to recalculate schedule");
                      setRecalculating(false);
                      return;
                    }

                    const nowMonth = toMonthParamUtc(new Date());
                    setMonthAndUrl(nowMonth);
                    setRefreshToken((v) => v + 1);
                    setRecalculating(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to recalculate schedule");
                    setRecalculating(false);
                  }
                }}
              >
                {recalculating ? "Recalculating…" : "Recalculate from Today"}
              </Btn>
            ) : null}

            <ViewToggle
              options={["calendar", "list"]}
              value={view}
              onChange={(v) => setViewAndUrl(v as ViewMode)}
              t={theme}
            />
          </div>
        </header>

        {view === "calendar" ? (
          <section className="mt-6">
            <Card elevated style={{ padding: "24px 28px" }}>
              {error ? (
                <div style={{ marginBottom: 12, color: theme.danger, fontSize: 13, fontWeight: 700 }}>
                  {error}
                </div>
              ) : null}

              {!design && !busy && !error ? (
                <div className="flex items-center justify-between gap-4" style={{ marginBottom: 12 }}>
                  <div style={{ color: theme.muted, fontSize: 13, fontFamily: "var(--pp-font-body)" }}>
                    No active design. Generate a schedule to get started.
                  </div>
                  <Btn variant="secondary" small onClick={() => router.push("/design")}>
                    Choose Design
                  </Btn>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <div
                  style={{
                    color: theme.text,
                    fontFamily: "var(--pp-font-head)",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {monthLabel(year, monthIndex)}
                </div>

                <div className="flex gap-2">
                  <Btn
                    variant="secondary"
                    small
                    disabled={!monthParam}
                    onClick={() => {
                      if (!monthParam) return;
                      const parts = parseMonthParam(monthParam);
                      if (!parts) return;
                      const prev = addMonths(parts.year, parts.monthIndex, -1);
                      setMonthAndUrl(`${prev.year}-${pad2(prev.monthIndex + 1)}`);
                    }}
                  >
                    ← Prev
                  </Btn>
                  <Btn
                    variant="secondary"
                    small
                    disabled={!monthParam}
                    onClick={() => {
                      if (!monthParam) return;
                      const parts = parseMonthParam(monthParam);
                      if (!parts) return;
                      const nextM = addMonths(parts.year, parts.monthIndex, 1);
                      setMonthAndUrl(`${nextM.year}-${pad2(nextM.monthIndex + 1)}`);
                    }}
                  >
                    Next →
                  </Btn>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7">
                {dayLabels.map((d) => (
                  <div
                    key={d}
                    className="text-center"
                    style={{
                      padding: "4px 0",
                      fontSize: 11,
                      fontWeight: 600,
                      color: theme.muted,
                      fontFamily: "var(--pp-font-body)",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`off-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const entry = entriesByDay.get(day);
                  const isTarget = entry != null && entry.targetCount > 0;
                  const isCompleted = entry?.status === "completed";
                  const isToday = monthParam === nowMonth && day === now.getUTCDate();
                  const isPendingTarget = isTarget && !isCompleted && !isToday;
                  const isNonTarget = !isTarget;

                  const bg = isToday
                    ? theme.accent
                    : isCompleted
                      ? theme.accentBg
                      : "transparent";

                  const border = isToday
                    ? "1px solid transparent"
                    : isCompleted
                      ? `1px solid ${theme.accentBorder}`
                      : isPendingTarget
                        ? `1px solid ${theme.border}`
                        : "1px solid transparent";

                  const numberColor = isToday ? theme.onAccent : isNonTarget ? theme.muted : theme.text;

                  const subtitle = isToday
                    ? entry
                      ? `${entry.actualCount}/${entry.targetCount}`
                      : null
                    : isCompleted
                      ? "check"
                      : isPendingTarget
                        ? `${entry?.targetCount ?? 0}c`
                        : null;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isTarget}
                        onClick={async () => {
                          if (!isTarget) return;
                          if (!entry) return;
                          if (!monthParam) return;
                          if (syncing) return;

                          setError(null);
                          setSyncing(true);
                          try {
                            const res = await fetch("/api/schedule/sync", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ date: entry.date }),
                            });
                            const json = (await res.json().catch(() => null)) as
                              | { ok?: boolean; error?: string }
                              | null;

                            if (!res.ok || !json?.ok) {
                              setError(json?.error || "Unable to sync commits");
                              setSyncing(false);
                              return;
                            }

                            setRefreshToken((v) => v + 1);
                            setSyncing(false);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Unable to sync commits");
                            setSyncing(false);
                          }
                        }}
                      className="aspect-square"
                      style={{
                        background: bg,
                        border,
                        borderRadius: theme.borderRadius,
                        cursor: isTarget ? "pointer" : "default",
                        transition: "all 0.15s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingTop: 2,
                        paddingBottom: 2,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isToday ? 700 : 600,
                          color: numberColor,
                          fontFamily: "var(--pp-font-body)",
                          lineHeight: 1.1,
                        }}
                      >
                        {day}
                      </div>

                      {subtitle && (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 9,
                            fontFamily: "var(--pp-font-body)",
                            lineHeight: 1,
                            color: isToday
                              ? `color-mix(in srgb, ${theme.onAccent} 80%, transparent)`
                              : isCompleted
                                ? theme.accent
                                : theme.muted,
                          }}
                        >
                          {isCompleted ? (
                            <span style={{ display: "inline-flex", lineHeight: 0 }}>
                              <Check aria-hidden size={10} color={theme.accent} />
                            </span>
                          ) : (
                            subtitle
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                className="mt-4 flex flex-wrap"
                style={{
                  gap: 20,
                  paddingTop: 16,
                  borderTop: `1px solid ${theme.border}`,
                }}
              >
                {[
                  {
                    label: "Today",
                    swatch: {
                      background: theme.accent,
                      border: "1px solid transparent",
                    },
                  },
                  {
                    label: "Completed",
                    swatch: {
                      background: theme.accentBg,
                      border: `1px solid ${theme.accentBorder}`,
                    },
                  },
                  {
                    label: "Pending",
                    swatch: {
                      background: "transparent",
                      border: `1px solid ${theme.border}`,
                    },
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center" style={{ gap: 8 }}>
                    <div
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: theme.borderRadiusSm,
                        ...item.swatch,
                      }}
                    />
                    <div style={{ fontSize: 12, color: theme.muted, fontFamily: "var(--pp-font-body)" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        ) : (
          <section className="mt-6">
            <Card elevated style={{ padding: 0, overflow: "hidden" }}>
              {error ? (
                <div style={{ padding: "12px 20px", color: theme.danger, fontSize: 13, fontWeight: 700 }}>
                  {error}
                </div>
              ) : null}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                }}
              >
                {[
                  "Date",
                  "Target Commits",
                  "Actual Commits",
                  "Status",
                ].map((h) => (
                  <div
                    key={h}
                    style={{
                      padding: "12px 20px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: theme.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: `1px solid ${theme.border}`,
                      fontFamily: "var(--pp-font-body)",
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>

              {listRows.map((row, idx) => {
                const bg = idx % 2 === 0 ? theme.surface2 : theme.surface;
                const statusStyle = getStatusStyle(row.status, theme);

                return (
                  <div
                    key={row.date}
                    className="grid"
                    style={{
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      background: bg,
                    }}
                  >
                    <div style={{ padding: "12px 20px", fontSize: 13, color: theme.text, fontFamily: "var(--pp-font-body)" }}>
                      {row.date}
                    </div>
                    <div style={{ padding: "12px 20px", fontSize: 13, color: theme.text, fontFamily: "var(--pp-font-body)" }}>
                      {row.target}
                    </div>
                    <div style={{ padding: "12px 20px", fontSize: 13, color: theme.muted, fontFamily: "var(--pp-font-body)" }}>
                      {row.actual}
                    </div>
                    <div style={{ padding: "12px 20px" }}>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontFamily: "var(--pp-font-body)",
                          display: "inline-block",
                          ...statusStyle,
                        }}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
