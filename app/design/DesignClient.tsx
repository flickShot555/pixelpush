"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Lock } from "lucide-react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { PixelGrid } from "@/components/ui/PixelGrid";
import {
  genMidnightCat,
  genMountainRange,
  genOceanWave,
  genPixelHeart,
  genSpaceRocket,
  type GraphGrid,
} from "@/lib/graph-utils";
import { useTheme } from "@/lib/theme";

type ThemeName = "Pets" | "Scenery" | "Abstract" | "Space" | "Aviation" | "Cars";

type DesignCandidate = {
  name: string;
  theme: ThemeName;
  getData: () => GraphGrid;
};

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

function ScaledPixelGrid({ data }: { data: GraphGrid }) {
  const { theme } = useTheme();
  const cellSize = 8;
  const gap = 1.5;

  const { ref, width } = useElementWidth<HTMLDivElement>();
  const naturalWidth = 52 * cellSize + 51 * gap;
  const scale = width > 0 ? Math.min(1, width / naturalWidth) : 1;

  return (
    <div ref={ref} style={{ width: "100%", overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "left top" }}>
        <PixelGrid data={data} cellSize={cellSize} gap={gap} t={theme} />
      </div>
    </div>
  );
}

export function DesignClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [activeTheme, setActiveTheme] = useState<ThemeName>("Pets");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themes: ThemeName[] = ["Pets", "Scenery", "Abstract", "Space", "Aviation", "Cars"];

  const candidates: DesignCandidate[] = useMemo(
    () => [
      { name: "Midnight Cat", theme: "Pets", getData: genMidnightCat },
      { name: "Mountain Range", theme: "Scenery", getData: genMountainRange },
      { name: "Pixel Heart", theme: "Abstract", getData: genPixelHeart },
      { name: "Ocean Wave", theme: "Scenery", getData: genOceanWave },
      { name: "Space Rocket", theme: "Space", getData: genSpaceRocket },
    ],
    []
  );

  const candidateData = useMemo(() => candidates.map((c) => c.getData()), [candidates]);

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
                onClick={() => {
                  console.log("Unlock Pro clicked");
                }}
              >
                Unlock Pro
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
                    {selected.name}
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
                </div>

                <div className="flex gap-3">
                  <Btn
                    variant="secondary"
                    onClick={() => {
                      console.log("Preview Overlay");
                    }}
                  >
                    Preview Overlay
                  </Btn>
                  <Btn
                    variant="primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      try {
                        const res = await fetch("/api/design/activate", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: selected.name,
                            theme: selected.theme,
                            grid: selected.getData(),
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
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
