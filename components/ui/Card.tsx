"use client";

import React from "react";

import { useTheme } from "@/lib/theme";

type CardRadius = "sm" | "md" | "lg";

type CardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  elevated?: boolean;
  radius?: CardRadius;
};

function getRadius(theme: ReturnType<typeof useTheme>["theme"], radius: CardRadius) {
  if (radius === "sm") return theme.borderRadiusSm;
  if (radius === "lg") return theme.borderRadiusLg;
  return theme.borderRadius;
}

export function Card({
  children,
  style,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  elevated = false,
  radius = "md",
}: CardProps) {
  const { theme } = useTheme();

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: getRadius(theme, radius),
        padding: 20,
        boxShadow: elevated ? theme.shadowMd : theme.shadow,
        transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
