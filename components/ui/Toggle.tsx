"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";

import { useTheme } from "@/lib/theme";

export type ToggleProps = {
  value: boolean;
  onChange: (next: boolean) => void;
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

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Toggle({ value, onChange }: ToggleProps) {
  const { theme } = useTheme();

  const trackStyle = useMemo<CSSProperties>(() => {
    const on = value;
    return {
      width: 44,
      height: 24,
      borderRadius: 99,
      cursor: "pointer",
      position: "relative",
      background: on ? theme.accent : theme.surface2,
      border: `1px solid ${on ? theme.accent : theme.border}`,
      transition: "all 0.2s",
      flexShrink: 0,
    };
  }, [theme, value]);

  const knobStyle = useMemo<CSSProperties>(() => {
    const on = value;
    return {
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: theme.onAccent,
      boxShadow: `0 1px 3px ${hexToRgba(theme.text, 0.2)}`,
      position: "absolute",
      top: 3,
      left: on ? 22 : 3,
      transition: "left 0.2s",
    };
  }, [theme.onAccent, theme.text, value]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={trackStyle}
    >
      <span aria-hidden style={knobStyle} />
    </button>
  );
}
