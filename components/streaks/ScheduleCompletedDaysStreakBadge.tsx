"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";

type ApiResponse =
  | { ok: true; streakDays: number }
  | { ok: false; error: string };

export function ScheduleCompletedDaysStreakBadge({ username }: { username: string }) {
  const [data, setData] = useState<{ username: string; streakDays: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/streaks/schedule?username=${encodeURIComponent(username)}`);
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setData({ username, streakDays: 0 });
          return;
        }
        setData({ username, streakDays: json.streakDays });
      } catch {
        if (!cancelled) setData({ username, streakDays: 0 });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const isLoading = !data || data.username !== username;
  const label = isLoading ? "…" : String(data.streakDays);
  return <Badge>📅 {label} day schedule streak</Badge>;
}
