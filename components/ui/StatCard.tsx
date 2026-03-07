"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { useTheme } from "@/lib/theme";

export function StatCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <Card elevated style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            color: theme.muted,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: "var(--pp-font-body)",
          }}
        >
          {label}
        </div>
        <div aria-hidden style={{ lineHeight: 0, color: theme.muted }}>{icon}</div>
      </div>

      <div
        style={{
          marginTop: 10,
          color: theme.text,
          fontFamily: "var(--pp-font-head)",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>

      <div style={{ marginTop: 6, color: theme.muted, fontSize: 12, fontFamily: "var(--pp-font-body)" }}>
        {subtitle}
      </div>
    </Card>
  );
}
