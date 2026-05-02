"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { useTheme } from "@/lib/theme";
import { isTrialActive } from "@/lib/check-plan";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function daysRemaining(endsAtIso: string, now = new Date()): number {
  const end = new Date(endsAtIso);
  if (Number.isNaN(end.getTime())) return 0;
  const day = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / day));
}

export function TrialBanner() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: session, update } = useSession();

  const enabled = (process.env.NEXT_PUBLIC_LAUNCH_TRIAL ?? "").trim().toLowerCase() === "true";
  const plan = session?.user?.plan ?? "FREE";
  const trialEndsAt = session?.user?.trialEndsAt ?? null;

  const trialActive = useMemo(() => {
    return isTrialActive({ trialEndsAt });
  }, [trialEndsAt]);

  const trialExpired = Boolean(trialEndsAt) && !trialActive;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;
  if (plan === "PRO" || plan === "LIFETIME") return null;

  const message = trialActive && trialEndsAt
    ? `Trial active — ${daysRemaining(trialEndsAt)} day(s) left (ends ${formatShortDate(trialEndsAt)}).`
    : trialExpired && trialEndsAt
      ? `Your trial ended on ${formatShortDate(trialEndsAt)}.`
      : "Start a 7-day free trial to unlock Pro features.";

  return (
    <div style={{ padding: "16px 0" }}>
      <Card
        elevated
        style={{
          padding: 14,
          border: `1px solid ${theme.accentBorder}`,
          background: theme.surface,
        }}
      >
        <div className="flex items-center justify-between gap-4" style={{ flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <div
              style={{
                color: theme.text,
                fontWeight: 800,
                fontSize: 13,
                fontFamily: "var(--pp-font-body)",
              }}
            >
              Free Trial
            </div>
            <div style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>
              {message}
            </div>
            {error ? (
              <div style={{ color: theme.danger, fontSize: 12, marginTop: 6, fontWeight: 700 }}>
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {!trialEndsAt ? (
              <Btn
                small
                disabled={busy}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/trial/activate", { method: "POST" });
                    const json = (await res.json().catch(() => null)) as
                      | { ok?: boolean; error?: string; trialEndsAt?: string }
                      | null;

                    if (!res.ok || !json?.ok) {
                      setError(json?.error || "Unable to activate trial");
                      setBusy(false);
                      return;
                    }

                    await update();
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Unable to activate trial");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Starting…" : "Start Trial"}
              </Btn>
            ) : null}

            <Btn
              small
              variant="secondary"
              onClick={() => {
                router.push("/pricing");
              }}
            >
              View Pricing
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
