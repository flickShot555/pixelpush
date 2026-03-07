import React from "react";

import type { Theme } from "@/lib/theme";

export type PixelGridProps = {
  data: number[][]; // [7][52], values 0..4
  cellSize: number;
  gap: number;
  t: Theme;
};

export function PixelGrid({ data, cellSize, gap, t }: PixelGridProps) {
  function color(level: number) {
    if (level <= 0) return t.g0;
    if (level === 1) return t.g1;
    if (level === 2) return t.g2;
    if (level === 3) return t.g3;
    return t.g4;
  }

  return (
    <div
      aria-hidden
      style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(52, ${cellSize}px)`,
        gridTemplateRows: `repeat(7, ${cellSize}px)`,
        gap,
      }}
    >
      {data.flatMap((row, r) =>
        row.map((v, c) => (
          <span
            key={`${r}-${c}`}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: t.borderRadiusSm,
              background: color(v),
            }}
          />
        ))
      )}
    </div>
  );
}
