"use client";

import { useParams, useRouter } from "next/navigation";

import { Btn } from "@/components/ui/Btn";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PixelGrid } from "@/components/ui/PixelGrid";
import { PublicNav } from "@/components/ui/PublicNav";
import { Tag } from "@/components/ui/Tag";
import { genMidnightCat, genMountainRange, genOceanWave, type GraphGrid } from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";

// TODO: replace with real data fetched by username from database
const MOCK_ACTIVE_DESIGN_NAME = "Midnight Cat";
// TODO: replace with real data fetched by username from database
const MOCK_PROGRESS_PCT = 34;
// TODO: replace with real data fetched by username from database
const MOCK_COMPLETED_COUNT = 1;
// TODO: replace with real data fetched by username from database
const MOCK_SINCE_LABEL = "Feb 2025";
// TODO: replace with real data fetched by username from database
const MOCK_STREAK_DAYS = 12;

// TODO: replace with real data fetched by username from database
const ACTIVE_DESIGN_ART: GraphGrid = genMidnightCat();
// TODO: replace with real data fetched by username from database
const COMPLETED_DESIGNS: Array<{ name: string; completedLabel: string; art: GraphGrid }> = [
  { name: "Mountain Range", completedLabel: "Completed · Jan 2025", art: genMountainRange() },
  { name: "Ocean Wave", completedLabel: "Completed · Dec 2024", art: genOceanWave() },
];

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

export function ProfileClient({ github }: { github?: GitHubProfileBits }) {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();

  const usernameParam = params?.username;
  const username = Array.isArray(usernameParam) ? usernameParam[0] : (usernameParam ?? "");
  const avatarUrl = github?.avatarUrl;
  const sinceLabel = github?.sinceLabel ?? MOCK_SINCE_LABEL;
  const streakDays = github?.streakDays ?? MOCK_STREAK_DAYS;
  const avatarLetter = (username || github?.login || "F").slice(0, 1).toUpperCase();

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
              Drawing on GitHub since {sinceLabel} · {MOCK_COMPLETED_COUNT} design completed
            </div>

            <div className="mt-2 flex flex-wrap" style={{ gap: 8 }}>
              <Badge>🔥 {streakDays} day streak</Badge>
              <Badge>🎨 Active design</Badge>
            </div>
          </div>
        </section>

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
                  {MOCK_ACTIVE_DESIGN_NAME}
                </div>
              </div>

              <Tag>{MOCK_PROGRESS_PCT}% complete</Tag>
            </div>

            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <PixelGrid data={ACTIVE_DESIGN_ART} cellSize={11} gap={2} t={theme} />
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
                  width: `${MOCK_PROGRESS_PCT}%`,
                  background: theme.accent,
                  borderRadius: 99,
                }}
              />
            </div>
          </Card>
        </section>

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
            {COMPLETED_DESIGNS.map((d) => (
              <CompletedDesignCard
                key={d.name}
                name={d.name}
                completedLabel={d.completedLabel}
                artData={d.art}
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
