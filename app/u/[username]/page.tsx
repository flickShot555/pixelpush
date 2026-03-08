import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ProfileClient } from "./ProfileClient";
import type { GraphGrid } from "@/lib/graph-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { username: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function getFirst(sp: PageProps["searchParams"], key: string): string | undefined {
  const v = sp?.[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

function isStage(value: string | undefined): value is "started" | "progress" | "completed" {
  return value === "started" || value === "progress" || value === "completed";
}

function parsePercent(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.round(n);
  if (i < 0 || i > 100) return undefined;
  return i;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { username } = params;

  const stage = isStage(getFirst(searchParams, "stage")) ? (getFirst(searchParams, "stage") as "started" | "progress" | "completed") : "progress";
  const percent = parsePercent(getFirst(searchParams, "percent"));

  const baseUrlRaw = process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL || "";
  const baseUrl = baseUrlRaw.replace(/\/$/, "");

  const pageUrl = baseUrl
    ? new URL(`/u/${encodeURIComponent(username)}`, baseUrl)
    : new URL(`http://localhost/u/${encodeURIComponent(username)}`);
  if (stage) pageUrl.searchParams.set("stage", stage);
  if (percent !== undefined) pageUrl.searchParams.set("percent", String(percent));

  const cardUrl = baseUrl
    ? new URL("/api/share-card", baseUrl)
    : new URL("http://localhost/api/share-card");
  cardUrl.searchParams.set("username", username);
  cardUrl.searchParams.set("stage", stage);
  if (percent !== undefined) cardUrl.searchParams.set("percent", String(percent));

  return {
    title: `${username} on PixelPush`,
    description: `Follow ${username}'s pixel art journey on PixelPush.`,
    openGraph: {
      title: `${username} on PixelPush`,
      description: "Drawing pixel art on GitHub one commit at a time.",
      siteName: "PixelPush",
      url: baseUrl ? pageUrl.toString() : undefined,
      images: [
        {
          url: baseUrl ? cardUrl.toString() : `/api/share-card?username=${encodeURIComponent(username)}&stage=${encodeURIComponent(stage)}${percent !== undefined ? `&percent=${percent}` : ""}`,
          width: 1200,
          height: 630,
          alt: `${username} on PixelPush`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${username} on PixelPush`,
      description: "Drawing pixel art on GitHub one commit at a time.",
      images: [baseUrl ? cardUrl.toString() : `/api/share-card?username=${encodeURIComponent(username)}&stage=${encodeURIComponent(stage)}${percent !== undefined ? `&percent=${percent}` : ""}`],
    },
  };
}

function monthYearLabel(date: Date): string {
  const d = date;
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${month} ${year}`;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true, username: true, image: true, createdAt: true },
  });
  if (!user) notFound();

  const activeDesign = await prisma.design.findFirst({
    where: { userId: user.id, status: "active" },
    select: { id: true, name: true, pixelData: true },
  });

  const completedCount = await prisma.design.count({
    where: { userId: user.id, status: "completed" },
  });

  const completedDesigns = await prisma.design.findMany({
    where: { userId: user.id, status: "completed" },
    orderBy: { completedAt: "desc" },
    take: 2,
    select: { name: true, pixelData: true, completedAt: true, targetEndAt: true },
  });

  const sinceLabel = monthYearLabel(user.createdAt);

  let progressPct = 0;
  if (activeDesign) {
    const [total, completed] = await Promise.all([
      prisma.scheduleEntry.count({ where: { designId: activeDesign.id, status: { not: "skipped" } } }),
      prisma.scheduleEntry.count({ where: { designId: activeDesign.id, status: "completed" } }),
    ]);
    progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  const profile = {
    username: user.username,
    avatarUrl: user.image,
    sinceLabel,
    activeDesign: activeDesign
      ? {
          name: activeDesign.name,
          progressPct,
          artData: activeDesign.pixelData as unknown as GraphGrid,
        }
      : null,
    completedCount,
    completedDesigns: completedDesigns.map((d) => ({
      name: d.name,
      completedLabel: d.completedAt
        ? `Completed · ${monthYearLabel(d.completedAt)}`
        : d.targetEndAt
          ? `Completed · ${monthYearLabel(d.targetEndAt)}`
          : "Completed",
      artData: d.pixelData as unknown as GraphGrid,
    })),
  };

  return (
    <Suspense fallback={null}>
      <ProfileClient profile={profile} />
    </Suspense>
  );
}
