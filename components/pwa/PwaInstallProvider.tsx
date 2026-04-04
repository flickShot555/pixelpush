"use client";

import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  return Boolean(standaloneMatch || iosStandalone);
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectInstalled());

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      (e as BeforeInstallPromptEvent).preventDefault?.();
      setPromptEvent(e as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setIsInstalled(true);
      setPromptEvent(null);
    }

    function onMaybeInstalledChanged() {
      setIsInstalled(detectInstalled());
    }

    const mql = window.matchMedia?.("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("focus", onMaybeInstalledChanged);
    document.addEventListener("visibilitychange", onMaybeInstalledChanged);
    mql?.addEventListener?.("change", onMaybeInstalledChanged);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("focus", onMaybeInstalledChanged);
      document.removeEventListener("visibilitychange", onMaybeInstalledChanged);
      mql?.removeEventListener?.("change", onMaybeInstalledChanged);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await reg.update().catch(() => undefined);
      } catch {
        // Ignore; install button will fall back to instructions.
      }
    };

    void register();
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (isInstalled) return "unavailable";
    if (!promptEvent) return "unavailable";

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      return choice.outcome;
    } catch {
      setPromptEvent(null);
      return "unavailable";
    }
  }, [isInstalled, promptEvent]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: Boolean(promptEvent) && !isInstalled,
      isInstalled,
      promptInstall,
    }),
    [isInstalled, promptEvent, promptInstall]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
