import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type ShareCardData = {
  ok: true;
  username: string;
  titleLine: string;
  subtitleLine: string;
  leftLabel: string;
  rightLabel: string;
  leftGrid: number[][];
  rightGrid: number[][];
  designName?: string | null;
} | { ok: false; error: string };

const GITHUB_LEVEL_COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"] as const;

function clampLevel(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 4) return 4;
  return Math.round(v);
}

function Grid({ grid, label }: { grid: number[][]; label: string }) {
  const cell = 8;
  const gap = 2;
  const cols = 52;
  const rows = 7;
  const width = cols * cell + (cols - 1) * gap;
  const height = rows * cell + (rows - 1) * gap;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{label}</div>
      <div
        style={{
          width,
          height,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gridTemplateRows: `repeat(${rows}, ${cell}px)`,
          gap,
          backgroundColor: "#f3f4f6",
          padding: 10,
          borderRadius: 16,
          boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((level, c) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`${r}-${c}`}
              style={{
                width: cell,
                height: cell,
                borderRadius: 3,
                backgroundColor: GITHUB_LEVEL_COLORS[clampLevel(level)] ?? GITHUB_LEVEL_COLORS[0],
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const dataUrl = new URL("/api/share-card/data", origin);
  url.searchParams.forEach((value, key) => {
    dataUrl.searchParams.set(key, value);
  });

  const res = await fetch(dataUrl.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as ShareCardData | null;
  if (!res.ok || !json || json.ok !== true) {
    const message = (json && "error" in json && typeof json.error === "string") ? json.error : "Unable to generate share card";
    return new ImageResponse(
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          color: "#111827",
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        {message}
      </div>,
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
        },
      }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          padding: 48,
          backgroundColor: "#ffffff",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: "#111827", letterSpacing: -0.5 }}>{json.username}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#374151" }}>{json.titleLine}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#6b7280" }}>{json.subtitleLine}</div>
          </div>

          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>PixelPush</div>
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          <Grid grid={json.leftGrid} label={json.leftLabel} />
          <Grid grid={json.rightGrid} label={json.rightLabel} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, color: "#6b7280" }}>pixelpush.app</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>{json.designName ? `Design: ${json.designName}` : ""}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
