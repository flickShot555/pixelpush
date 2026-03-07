"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useTheme } from "@/lib/theme";

// TODO: replace with real API data
const TARGET_COMMITS: Record<number, number> = {
  3: 2,
  5: 3,
  8: 1,
  10: 4,
  12: 2,
  14: 3,
  17: 2,
  19: 1,
  21: 3,
  24: 4,
  26: 2,
};

// TODO: replace with real API data
const COMPLETED_COMMITS: Record<number, number> = {
  3: 2,
  5: 3,
  8: 1,
};

// TODO: use real date
const TODAY = 10;

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

function formatDate(day: number) {
  return `Mar ${day}, 2025`;
}

export function ScheduleClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const view: ViewMode = searchParams.get("view") === "list" ? "list" : "calendar";

  useEffect(() => {
    const raw = searchParams.get("view");
    if (raw !== "calendar" && raw !== "list") {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", "calendar");
      router.replace(`/schedule?${next.toString()}`);
    }
  }, [router, searchParams]);

  function setViewAndUrl(nextView: ViewMode) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", nextView);
    router.replace(`/schedule?${next.toString()}`);
  }

  const listRows: ListRow[] = useMemo(
    () => [
      { date: "Mar 3, 2025", target: "2", actual: "2", status: "completed" },
      { date: "Mar 5, 2025", target: "3", actual: "3", status: "completed" },
      { date: "Mar 8, 2025", target: "1", actual: "1", status: "completed" },
      { date: "Mar 10, 2025", target: "4", actual: "1", status: "in-progress" },
      { date: "Mar 12, 2025", target: "2", actual: "0", status: "pending" },
      { date: "Mar 14, 2025", target: "3", actual: "0", status: "pending" },
      { date: "Mar 17, 2025", target: "2", actual: "0", status: "pending" },
    ],
    []
  );

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
              Your commit plan for Midnight Cat · 68 days remaining
            </p>
          </div>

          <div style={{ paddingTop: 2 }}>
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
              <div className="flex items-center justify-between gap-4">
                <div
                  style={{
                    color: theme.text,
                    fontFamily: "var(--pp-font-head)",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  March 2025
                </div>

                <div className="flex gap-2">
                  <Btn
                    variant="secondary"
                    small
                    onClick={() => {
                      console.log("Prev month");
                    }}
                  >
                    ← Prev
                  </Btn>
                  <Btn
                    variant="secondary"
                    small
                    onClick={() => {
                      console.log("Next month");
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`off-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1;
                  const isTarget = TARGET_COMMITS[day] != null;
                  const isCompleted = COMPLETED_COMMITS[day] != null;
                  const isToday = day === TODAY;
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
                    ? "1/3"
                    : isCompleted
                      ? "check"
                      : isPendingTarget
                        ? `${TARGET_COMMITS[day]}c`
                        : null;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isTarget}
                      onClick={() => {
                        if (!isTarget) return;
                        console.log(`Clicked ${formatDate(day)}`);
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
