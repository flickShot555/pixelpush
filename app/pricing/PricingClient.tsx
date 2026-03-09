"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { PublicNav } from "@/components/ui/PublicNav";
import type { Theme } from "@/lib/theme";
import { useTheme } from "@/lib/theme";

type PlanCardProps = {
  name: string;
  price: string;
  period: string;
  description: string;
  ctaLabel: string;
  onCtaClick: () => void;
  ctaDisabled?: boolean;
  highlighted?: boolean;
  special?: boolean;
  t: Theme;
};

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace(/^#/, "");

  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function PlanCard({
  name,
  price,
  period,
  description,
  ctaLabel,
  onCtaClick,
  ctaDisabled = false,
  highlighted = false,
  special = false,
  t,
}: PlanCardProps) {
  const labelColor = highlighted ? t.onAccent : t.muted;
  const priceColor = highlighted ? t.onAccent : t.text;
  const periodColor = highlighted ? t.onAccent : t.muted;
  const descColor = highlighted ? t.onAccent : t.muted;

  const outerStyle: CSSProperties = highlighted
    ? {
        background: t.accent,
        border: `2px solid ${t.accent}`,
        borderRadius: t.borderRadiusLg,
        padding: "28px 24px",
        boxShadow: t.shadowMd,
      }
    : {
        background: t.surface,
        border: `2px solid ${special ? t.accentBorder : t.border}`,
        borderRadius: t.borderRadiusLg,
        padding: "28px 24px",
        position: special ? "relative" : undefined,
      };

  const ctaBaseStyle: CSSProperties = highlighted
    ? {
        width: "100%",
        background: t.onAccent,
        color: t.accent,
        border: "none",
        borderRadius: t.borderRadius,
        padding: "10px",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "var(--pp-font-body)",
      }
    : {
        width: "100%",
        background: t.accent,
        color: t.onAccent,
        border: "none",
        borderRadius: t.borderRadius,
        padding: "10px",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "var(--pp-font-body)",
      };

  const labelStyle: CSSProperties = {
    color: labelColor,
    opacity: highlighted ? 0.8 : 1,
    textTransform: "uppercase",
    fontSize: 14,
    fontFamily: "var(--pp-font-head)",
    fontWeight: 700,
    letterSpacing: "0.06em",
    marginBottom: 4,
  };

  const priceStyle: CSSProperties = {
    color: priceColor,
    fontFamily: "var(--pp-font-head)",
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1,
  };

  const periodStyle: CSSProperties = {
    color: periodColor,
    opacity: highlighted ? 0.7 : 1,
    fontSize: 13,
    fontFamily: "var(--pp-font-body)",
    marginBottom: 16,
  };

  const descStyle: CSSProperties = {
    color: descColor,
    opacity: highlighted ? 0.8 : 1,
    fontSize: 13,
    fontFamily: "var(--pp-font-body)",
    lineHeight: 1.5,
    marginBottom: 20,
  };

  const [ctaHovered, setCtaHovered] = useState(false);

  return (
    <div style={outerStyle}>
      {special ? (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: t.warn,
            color: t.onAccent,
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 12px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            fontFamily: "var(--pp-font-body)",
          }}
        >
          LIMITED SPOTS
        </div>
      ) : null}

      <div style={labelStyle}>{name}</div>
      <div style={priceStyle}>{price}</div>
      <div style={periodStyle}>{period}</div>
      <div style={descStyle}>{description}</div>

      <div
        className="w-full"
        onMouseEnter={() => setCtaHovered(true)}
        onMouseLeave={() => setCtaHovered(false)}
      >
        <Btn
          disabled={ctaDisabled}
          onClick={() => {
            if (ctaDisabled) return;
            onCtaClick();
          }}
          style={{
            ...ctaBaseStyle,
            opacity: ctaDisabled ? 0.6 : ctaHovered ? 0.9 : 1,
            transition: "all 0.2s",
          }}
          className="w-full"
        >
          {ctaLabel}
        </Btn>
      </div>
    </div>
  );
}

