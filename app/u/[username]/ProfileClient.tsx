"use client";

import { useRouter } from "next/navigation";

import { Btn } from "@/components/ui/Btn";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PixelGrid } from "@/components/ui/PixelGrid";
import { PublicNav } from "@/components/ui/PublicNav";
import { Tag } from "@/components/ui/Tag";
import type { GraphGrid } from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";
import { ScheduleCompletedDaysStreakBadge } from "@/components/streaks/ScheduleCompletedDaysStreakBadge";
import { GitHubCommitStreakBadge } from "@/components/streaks/GitHubCommitStreakBadge";

type CompletedDesignCardProps = {
  name: string;
  completedLabel: string;
  artData: GraphGrid;
};

function CompletedDesignCard({ name, completedLabel, artData }: CompletedDesignCardProps) {
  const { theme } = useTheme();

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ overflowX: "auto", marginBottom: 12 }}>
        <PixelGrid data={artData} cellSize={8} gap={1} t={theme} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 3,
            }}
          >
            {name}
          </div>
          <div style={{ color: theme.muted, fontSize: 11, fontFamily: "var(--pp-font-body)" }}>{completedLabel}</div>
        </div>
        <Badge>✓ Done</Badge>
      </div>
    </Card>
  );
}

export type GitHubProfileBits = {
  login: string;
  avatarUrl: string;
  sinceLabel: string;
  streakDays: number;
};

export type PublicProfileData = {
  username: string;
  avatarUrl?: string | null;
  sinceLabel: string;
  activeDesign?: {
    name: string;
    progressPct: number;
    artData: GraphGrid;
  } | null;
  completedCount: number;
  completedDesigns: Array<{ name: string; completedLabel: string; artData: GraphGrid }>;
};

export function ProfileClient({ profile }: { profile: PublicProfileData }) {
  const { theme } = useTheme();
  const router = useRouter();

  const username = profile.username;
  const avatarUrl = profile.avatarUrl ?? undefined;
  const sinceLabel = profile.sinceLabel;
  const avatarLetter = (username || "F").slice(0, 1).toUpperCase();
  const activeDesign = profile.activeDesign ?? null;

  return (
    <main
      className="w-full"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
      }}
    >
      <PublicNav
        rightSlot={
          <Btn small onClick={() => router.push("/onboarding")}>
            Create Yours →
          </Btn>
        }
      />

      <div className="mx-auto w-full" style={{ maxWidth: 800, padding: "48px 24px" }}>
        <section className="flex items-center" style={{ gap: 20, marginBottom: 40 }}>
          <div
            aria-hidden
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${theme.g2}, ${theme.g4})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              color: theme.onAccent,
              fontFamily: "var(--pp-font-head)",
              fontWeight: 700,
              fontSize: 25,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                width={72}
                height={72}
                style={{ width: 72, height: 72, objectFit: "cover" }}
              />
            ) : (
              avatarLetter
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: theme.text,
                fontFamily: "var(--pp-font-head)",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              {username}
            </div>

            <div style={{ marginTop: 4, color: theme.muted, fontSize: 14, fontFamily: "var(--pp-font-body)" }}>
              On PixelPush since {sinceLabel} · {profile.completedCount} design completed
            </div>

            <div className="mt-2 flex flex-wrap" style={{ gap: 8 }}>
              <ScheduleCompletedDaysStreakBadge username={username} />
              <GitHubCommitStreakBadge username={username} />
              {activeDesign ? <Badge>🎨 Active design</Badge> : null}
            </div>
          </div>
        </section>

        {activeDesign ? (
          <section style={{ marginBottom: 28 }}>
            <Card style={{ padding: "24px 28px" }}>
              <div
                className="flex items-center justify-between"
                style={{
                  marginBottom: 16,
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      color: theme.muted,
                      textTransform: "uppercase",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      fontFamily: "var(--pp-font-body)",
                      marginBottom: 4,
                    }}
                  >
                    ACTIVE DESIGN
                  </div>
                  <div
                    style={{
                      color: theme.text,
                      fontFamily: "var(--pp-font-head)",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {activeDesign.name}
                  </div>
                </div>

                <Tag>{activeDesign.progressPct}% complete</Tag>
              </div>

              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <PixelGrid data={activeDesign.artData} cellSize={11} gap={2} t={theme} />
              </div>

              <div
                aria-hidden
                style={{
                  height: 6,
                  background: theme.surface2,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${activeDesign.progressPct}%`,
                    background: theme.accent,
                    borderRadius: 99,
                  }}
                />
              </div>
            </Card>
          </section>
        ) : null}

        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Completed Designs
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {profile.completedDesigns.map((d) => (
              <CompletedDesignCard
                key={d.name}
                name={d.name}
                completedLabel={d.completedLabel}
                artData={d.artData}
              />
            ))}
          </div>
        </section>

        <section
          className="w-full text-center"
          style={{
            padding: "48px 24px",
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.borderRadiusLg,
          }}
        >
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 24,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            Want to draw on your GitHub graph?
          </div>
          <div
            style={{
              color: theme.muted,
              fontFamily: "var(--pp-font-body)",
              marginBottom: 24,
            }}
          >
            Join hundreds of developers turning contributions into art.
          </div>

          <Btn onClick={() => router.push("/onboarding")} style={{ padding: "12px 36px", fontSize: 15 }}>
            Create Yours — It&apos;s Free →
          </Btn>
        </section>
      </div>
    </main>
  );
}
