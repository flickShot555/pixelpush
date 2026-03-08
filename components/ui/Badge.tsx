"use client";

import React from "react";

import { useTheme } from "@/lib/theme";

type BadgeProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
};

export function Badge({ children, style, className }: BadgeProps) {
  const { theme } = useTheme();

  return (
    <span
      className={className}
      style={{
        background: theme.accentBg,
        color: theme.accent,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--pp-font-body)",
        letterSpacing: "0.05em",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
