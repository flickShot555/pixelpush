"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Lock } from "lucide-react";

import { Btn } from "@/components/ui/Btn";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PixelGrid } from "@/components/ui/PixelGrid";
import {
  calendarToGrid,
  genMidnightCat,
  genMountainRange,
  genOceanWave,
  genPixelHeart,
  genSpaceRocket,
  type GraphGrid,
  type GitHubContributionCalendar,
} from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";
import { PixelDiffGrid } from "@/components/ui/PixelDiffGrid";

type ThemeName = "Pets" | "Scenery" | "Abstract" | "Space" | "Aviation" | "Cars";

type DesignCandidate = {
  name: string;
  theme: ThemeName;
  grid: GraphGrid;
};

type Difficulty = "easy" | "medium" | "hard";

type AiDesignSuggestion = {
  name: string;
  description: string;
  whyItFits: string;
  difficulty: Difficulty;
};

function ScaledPixelGrid({ data }: { data: GraphGrid }) {
  const { theme } = useTheme();
  const cellSize = 8;
  const gap = 1.5;

  return (
    <div style={{ width: "100%" }}>
      <PixelGrid data={data} cellSize={cellSize} gap={gap} t={theme} fit />
    </div>
  );
}

export function DesignClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { theme } = useTheme();

  const [activeTheme, setActiveTheme] = useState<ThemeName>("Pets");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDesign, setActiveDesign] = useState<null | { id: string; name: string }>(null);
  const [loadingActive, setLoadingActive] = useState(true);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsByTheme, setSuggestionsByTheme] = useState<Partial<Record<ThemeName, AiDesignSuggestion[]>>>(
    {}
  );
  const [githubInfo, setGithubInfo] = useState<null | { languages: string[]; repos: string[] }>(null);
  const [nameOverride, setNameOverride] = useState<string | null>(null);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlayCurrent, setOverlayCurrent] = useState<GraphGrid | null>(null);

  async function refreshOverlayCurrent() {
    setOverlayError(null);
    setOverlayBusy(true);
    try {
      const res = await fetch("/api/github/contributions", { method: "GET" });
      const json = (await res.json().catch(() => null)) as
        | { calendar?: unknown; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Unable to load GitHub contributions");
      }

      if (!json?.calendar || typeof json.calendar !== "object") {
        throw new Error("Invalid GitHub contributions response");
      }

      const grid = calendarToGrid(json.calendar as GitHubContributionCalendar);
      setOverlayCurrent(grid);
      setOverlayBusy(false);
    } catch (e) {
      setOverlayError(e instanceof Error ? e.message : "Unable to load overlay data");
      setOverlayBusy(false);
    }
  }

  useEffect(() => {
    if (!overlayOpen) return;
    if (overlayBusy) return;
    if (overlayCurrent) return;
    void refreshOverlayCurrent();
  }, [overlayBusy, overlayCurrent, overlayOpen]);

  const themes: ThemeName[] = ["Pets", "Scenery", "Abstract", "Space", "Aviation", "Cars"];

  const candidates: DesignCandidate[] = useMemo(
    () => [
      { name: "Midnight Cat", theme: "Pets", grid: genMidnightCat() },
      { name: "Mountain Range", theme: "Scenery", grid: genMountainRange() },
      { name: "Pixel Heart", theme: "Abstract", grid: genPixelHeart() },
      { name: "Ocean Wave", theme: "Scenery", grid: genOceanWave() },
      { name: "Space Rocket", theme: "Space", grid: genSpaceRocket() },
    ],
    []
  );

  const candidateData = useMemo(() => candidates.map((c) => c.grid), [candidates]);

  const username = useMemo(() => {
    const u = (session?.user as unknown as { username?: string } | undefined)?.username;
    if (typeof u === "string" && u.trim()) return u.trim();
    const n = session?.user?.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    const e = session?.user?.email;
    if (typeof e === "string" && e.trim()) return e.trim();
    return "";
  }, [session?.user]);

  const suggestions = suggestionsByTheme[activeTheme] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadGithubInfo(): Promise<{ languages: string[]; repos: string[] }> {
      if (githubInfo) return githubInfo;
      const res = await fetch("/api/github/repos", { method: "GET" });
      const json = (await res.json().catch(() => null)) as
        | { languages?: string[]; repos?: string[]; error?: string }
        | null;

      if (!res.ok) {
        const msg = json?.error || "Unable to load GitHub repos";
        throw new Error(msg);
      }

      const languages = Array.isArray(json?.languages) ? json!.languages.filter((x) => typeof x === "string") : [];
      const repos = Array.isArray(json?.repos) ? json!.repos.filter((x) => typeof x === "string") : [];

      return { languages: languages.slice(0, 3), repos: repos.slice(0, 5) };
    }

    async function loadSuggestions() {
      setSuggestionError(null);

      if (!username) {
        setSuggestionError("AI suggestions need an active session.");
        return;
      }

      if (suggestionsByTheme[activeTheme]?.length) {
        return;
      }

      setLoadingSuggestions(true);
      try {
        const info = await loadGithubInfo();
        const res = await fetch("/api/suggestions/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            languages: info.languages,
            repos: info.repos,
            theme: activeTheme,
            days: 68, // TODO: replace with real schedule duration
          }),
        });

        const json = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;

        if (!res.ok) {
          const msg = (json as { error?: string } | null)?.error || "Unable to load AI suggestions";
          throw new Error(msg);
        }

        if (!Array.isArray(json)) {
          throw new Error("AI suggestions returned invalid data");
        }

        const normalized = (json as Array<Partial<AiDesignSuggestion>>)
          .map((s) => {
            const name = typeof s.name === "string" ? s.name.trim() : "";
            const description = typeof s.description === "string" ? s.description.trim() : "";
            const whyItFits = typeof s.whyItFits === "string" ? s.whyItFits.trim() : "";
            const difficulty = s.difficulty;

            if (!name || !description || !whyItFits) return null;
            if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") return null;

            return { name, description, whyItFits, difficulty } as AiDesignSuggestion;
          })
          .filter(Boolean) as AiDesignSuggestion[];

        if (normalized.length === 0) {
          throw new Error("No AI suggestions available for this theme");
        }

        if (!githubInfo) setGithubInfo(info);
        setSuggestionsByTheme((prev) => ({ ...prev, [activeTheme]: normalized.slice(0, 3) }));
      } catch (e) {
        if (cancelled) return;
        setSuggestionError(e instanceof Error ? e.message : "Unable to load AI suggestions");
      } finally {
        if (cancelled) return;
        setLoadingSuggestions(false);
      }
    }

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [activeTheme, githubInfo, suggestionsByTheme, username]);

  const selectedIdx = useMemo(() => {
    const raw = searchParams.get("design");
    const idx = raw == null ? 0 : Number.parseInt(raw, 10);
    if (Number.isNaN(idx)) return 0;
    if (idx < 0 || idx >= candidates.length) return 0;
    return idx;
  }, [candidates.length, searchParams]);

  useEffect(() => {
    const raw = searchParams.get("design");
    if (raw == null) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("design", "0");
      router.replace(`/design?${next.toString()}`);
      return;
    }

    const idx = Number.parseInt(raw, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= candidates.length) {
      const next = new URLSearchParams(searchParams.toString());
      next.set("design", "0");
      router.replace(`/design?${next.toString()}`);
    }
  }, [candidates.length, router, searchParams]);

  function pickDesign(idx: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("design", String(idx));
    router.replace(`/design?${next.toString()}`);
  }

  const selected = candidates[selectedIdx];
  const displayName = nameOverride ?? selected.name;

  function badgeStyleForDifficulty(difficulty: Difficulty): CSSProperties {
    if (difficulty === "easy") {
      return {
        background: theme.accentBg,
        color: theme.accent,
      };
    }

    if (difficulty === "medium") {
      return {
        background: `color-mix(in srgb, ${theme.warn} 18%, ${theme.surface} 82%)`,
        color: theme.warn,
      };
    }

    return {
      background: `color-mix(in srgb, ${theme.danger} 16%, ${theme.surface} 84%)`,
      color: theme.danger,
    };
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingActive(true);
      try {
        const res = await fetch("/api/design/active", { method: "GET" });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; activeDesign?: { id: string; name: string } | null }
          | null;
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          setActiveDesign(null);
          setLoadingActive(false);
          return;
        }
        setActiveDesign(json.activeDesign ?? null);
        setLoadingActive(false);
      } catch {
        if (cancelled) return;
        setActiveDesign(null);
        setLoadingActive(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const canActivate = !loadingActive && !activeDesign;

  return (
    <main
      className="w-full"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        overflowX: "hidden",
      }}
    >
      <div
        className="mx-auto w-full px-6"
        style={{
          maxWidth: 1200,
          paddingTop: 28,
          paddingBottom: 28,
        }}
      >
        <header>
          <h1
            style={{
              margin: 0,
              marginBottom: 4,
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            Design Selection
          </h1>
          <p
            style={{
              margin: 0,
              color: theme.muted,
              fontSize: 14,
              fontFamily: "var(--pp-font-body)",
            }}
          >
            Pick a theme, then choose your pixel art design.
          </p>
        </header>

        <div
          className="mt-6 mb-7 flex gap-2 overflow-x-auto pp-hide-scrollbar"
          style={{ paddingBottom: 2, scrollBehavior: "smooth" }}
        >
          {themes.map((t) => {
            const active = t === activeTheme;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTheme(t)}
                style={{
                  borderRadius: 999,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--pp-font-body)",
                  border: `1px solid ${active ? theme.accentBorder : theme.border}`,
                  background: active ? theme.accent : theme.surface2,
                  color: active ? theme.onAccent : theme.text,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {suggestionError ? (
          <div style={{ marginTop: -16, marginBottom: 18, color: theme.muted, fontSize: 12, fontFamily: "var(--pp-font-body)" }}>
            {suggestionError}
          </div>
        ) : null}

        <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loadingSuggestions
            ? Array.from({ length: 3 }).map((_, idx) => (
                <Card key={`skeleton-${idx}`} className="animate-pulse" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div
                      style={{
                        height: 14,
                        width: "58%",
                        borderRadius: 999,
                        background: theme.surface2,
                      }}
                    />
                    <div
                      style={{
                        height: 18,
                        width: 64,
                        borderRadius: 999,
                        background: theme.surface2,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 10, height: 12, width: "92%", borderRadius: 999, background: theme.surface2 }} />
                  <div style={{ marginTop: 8, height: 12, width: "76%", borderRadius: 999, background: theme.surface2 }} />
                  <div style={{ marginTop: 10, height: 10, width: "66%", borderRadius: 999, background: theme.surface2 }} />
                </Card>
              ))
            : suggestions?.length
              ? suggestions.slice(0, 3).map((s) => (
                  <Card key={s.name} style={{ padding: 14 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        style={{
                          color: theme.text,
                          fontFamily: "var(--pp-font-head)",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {s.name}
                      </div>
                      <Badge style={badgeStyleForDifficulty(s.difficulty)}>
                        {s.difficulty.toUpperCase()}
                      </Badge>
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: theme.muted,
                        fontSize: 12,
                        fontFamily: "var(--pp-font-body)",
                      }}
                    >
                      {s.description}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: theme.accent,
                        fontSize: 11,
                        fontStyle: "italic",
                        fontFamily: "var(--pp-font-body)",
                      }}
                    >
                      {s.whyItFits}
                    </div>

                    <div className="mt-3">
                      <Btn
                        variant="secondary"
                        small
                        onClick={() => {
                          setNameOverride(s.name);
                        }}
                      >
                        Draw This
                      </Btn>
                    </div>
                  </Card>
                ))
              : null}
        </section>

        <section className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((c, idx) => {
            const isSelected = idx === selectedIdx;
            const hovered = hoveredIdx === idx;

            const borderColor = isSelected
              ? theme.accent
              : hovered
                ? `color-mix(in srgb, ${theme.border} 70%, ${theme.text} 30%)`
                : theme.border;

            return (
              <Card
                key={c.name}
                onClick={() => pickDesign(idx)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx((h) => (h === idx ? null : h))}
                style={{
                  padding: 14,
                  border: `${isSelected ? 2 : 1}px solid ${borderColor}`,
                  boxShadow: isSelected ? `0 0 0 3px ${theme.accentBg}, ${theme.shadow}` : theme.shadow,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ width: "100%" }}>
                  <ScaledPixelGrid data={candidateData[idx]} />
                </div>

                <div className="mt-3 flex items-start justify-between gap-3" style={{ minHeight: 44 }}>
                  <div>
                    <div
                      style={{
                        color: theme.text,
                        fontFamily: "var(--pp-font-head)",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {c.name}
                    </div>
                    <div style={{ marginTop: 2, color: theme.muted, fontSize: 11, fontFamily: "var(--pp-font-body)" }}>
                      {c.theme}
                    </div>
                  </div>

                  {isSelected ? (
                    <div aria-hidden style={{ color: theme.accent, lineHeight: 0, paddingTop: 2 }}>
                      <Check size={18} color={theme.accent} />
                    </div>
                  ) : (
                    <div aria-hidden style={{ width: 18, height: 18 }} />
                  )}
                </div>
              </Card>
            );
          })}

          <Card
            style={{
              padding: 14,
              opacity: 0.6,
              border: `1px dashed ${theme.border}`,
              boxShadow: theme.shadow,
              cursor: "default",
            }}
          >
            <div
              style={{
                height: 63,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Lock aria-hidden size={24} color={theme.muted} />
              <div style={{ color: theme.muted, fontSize: 11, fontFamily: "var(--pp-font-body)" }}>Pro — 3 more</div>
            </div>

            <div className="mt-3">
              <Btn
                variant="secondary"
                style={{ width: "100%" }}
                disabled
              >
                Coming Soon
              </Btn>
            </div>
          </Card>
        </section>

        <div className="mt-7" style={{ transition: "opacity 0.2s", opacity: selected ? 1 : 0 }}>
          {selected && (
            <Card elevated style={{ padding: "24px 28px" }}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div
                    style={{
                      color: theme.text,
                      fontFamily: "var(--pp-font-head)",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: theme.muted,
                      fontSize: 13,
                      fontFamily: "var(--pp-font-body)",
                    }}
                  >
                    This design will take approximately 68 days to complete based on your schedule.
                  </div>

                  {error ? (
                    <div style={{ marginTop: 10, color: theme.danger, fontSize: 13, fontWeight: 700 }}>
                      {error}
                    </div>
                  ) : null}

                  {activeDesign ? (
                    <div style={{ marginTop: 10, color: theme.warn, fontSize: 13, fontWeight: 700 }}>
                      You already have an active design ({activeDesign.name}). Complete it or discard it to start a new one.
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  {activeDesign ? (
                    <Btn
                      variant="secondary"
                      onClick={() => {
                        router.push("/schedule");
                      }}
                    >
                      Go to schedule
                    </Btn>
                  ) : null}

                  {activeDesign ? (
                    <Btn
                      variant="secondary"
                      disabled={busy}
                      onClick={async () => {
                        const ok = window.confirm(
                          `Discard your current design (${activeDesign.name})?\n\nThis ends your current progress and may affect your streak. This cannot be undone.`
                        );
                        if (!ok) return;

                        setBusy(true);
                        setError(null);
                        try {
                          const res = await fetch("/api/design/discard", { method: "POST" });
                          const json = (await res.json().catch(() => null)) as
                            | { ok?: boolean; error?: string }
                            | null;
                          if (!res.ok || !json?.ok) {
                            setError(json?.error || "Unable to discard design");
                            setBusy(false);
                            return;
                          }
                          setActiveDesign(null);
                          setBusy(false);

                          router.replace("/design");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Unable to discard design");
                          setBusy(false);
                        }
                      }}
                    >
                      Discard current design
                    </Btn>
                  ) : null}

                  <Btn
                    variant="secondary"
                    onClick={() => {
                      setOverlayOpen((v) => !v);
                    }}
                  >
                    Preview Overlay
                  </Btn>
                  <Btn
                    variant="primary"
                    disabled={busy || !canActivate}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        const res = await fetch("/api/design/activate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: displayName,
                            theme: selected.theme,
                            grid: selected.grid,
                          }),
                        });

                        const json = (await res.json().catch(() => null)) as
                          | { ok?: boolean; error?: string }
                          | null;

                        if (!res.ok || !json?.ok) {
                          setError(json?.error || "Unable to generate schedule");
                          setBusy(false);
                          return;
                        }

                        router.push("/schedule");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Unable to generate schedule");
                        setBusy(false);
                      }
                    }}
                    style={{ display: "inline-flex", alignItems: "center" }}
                  >
                    {busy ? "Generating…" : "Generate Schedule →"}
                  </Btn>
                </div>
              </div>

              {overlayOpen ? (
                <div style={{ marginTop: 18 }}>
                  <div
                    className="flex items-center justify-between gap-3"
                    style={{ marginBottom: 10 }}
                  >
                    <div
                      style={{
                        color: theme.muted,
                        textTransform: "uppercase",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        fontFamily: "var(--pp-font-body)",
                        fontWeight: 700,
                      }}
                    >
                      Overlay Comparison
                    </div>

                    <Btn
                      small
                      variant="secondary"
                      disabled={overlayBusy}
                      onClick={async () => {
                        await refreshOverlayCurrent();
                      }}
                    >
                      {overlayBusy ? "Loading…" : "Refresh"}
                    </Btn>
                  </div>

                  {overlayError ? (
                    <div style={{ marginBottom: 10, color: theme.danger, fontSize: 13, fontWeight: 700 }}>
                      {overlayError}
                    </div>
                  ) : null}

                  <div style={{ overflowX: "auto", overflowY: "hidden", maxWidth: "100%" }}>
                    {overlayCurrent ? (
                      <PixelDiffGrid target={selected.grid} current={overlayCurrent} cellSize={10} gap={2} t={theme} fit />
                    ) : (
                      <div style={{ color: theme.muted, fontSize: 13 }}>
                        Click Refresh to load your current GitHub graph and preview differences.
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 10, color: theme.muted, fontSize: 12 }}>
                    Warn highlights areas below target; danger highlights areas above target.
                  </div>
                </div>
              ) : null}
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
