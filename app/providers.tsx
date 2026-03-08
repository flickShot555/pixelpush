"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme";
import { PwaInstallProvider } from "@/components/pwa/PwaInstallProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <PwaInstallProvider>{children}</PwaInstallProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
