"use client";

import React from "react";

import { useTheme } from "@/lib/theme";

type TagProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
};

export function Tag({ children, style, className }: TagProps) {
  const { theme } = useTheme();

  return (
    <span
      className={className}
      style={{
        background: theme.accentBg,
        color: theme.accent,
        border: `1px solid ${theme.accentBorder}`,
        borderRadius: theme.borderRadiusSm,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "var(--pp-font-body)",
        letterSpacing: "0.01em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
