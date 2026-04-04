"use client";

import { useEffect, useMemo, useState } from "react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { PublicNav } from "@/components/ui/PublicNav";
import { Tag } from "@/components/ui/Tag";
import { useTheme } from "@/lib/theme";

function genTarget(): number[][] {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 52 }, () => 0));
  const cx = 25;

  // Background fill (face)
  for (let r = 1; r < 6; r++) {
    for (let c = cx - 12; c <= cx + 12; c++) {
      if (c >= 0 && c < 52) grid[r][c] = 1;
    }
  }

  // Ears
  for (let c = cx - 10; c <= cx - 7; c++) {
    if (c >= 0 && c < 52) grid[0][c] = 2;
  }
  for (let c = cx + 7; c <= cx + 10; c++) {
    if (c >= 0 && c < 52) grid[0][c] = 2;
  }

  // Eyes
  for (let c = cx - 6; c <= cx - 4; c++) {
    if (c >= 0 && c < 52) grid[2][c] = 4;
  }
  for (let c = cx + 4; c <= cx + 6; c++) {
    if (c >= 0 && c < 52) grid[2][c] = 4;
  }

  // Nose
  grid[3][cx] = 4;
  grid[3][cx - 1] = 3;
  grid[3][cx + 1] = 3;

  // Mouth
  grid[4][cx - 3] = 2;
  grid[4][cx - 2] = 3;
  grid[4][cx + 2] = 3;
  grid[4][cx + 3] = 2;

  // Whiskers
  for (let c = cx - 14; c <= cx - 9; c++) {
    if (c >= 0 && c < 52) grid[3][c] = 2;
  }
  for (let c = cx + 9; c <= cx + 14; c++) {
    if (c >= 0 && c < 52) grid[3][c] = 2;
  }

  return grid;
}

