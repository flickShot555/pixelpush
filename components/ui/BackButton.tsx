"use client";

import type React from "react";

import { useRouter } from "next/navigation";

import { useTheme } from "@/lib/theme";

export type BackButtonProps = {
  className?: string;
  style?: React.CSSProperties;
  fallbackHref?: string;
};

export function BackButton({ className, style, fallbackHref = "/" }: BackButtonProps) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Back"
      className={className}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
      style={{
        position: "fixed",
        top: "max(16px, env(safe-area-inset-top))",
        left: "max(16px, env(safe-area-inset-left))",
        zIndex: 50,
        height: 32,
        padding: "0 10px",
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        ...style,
      }}
    >
      <span aria-hidden style={{ color: theme.muted, fontSize: 14, lineHeight: 0 }}>
        ←
      </span>
      Back
    </button>
  );
}
