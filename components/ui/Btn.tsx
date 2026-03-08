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
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  hoverOpacity?: number;
};

export function Btn({
  children,
  variant = "primary",
  small = false,
  href,
  onClick,
  disabled = false,
  style,
  className,
  hoverOpacity,
}: BtnProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  const baseStyle = useMemo<React.CSSProperties>(() => {
    const padding = small ? "6px 14px" : "10px 20px";
    const fontSize = small ? 12 : 14;

    const isPrimary = variant === "primary";
    const isSecondary = variant === "secondary";

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

    const opacity = hovered && typeof hoverOpacity === "number" ? hoverOpacity : 1;

    const disabledStyle: React.CSSProperties = disabled
      ? {
          opacity: 0.55,
          cursor: "not-allowed",
          pointerEvents: "none",
        }
      : {};

    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background,
      color,
      border,
      opacity,
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
      ...disabledStyle,
    };
  }, [disabled, hoverOpacity, hovered, small, style, theme, variant]);

  async function handleClick() {
    if (disabled) return;
    await onClick?.();
  }

  const commonProps = {
    onClick: onClick ? handleClick : undefined,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: baseStyle,
    className,
  };

  if (href) {
    if (disabled) {
      return <span {...commonProps}>{children}</span>;
    }
    return (
      <Link href={href} prefetch={false} {...commonProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} {...commonProps}>
      {children}
    </button>
  );
}