export function PricingClient() {
  const { theme } = useTheme();
  const router = useRouter();

  const features = useMemo(
    () =>
      [
        ["Image suggestions per theme", "5", "8", "8"],
        ["Active designs", "1", "3", "3"],
        ["Themes available", "3", "All", "All"],
        ["Schedule recalculation", "1×", "Unlimited", "Unlimited"],
        ["AI project suggestions", "—", "✓", "✓"],
        ["Portfolio fit scores", "—", "✓", "✓"],
        ["Custom image upload", "—", "✓", "✓"],
        ["Org / team graphs", "—", "✓", "✓"],
        ["Watermark-free sharing", "—", "✓", "✓"],
        ["Timelapse GIF", "—", "✓", "✓"],
        ["Priority support", "—", "✓", "✓"],
      ] as const,
    []
  );

  const proTint = useMemo(() => hexToRgba(theme.accentBg, 0.5), [theme.accentBg]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
      }}
    >
      <PublicNav />

      <div className="mx-auto w-full px-6" style={{ maxWidth: 900, paddingTop: 48, paddingBottom: 64 }}>
        <header style={{ textAlign: "center", marginBottom: 48 }}>
          <h1
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 36,
              fontWeight: 800,
              marginBottom: 12,
            }}
          >
            Simple Pricing
          </h1>
          <div
            style={{
              color: theme.muted,
              fontSize: 16,
              fontFamily: "var(--pp-font-body)",
            }}
          >
            Start free. Upgrade when you&apos;re ready.
          </div>
        </header>

        <section
          className="mx-auto grid gap-4"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            maxWidth: 900,
            marginBottom: 40,
          }}
        >
          <PlanCard
            t={theme}
            name="FREE"
            price="$0"
            period="forever"
            description="For developers just getting started"
            ctaLabel="Get Started"
            onCtaClick={() => {
              router.push("/onboarding");
            }}
          />

          <PlanCard
            t={theme}
            name="PRO"
            price="$7"
            period="per month"
            description="For developers who are serious about their graph art"
            ctaLabel="Coming Soon"
            ctaDisabled
            highlighted
            onCtaClick={() => {
              // TODO: wire to Stripe checkout in Milestone monetization
              router.push("/onboarding");
            }}
          />

          <PlanCard
            t={theme}
            name="LIFETIME"
            price="$35"
            period="one-time"
            description="Pay once, keep Pro forever. Limited spots."
            ctaLabel="Coming Soon"
            ctaDisabled
            special
            onCtaClick={() => {
              // TODO: wire to Stripe checkout in Milestone monetization
              router.push("/onboarding");
            }}
          />
        </section>

        <Card
          style={{
            padding: 0,
            overflow: "hidden",
            maxWidth: 900,
            margin: "0 auto",
          }}
          className="w-full"
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            {[
              { label: "Feature", align: "left", color: theme.text, background: theme.surface },
              { label: "Free", align: "center", color: theme.muted, background: theme.surface },
              { label: "Pro", align: "center", color: theme.accent, background: theme.accentBg },
              { label: "Lifetime", align: "center", color: theme.muted, background: theme.surface },
            ].map((h) => (
              <div
                key={h.label}
                style={{
                  padding: "12px 20px",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--pp-font-body)",
                  textAlign: h.align as "left" | "center",
                  color: h.color,
                  background: h.background,
                }}
              >
                {h.label}
              </div>
            ))}
          </div>

          {features.map((row, rowIndex) => {
            const isOdd = rowIndex % 2 === 1;
            const rowBackground = isOdd ? theme.surface2 : "transparent";

            return (
              <div
                key={row[0]}
                className="grid"
                style={{
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  borderBottom: `1px solid ${theme.border2}`,
                  background: rowBackground,
                }}
              >
                {row.map((cell, cellIndex) => {
                  const isFeature = cellIndex === 0;
                  const isProCol = cellIndex === 2;
                  const isDash = cell === "—";
                  const isCheck = cell === "✓";

                  const color = isDash
                    ? theme.faint
                    : isCheck
                      ? theme.accent
                      : theme.text;

                  const fontWeight = isCheck ? 700 : undefined;

                  return (
                    <div
                      key={`${row[0]}-${cellIndex}`}
                      style={{
                        padding: "10px 20px",
                        fontSize: 13,
                        fontFamily: "var(--pp-font-body)",
                        textAlign: isFeature ? "left" : "center",
                        color,
                        fontWeight,
                        background: isProCol ? proTint : undefined,
                      }}
                    >
                      {cell}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      </div>
    </main>
  );
}