export function LandingScreen() {
  const { mode, theme } = useTheme();
  const target = useMemo(() => genTarget(), []);
  const [animStep, setAnimStep] = useState(0);

  const GRID_CELL = 10;
  const GRID_GAP = 2;

  useEffect(() => {
    const id = window.setInterval(() => {
      setAnimStep((s) => (s + 1) % 53);
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  const animData = useMemo(() => {
    return target.map((row) =>
      row.map((level, colIndex) => (colIndex < animStep ? level : 0))
    );
  }, [animStep, target]);

  const colors = [theme.g0, theme.g1, theme.g2, theme.g3, theme.g4];

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "var(--pp-font-body)" }}>
      <PublicNav
        fixed
        rightSlot={
          <>
            <Btn variant="ghost" small href="/pricing">
              Pricing
            </Btn>
            <Btn variant="secondary" small href="/login">
              Log in
            </Btn>
            <Btn small href="/signup">
              Sign up
            </Btn>
          </>
        }
      />

      <div
        className="mx-auto px-6 md:px-12"
        style={{ maxWidth: 900, paddingTop: 140, paddingBottom: 60, textAlign: "center" }}
      >
        <span
          style={{
            display: "inline-block",
            background: theme.accentBg,
            color: theme.accent,
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--pp-font-body)",
            letterSpacing: "0.05em",
            border: `1px solid ${theme.accentBorder}`,
          }}
        >
          Now in Beta · Free to Start
        </span>

        <h1
          style={{
            fontFamily: "var(--pp-font-head)",
            fontSize: mode === "dev" ? 48 : 56,
            fontWeight: 800,
            color: theme.text,
            margin: "20px 0 16px",
            lineHeight: 1.1,
            letterSpacing: mode === "dev" ? "-0.03em" : "-0.02em",
          }}
        >
          Turn Your GitHub Graph
          <br />
          <span style={{ color: theme.accent }}>Into Pixel Art</span>
        </h1>

        <p
          style={{
            color: theme.muted,
            fontSize: 18,
            maxWidth: 520,
            margin: "0 auto 36px",
            lineHeight: 1.6,
            fontFamily: "var(--pp-font-body)",
          }}
        >
          PixelPush is a web app that transforms your GitHub contribution graph into pixel art — then generates a day-by-day commit schedule so you can recreate it for real.
        </p>

        <div className="flex justify-center gap-3" style={{ marginBottom: 64 }}>
          <Btn href="/signup" style={{ padding: "12px 32px", fontSize: 15 }}>
            Get Started →
          </Btn>
          <Btn
            variant="secondary"
            href="/design"
            style={{ padding: "12px 32px", fontSize: 15 }}
          >
            View Demo
          </Btn>
        </div>

        <div style={{ color: theme.faint, fontSize: 13, lineHeight: 1.6 }}>
          Developed by <span style={{ color: theme.text, fontWeight: 800 }}>Aepostrophee</span>
        </div>

        <Card
          radius="lg"
          elevated
          style={{
            display: "inline-block",
            width: "103%",
            maxWidth: "103%",
            padding: "28px 32px",
            textAlign: "left",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 16, gap: 16 }}>
            <span
              style={{
                fontFamily: "var(--pp-font-head)",
                fontSize: 12,
                color: theme.muted,
              }}
            >
              flickShot555&apos;s contribution graph
            </span>
            <Tag>Drawing: Midnight Cat</Tag>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                display: "inline-grid",
                gridTemplateColumns: `repeat(52, ${GRID_CELL}px)`,
                gridTemplateRows: `repeat(7, ${GRID_CELL}px)`,
                gap: GRID_GAP,
              }}
            >
              {animData.flatMap((row, rowIndex) =>
                row.map((level, colIndex) => (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    style={{
                      width: GRID_CELL,
                      height: GRID_CELL,
                      background: colors[level] ?? colors[0],
                      borderRadius: theme.borderRadiusSm,
                      transition: "background 0.3s",
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ marginTop: 12 }}>
            <span
              style={{
                fontSize: 11,
                color: theme.muted,
                fontFamily: "var(--pp-font-head)",
              }}
            >
              Less
            </span>
            {colors.map((c, i) => (
              <div
                key={i}
                style={{
                  width: GRID_CELL,
                  height: GRID_CELL,
                  background: c,
                  borderRadius: theme.borderRadiusSm,
                }}
              />
            ))}
            <span
              style={{
                fontSize: 11,
                color: theme.muted,
                fontFamily: "var(--pp-font-head)",
              }}
            >
              More
            </span>
          </div>
        </Card>
      </div>

      <div className="mx-auto px-6 md:px-12" style={{ maxWidth: 900, paddingBottom: 80 }}>
        <h2
          style={{
            fontFamily: "var(--pp-font-head)",
            fontWeight: 700,
            fontSize: 28,
            color: theme.text,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          How It Works
        </h2>

        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            {
              n: "01",
              title: "Connect GitHub",
              desc: "Verify via GitHub OAuth. We use contribution metadata (dates/counts/colors) to power your design and schedule.",
            },
            {
              n: "02",
              title: "Pick Your Art",
              desc: "Choose a theme and select from multiple generated pixel art designs that fit the 52×7 graph resolution.",
            },
            {
              n: "03",
              title: "Follow the Schedule",
              desc: "Get a day-by-day commit plan and track progress as your graph fills in toward the target design.",
            },
          ].map((step) => (
            <Card key={step.n} style={{ padding: 20 }}>
              <div
                style={{
                  fontFamily: "var(--pp-font-head)",
                  fontSize: 32,
                  fontWeight: 800,
                  color: theme.accent,
                  marginBottom: 12,
                }}
              >
                {step.n}
              </div>
              <div
                style={{
                  fontFamily: "var(--pp-font-head)",
                  fontWeight: 700,
                  fontSize: 16,
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  color: theme.muted,
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: "var(--pp-font-body)",
                }}
              >
                {step.desc}
              </div>
            </Card>
          ))}
        </div>

        <div style={{ marginTop: 48 }}>
          <h2
            style={{
              fontFamily: "var(--pp-font-head)",
              fontWeight: 700,
              fontSize: 28,
              color: theme.text,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            {"Who It\u2019s For"}
          </h2>
          <div style={{ color: theme.muted, textAlign: "center", maxWidth: 640, margin: "0 auto 26px", lineHeight: 1.6 }}>
            Built for developers who want a creative, guided way to shape their GitHub profile — without manual planning.
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { title: "Working developers", desc: "Turn consistent contribution history into art and keep momentum." },
              { title: "Open source builders", desc: "Make your profile distinctive while staying focused on real work." },
              { title: "Students & creators", desc: "A fun visual goal that encourages steady progress and sharing." },
            ].map((item) => (
              <Card key={item.title} style={{ padding: 20 }}>
                <div
                  style={{
                    fontFamily: "var(--pp-font-head)",
                    fontWeight: 800,
                    fontSize: 16,
                    color: theme.text,
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </div>
                <div style={{ color: theme.muted, fontSize: 14, lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <footer
        style={{
          borderTop: `1px solid ${theme.border}`,
          background: theme.bg,
          padding: "44px 0",
        }}
      >
        <div className="mx-auto px-6 md:px-12" style={{ maxWidth: 900 }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between" style={{ gap: 18 }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--pp-font-head)",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "-0.02em",
                  color: theme.text,
                }}
              >
                PixelPush
              </div>
              <div style={{ color: theme.muted, marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
                Turn your GitHub graph into art. Developed by Aepostrophee.
              </div>
            </div>

            <div className="flex items-center" style={{ gap: 10, flexWrap: "wrap" }}>
              <Btn variant="ghost" small href="/pricing">
                Pricing
              </Btn>
              <Btn variant="secondary" small href="/login">
                Log in
              </Btn>
              <Btn small href="/signup">
                Sign up
              </Btn>

              <a
                href="/terms"
                style={{
                  color: theme.muted,
                  fontSize: 13,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                }}
              >
                Terms
              </a>
              <a
                href="/privacy"
                style={{
                  color: theme.muted,
                  fontSize: 13,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                }}
              >
                Privacy
              </a>
              <a
                href="/refund"
                style={{
                  color: theme.muted,
                  fontSize: 13,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
                }}
              >
                Refund
              </a>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              color: theme.faint,
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>© {new Date().getFullYear()} PixelPush</span>
            <span>Confidential product build · v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
