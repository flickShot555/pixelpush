"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";

type ApiResponse =
  | { ok: true; connected: true; streakDays: number }
  | { ok: true; connected: false; streakDays: null }
  | { ok: false; error: string };

export function GitHubCommitStreakBadge({ username }: { username: string }) {
  const [data, setData] = useState<
    | null
    | { username: string; connected: false }
    | { username: string; connected: true; streakDays: number }
  >(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/streaks/github?username=${encodeURIComponent(username)}`);
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;

        if (!res.ok || !json.ok) {
          setData({ username, connected: false });
          return;
        }

        if (!json.connected) {
          setData({ username, connected: false });
          return;
        }

        setData({ username, connected: true, streakDays: json.streakDays });
      } catch {
        if (!cancelled) setData({ username, connected: false });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const isLoading = !data || data.username !== username;

  if (isLoading) {
    return <Badge>🐙 … day GitHub streak</Badge>;
  }

  if (!data.connected) {
    return <Badge>🐙 GitHub not connected</Badge>;
  }

  return <Badge>🐙 {data.streakDays} day GitHub streak</Badge>;
}
