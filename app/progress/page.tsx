"use client";

import { useMemo } from "react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { PixelGrid } from "@/components/ui/PixelGrid";
import { genGraph, genMidnightCat } from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";

// TODO: replace with real API data
const MOCK_SUBTITLE = "Midnight Cat · Started Feb 15 · Est. completion May 20";
// TODO: replace with real API data
const MOCK_STATS = {
  completion: "34%",
  currentStreak: "12 days 🔥",
  totalCommitsMade: "127",
  targetCommitsRemaining: "248",
  daysOnSchedule: "21 / 24",
  daysMissed: "3",
} as const;

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

  const target = useMemo(() => genMidnightCat(), []);
  const current = useMemo(() => genGraph(42), []);

  const milestones = useMemo<Milestone[]>(
    () => [
      { label: "Design Activated", date: "Feb 15", done: true },
      { label: "25% Complete", date: "Mar 2", done: true },
      { label: "50% Complete", date: "Mar 28", done: false },
      { label: "75% Complete", date: "Apr 22", done: false },
      { label: "Design Complete!", date: "May 20", done: false },
    ],
    []
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
            <div style={{ color: theme.muted, fontSize: 14 }}>{MOCK_SUBTITLE}</div>
          </div>

          <Btn
            onClick={() => {
              // TODO: implement share card generation
              console.log("Share Progress clicked");
            }}
          >
            Share Progress 🚀
          </Btn>
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
                <PixelGrid data={target} cellSize={12} gap={2} t={theme} fit />
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
                <PixelGrid data={current} cellSize={12} gap={2} t={theme} fit />
              </div>
            </div>
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
              value={MOCK_STATS.completion}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Current Streak"
              value={MOCK_STATS.currentStreak}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Total Commits Made"
              value={MOCK_STATS.totalCommitsMade}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Target Commits Remaining"
              value={MOCK_STATS.targetCommitsRemaining}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Days on Schedule"
              value={MOCK_STATS.daysOnSchedule}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
            <StatRow
              label="Days Missed"
              value={MOCK_STATS.daysMissed}
              borderColor={theme.border2}
              muted={theme.muted}
              text={theme.text}
            />
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
              onClick={() => {
                // TODO: implement share card generation
                console.log("Share Progress Card clicked");
              }}
              style={{ width: "100%" }}
            >
              Share Progress Card 🚀
            </Btn>
          </Card>
        </section>
      </div>
    </main>
  );
}
