import type { Metadata } from "next";
import { Suspense } from "react";
import { getServerSession } from "next-auth/next";

import { ProfileClient } from "./ProfileClient";
import { authOptions } from "@/lib/auth";
import { fetchUserSummary } from "@/lib/github";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { username: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = params;

  return {
    title: `${username} on PixelPush`,
    description: `${username} is drawing Midnight Cat on their GitHub contribution graph. 34% complete.`,
    openGraph: {
      title: `${username} on PixelPush`,
      description: "Drawing pixel art on GitHub one commit at a time.",
      url: `https://pixelpush.aepostrophee.com/u/${username}`,
      siteName: "PixelPush",
      images: [
        {
          // TODO: replace hardcoded OG image URL with real share card API in Milestone 7
          url: `/api/share-card?username=${username}&stage=progress`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${username} on PixelPush`,
      description: "Drawing pixel art on GitHub one commit at a time.",
      images: [
        // TODO: replace hardcoded OG image URL with real share card API in Milestone 7
        `/api/share-card?username=${username}&stage=progress`,
      ],
    },
  };
}

function monthYearLabel(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${month} ${year}`;
}

function computeCurrentStreakDays(calendar: { weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }> }): number {
  const counts = new Map<string, number>();
  for (const w of calendar.weeks) {
    for (const day of w.contributionDays) {
      counts.set(day.date, day.contributionCount);
    }
  }

  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let streak = 0;
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    const c = counts.get(key) ?? 0;
    if (c <= 0) break;
    streak += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return streak;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  let github: Parameters<typeof ProfileClient>[0]["github"] | undefined;

  if (accessToken) {
    try {
      const summary = await fetchUserSummary({ accessToken, login: params.username });
      github = {
        login: summary.login,
        avatarUrl: summary.avatarUrl,
        sinceLabel: monthYearLabel(summary.createdAt),
        streakDays: computeCurrentStreakDays(summary.contributionCalendar),
      };
    } catch {
      github = undefined;
    }
  }

  return (
    <Suspense fallback={null}>
      <ProfileClient github={github} />
    </Suspense>
  );
}
