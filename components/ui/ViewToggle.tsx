"use client";

import React, { useMemo } from "react";

import type { Theme } from "@/lib/theme";

type ViewToggleProps = {
  options: string[];
  value: string;
  onChange: (next: string) => void;
  t: Theme;
};

export function ViewToggle({ options, value, onChange, t }: ViewToggleProps) {
  const containerStyle = useMemo<React.CSSProperties>(
    () => ({
      background: t.surface2,
      padding: 4,
      borderRadius: t.borderRadius,
      display: "inline-flex",
      gap: 4,
    }),
    [t]
  );

  return (
    <div style={containerStyle} role="group" aria-label="View toggle">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--pp-font-body)",
              cursor: "pointer",
              borderRadius: t.borderRadius,
              border: active ? `1px solid ${t.border}` : "1px solid transparent",
              background: active ? t.surface : "transparent",
              color: active ? t.text : t.muted,
              transition: "all 0.15s",
              textTransform: "lowercase",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
