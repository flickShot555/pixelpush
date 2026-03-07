"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { THEMES, type ThemeMode, useTheme } from "@/lib/theme";

type Mode = ThemeMode;

function hashStringToInt(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPreviewGrid(mode: Mode) {
  const rand = mulberry32(hashStringToInt(`pixelpush-preview-${mode}`));
  const weeks = 18;
  const days = 7;
  const grid: number[] = [];

  for (let w = 0; w < weeks; w += 1) {
    for (let d = 0; d < days; d += 1) {
      const r = rand();
      const v = r < 0.6 ? 0 : r < 0.8 ? 1 : r < 0.93 ? 2 : 3;
      grid.push(v);
    }
  }

  return { weeks, days, grid };
}

function MiniGraph({
  mode,
  cellW,
  cellH,
  gap,
}: {
  mode: Mode;
  cellW: number;
  cellH: number;
  gap: number;
}) {
  const preview = useMemo(() => buildPreviewGrid(mode), [mode]);
  const t = THEMES[mode];

  return (
    <div
      aria-hidden
      style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(${preview.weeks}, ${cellW}px)`,
        gridTemplateRows: `repeat(${preview.days}, ${cellH}px)`,
        gap,
      }}
    >
      {preview.grid.map((level, idx) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          style={{
            width: cellW,
            height: cellH,
            borderRadius: 3,
            background:
              level === 0
                ? t.g0
                : level === 1
                  ? t.g1
                  : level === 2
                    ? t.g2
                    : level === 3
                      ? t.g3
                      : t.g4,
          }}
        />
      ))}
    </div>
  );
}

function ModeCard({
  mode,
  selected,
  onPick,
}: {
  mode: Mode;
  selected: boolean;
  onPick: () => void;
}) {
  const { theme } = useTheme();
  const cardTheme = THEMES[mode];
  const isDev = mode === "dev";

  const SCALE = 0.78;
  const px = (n: number) => Math.round(n * SCALE);

  const outerBg = isDev
    ? `linear-gradient(180deg, ${cardTheme.bgDeep}, ${cardTheme.bg})`
    : cardTheme.surface;

  const outline = isDev
    ? `2px solid ${cardTheme.accentBorder}`
    : selected
      ? `2px solid ${cardTheme.accentBorder}`
      : `2px solid ${cardTheme.border}`;

  const outerShadow = isDev
    ? `${theme.shadowMd}, 0 0 0 ${px(8)}px color-mix(in srgb, ${cardTheme.accentBorder} 18%, transparent)`
    : theme.shadowMd;

  const cardPadX = px(42);
  const cardPadY = px(38);
  const graphCellW = px(22);
  const graphCellH = px(11);
  const graphGap = Math.max(2, px(4));

  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        textAlign: "left",
        width: "100%",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          padding: `${cardPadY}px ${cardPadX}px`,
          background: outerBg,
          border: outline,
          borderRadius: px(24),
          boxShadow: selected ? outerShadow : theme.shadowMd,
          transition: "transform 120ms ease, box-shadow 120ms ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isDev ? (
          <div style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <div
              style={{
                fontSize: px(22),
                letterSpacing: "0.18em",
                color: cardTheme.g4,
              }}
            >
              $ MODE --dev
            </div>
            <div
              style={{
                marginTop: px(22),
                fontSize: px(56),
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: cardTheme.text,
              }}
            >
              Dev Mode
            </div>
            <div
              style={{
                marginTop: px(18),
                fontSize: px(22),
                lineHeight: 1.55,
                color: cardTheme.muted,
                maxWidth: px(420),
              }}
            >
              Clean. Fast. Focused. Dark interface built for developers who want to get in and get
              things done.
            </div>

            <div style={{ marginTop: px(30) }}>
              <MiniGraph mode="dev" cellW={graphCellW} cellH={graphCellH} gap={graphGap} />
            </div>

            {selected && (
              <div
                style={{
                  marginTop: px(28),
                  fontSize: px(20),
                  color: cardTheme.g4,
                  display: "flex",
                  alignItems: "center",
                  gap: px(10),
                }}
              >
                <Check aria-hidden size={20} color={cardTheme.g4} />
                <span>Selected</span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div
              style={{
                fontFamily: "var(--font-syne)",
                fontSize: px(18),
                letterSpacing: "0.16em",
                color: cardTheme.accent,
              }}
            >
              CREATIVE STUDIO
            </div>
            <div
              style={{
                marginTop: px(18),
                fontFamily: "var(--font-syne)",
                fontSize: px(58),
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: cardTheme.text,
              }}
            >
              <span
                style={{
                  boxShadow: `inset 0 -0.30em 0 0 color-mix(in srgb, ${cardTheme.accent} 70%, transparent)` ,
                }}
              >
                Creative
              </span>{" "}
              Mode
            </div>
            <div
              style={{
                marginTop: px(18),
                fontFamily: "var(--font-dm-sans)",
                fontSize: px(22),
                lineHeight: 1.55,
                color: cardTheme.muted,
                maxWidth: px(460),
              }}
            >
              Expressive. Playful. Yours. A warmer, more visual experience for developers who love
              the art side.
            </div>

            <div style={{ marginTop: px(30) }}>
              <MiniGraph mode="creative" cellW={graphCellW} cellH={graphCellH} gap={graphGap} />
            </div>

            {selected && (
              <div
                style={{
                  marginTop: px(28),
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: px(20),
                  color: cardTheme.accent,
                  display: "flex",
                  alignItems: "center",
                  gap: px(10),
                }}
              >
                <Check aria-hidden size={20} color={cardTheme.accent} />
                <span>Selected</span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { mode, setMode, theme } = useTheme();

  function pick(mode: Mode) {
    try {
      localStorage.setItem("pixelpush-mode", mode);
    } catch {
      // ignore
    }
    setMode(mode);
    router.push("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `radial-gradient(1200px 540px at 50% 16%, color-mix(in srgb, var(--pp-accent) 14%, var(--pp-bgDeep) 86%), var(--pp-bgDeep))`,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "96px 24px 72px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1240 }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div
            aria-hidden
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              margin: "0 auto 22px",
              background: `linear-gradient(135deg, ${theme.g3}, ${theme.g4})`,
              boxShadow: `0 0 0 1px ${theme.accentBorder}, 0 10px 40px color-mix(in srgb, ${theme.accentBorder} 22%, transparent)`,
            }}
          />
          <div
            style={{
              fontFamily: "var(--pp-font-head)",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            Welcome to PixelPush
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 20,
              color: theme.muted,
              fontFamily: "var(--pp-font-body)",
            }}
          >
            Choose your experience. You can change this anytime.
          </div>
        </div>

        <div
          data-onboarding-grid
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 520px))",
            justifyContent: "center",
            gap: 28,
            alignItems: "stretch",
          }}
        >
          <ModeCard mode="dev" selected={mode === "dev"} onPick={() => pick("dev")} />
          <ModeCard
            mode="creative"
            selected={mode === "creative"}
            onPick={() => pick("creative")}
          />
        </div>

        <div
          style={{
            marginTop: 34,
            textAlign: "center",
            fontSize: 20,
            color: theme.muted,
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.06em",
          }}
        >
          Click a card to select and continue →
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          [data-onboarding-grid] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
