"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { useTheme } from "@/lib/theme";

export type BtnVariant = "primary" | "secondary" | "ghost";

type BtnProps = {
  children: React.ReactNode;
  variant?: BtnVariant;
  small?: boolean;
  href?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
};

export function Btn({
  children,
  variant = "primary",
  small = false,
  href,
  onClick,
  style,
  className,
}: BtnProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  const baseStyle = useMemo<React.CSSProperties>(() => {
    const padding = small ? "6px 14px" : "10px 20px";
    const fontSize = small ? 12 : 14;

    const isPrimary = variant === "primary";
    const isSecondary = variant === "secondary";
    const isGhost = variant === "ghost";

    const background = isPrimary
      ? hovered
        ? theme.accentHover
        : theme.accent
      : isSecondary
        ? hovered
          ? theme.surface
          : theme.surface2
        : hovered
          ? theme.surface2
          : "transparent";

    const border = isPrimary
      ? "none"
      : `1px solid ${hovered ? theme.border : theme.border}`;

    const color = isPrimary ? theme.onAccent : theme.text;

    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background,
      color,
      border,
      borderRadius: theme.borderRadius,
      padding,
      fontSize,
      fontWeight: 600,
      fontFamily: "var(--pp-font-body)",
      cursor: "pointer",
      transition: "all 0.2s",
      textDecoration: "none",
      userSelect: "none",
      lineHeight: 1.2,
      ...style,
    };
  }, [hovered, small, style, theme, variant]);

  const commonProps = {
    onClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: baseStyle,
    className,
  };

  if (href) {
    return (
      <Link href={href} prefetch={false} {...commonProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" {...commonProps}>
      {children}
    </button>
  );
}
