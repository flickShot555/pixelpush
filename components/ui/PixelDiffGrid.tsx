import React from "react";

import type { Theme } from "@/lib/theme";

type CSSVarStyle = React.CSSProperties & Record<`--${string}`, string | number>;

export type PixelDiffGridProps = {
  target: number[][]; // [7][52], values 0..4
  current: number[][]; // [7][52], values 0..4
  cellSize: number;
  gap: number;
  t: Theme;
  fit?: boolean;
};

function clampLevel(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 4) return 4;
  return Math.round(v);
}

function mix(fg: string, fgPct: number, bg: string): string {
  const pct = Math.max(0, Math.min(100, Math.round(fgPct)));
  return `color-mix(in srgb, ${fg} ${pct}%, ${bg})`;
}

export function PixelDiffGrid({ target, current, cellSize, gap, t, fit }: PixelDiffGridProps) {
  const gapPx = `${gap}px`;
  const maxCellPx = `${cellSize}px`;
  const cellVar = "var(--pp-pg-cell)";

  const style: CSSVarStyle = {
    display: fit ? "grid" : "inline-grid",
    width: fit ? "100%" : undefined,
    maxWidth: fit ? "100%" : undefined,
    justifyContent: fit ? "stretch" : undefined,
    gap,
    ...(fit
      ? {
          "--pp-pg-gap": gapPx,
          "--pp-pg-cell": `clamp(4px, calc((100% - (51 * var(--pp-pg-gap))) / 52), ${maxCellPx})`,
          gridTemplateColumns: `repeat(52, ${cellVar})`,
          gridTemplateRows: `repeat(7, ${cellVar})`,
        }
      : {
          gridTemplateColumns: `repeat(52, ${cellSize}px)`,
          gridTemplateRows: `repeat(7, ${cellSize}px)`,
        }),
  };

  function baseColor(level: number): string {
    const l = clampLevel(level);
    if (l <= 0) return t.g0;
    if (l === 1) return t.g1;
    if (l === 2) return t.g2;
    if (l === 3) return t.g3;
    return t.g4;
  }

  function diffColor(targetLevel: number, currentLevel: number): string {
    const tL = clampLevel(targetLevel);
    const cL = clampLevel(currentLevel);

    const diff = cL - tL;
    if (diff === 0) return baseColor(tL);

    // Missing intensity: highlight with warn. Extra intensity: highlight with danger.
    const magnitude = Math.min(4, Math.abs(diff));
    const pct = 55 + magnitude * 10; // 65..95

    if (diff < 0) {
      return mix(t.warn, pct, baseColor(tL));
    }
    return mix(t.danger, pct, baseColor(tL));
  }

  return (
    <div aria-hidden style={style}>
      {Array.from({ length: 7 }).flatMap((_, r) =>
        Array.from({ length: 52 }).map((__, c) => {
          const targetLevel = target?.[r]?.[c] ?? 0;
          const currentLevel = current?.[r]?.[c] ?? 0;
          return (
            <span
              key={`${r}-${c}`}
              style={{
                width: fit ? cellVar : cellSize,
                height: fit ? cellVar : cellSize,
                borderRadius: t.borderRadiusSm,
                background: diffColor(targetLevel, currentLevel),
              }}
            />
          );
        })
      )}
    </div>
  );
}
