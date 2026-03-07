"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeMode = "dev" | "creative";

export type Theme = {
  bg: string;
  bgDeep: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  accentBg: string;
  accentBorder: string;
  warn: string;
  g0: string;
  g1: string;
  g2: string;
  g3: string;
  g4: string;
  fontHead: string;
  fontBody: string;
  borderRadius: string;
  borderRadiusSm: string;
  borderRadiusLg: string;
  shadow: string;
  shadowMd: string;
};

export const THEMES: Record<ThemeMode, Theme> = {
  dev: {
    bg: "#0d1117",
    bgDeep: "#010409",
    surface: "#161b22",
    surface2: "#21262d",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#7d8590",
    accent: "#238636",
    accentHover: "#2ea043",
    onAccent: "#ffffff",
    accentBg: "#0d1f14",
    accentBorder: "#238636",
    warn: "#e3b341",
    g0: "#161b22",
    g1: "#0e4429",
    g2: "#006d32",
    g3: "#26a641",
    g4: "#39d353",
    fontHead: "JetBrains Mono",
    fontBody: "JetBrains Mono",
    borderRadius: "4px",
    borderRadiusSm: "2px",
    borderRadiusLg: "8px",
    shadow: "0 0 0 1px #30363d",
    shadowMd: "0 4px 24px rgba(0,0,0,0.5)",
  },
  creative: {
    bg: "#f0fdf4",
    bgDeep: "#dcfce7",
    surface: "#ffffff",
    surface2: "#f0fdf4",
    border: "#bbf7d0",
    text: "#052e16",
    muted: "#4b7a5a",
    accent: "#16a34a",
    accentHover: "#15803d",
    onAccent: "#ffffff",
    accentBg: "#dcfce7",
    accentBorder: "#4ade80",
    warn: "#d97706",
    g0: "#ebedf0",
    g1: "#9be9a8",
    g2: "#40c463",
    g3: "#30a14e",
    g4: "#216e39",
    fontHead: "Syne",
    fontBody: "DM Sans",
    borderRadius: "16px",
    borderRadiusSm: "8px",
    borderRadiusLg: "24px",
    shadow: "0 2px 12px rgba(5,46,22,0.07)",
    shadowMd: "0 8px 32px rgba(5,46,22,0.12)",
  },
};

const STORAGE_KEY = "pixelpush-mode";

type ThemeContextValue = {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dev" || value === "creative";
}

function applyThemeCssVars(theme: Theme, mode: ThemeMode) {
  const root = document.documentElement;

  root.style.setProperty("--pp-bg", theme.bg);
  root.style.setProperty("--pp-bgDeep", theme.bgDeep);
  root.style.setProperty("--pp-surface", theme.surface);
  root.style.setProperty("--pp-surface2", theme.surface2);
  root.style.setProperty("--pp-border", theme.border);
  root.style.setProperty("--pp-text", theme.text);
  root.style.setProperty("--pp-muted", theme.muted);
  root.style.setProperty("--pp-accent", theme.accent);
  root.style.setProperty("--pp-accentHover", theme.accentHover);
  root.style.setProperty("--pp-accentBg", theme.accentBg);
  root.style.setProperty("--pp-accentBorder", theme.accentBorder);
  root.style.setProperty("--pp-g0", theme.g0);
  root.style.setProperty("--pp-g1", theme.g1);
  root.style.setProperty("--pp-g2", theme.g2);
  root.style.setProperty("--pp-g3", theme.g3);
  root.style.setProperty("--pp-g4", theme.g4);
  root.style.setProperty("--pp-radius", theme.borderRadius);

  // Map font variables (provided by next/font in app/layout.tsx) to theme.
  if (mode === "dev") {
    root.style.setProperty("--pp-font-head", "var(--font-jetbrains-mono)");
    root.style.setProperty("--pp-font-body", "var(--font-jetbrains-mono)");
  } else {
    root.style.setProperty("--pp-font-head", "var(--font-syne)");
    root.style.setProperty("--pp-font-body", "var(--font-dm-sans)");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dev";
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(raw) ? raw : "dev";
  });

  const theme = useMemo(() => THEMES[mode], [mode]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    applyThemeCssVars(theme, mode);
  }, [mode, theme]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((m) => (m === "dev" ? "creative" : "dev"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, theme, setMode, toggleMode }),
    [mode, theme, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
