import React from "react";

import type { Theme } from "@/lib/theme";

type CSSVarStyle = React.CSSProperties &
  Record<`--${string}`, string | number>;

export type PixelGridProps = {
  data: number[][]; // [7][52], values 0..4
  cellSize: number;
  gap: number;
  t: Theme;
  fit?: boolean;
};

export function PixelGrid({ data, cellSize, gap, t, fit }: PixelGridProps) {
  function color(level: number) {
    if (level <= 0) return t.g0;
    if (level === 1) return t.g1;
    if (level === 2) return t.g2;
    if (level === 3) return t.g3;
    return t.g4;
  }

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
          // shrink cells to fit the parent width (down to 4px), but never exceed the provided cellSize
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

  return (
    <div
      aria-hidden
      style={style}
    >
      {data.flatMap((row, r) =>
        row.map((v, c) => (
          <span
            key={`${r}-${c}`}
            style={{
              width: fit ? cellVar : cellSize,
              height: fit ? cellVar : cellSize,
              borderRadius: t.borderRadiusSm,
              background: color(v),
            }}
          />
        ))
      )}
    </div>
  );
}
