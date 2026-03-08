"use client";

import Link from "next/link";
import type React from "react";

import { Btn } from "@/components/ui/Btn";
import { useTheme } from "@/lib/theme";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

export type PublicNavProps = {
  rightSlot?: React.ReactNode;
  fixed?: boolean;
};

export function PublicNav({ rightSlot, fixed = false }: PublicNavProps) {
  const { theme } = useTheme();

  return (
    <nav
      className={(fixed ? "fixed left-0 right-0 top-0 " : "") + "px-4 md:px-12"}
      style={
        fixed
          ? {
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${theme.border}`,
              background: theme.surface,
              zIndex: 50,
            }
          : {
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${theme.border}`,
              background: theme.surface,
            }
      }
    >
      <Link
        href="/"
        prefetch={false}
        className="flex items-center gap-2"
        style={{ textDecoration: "none" }}
      >
        <span aria-hidden style={{ fontSize: 16, lineHeight: 0 }}>
          🟩
        </span>
        <span
          style={{
            fontFamily: "var(--pp-font-head)",
            fontWeight: 700,
            fontSize: 16,
            color: theme.text,
          }}
        >
          PixelPush
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {rightSlot ?? (
          <>
            <PwaInstallButton />
            <Btn variant="ghost" small href="/onboarding">
              Sign In
            </Btn>
            <Btn small href="/onboarding">
              Connect GitHub
            </Btn>
          </>
        )}
      </div>
    </nav>
  );
}
