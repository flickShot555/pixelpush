"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/lib/theme";

export function LoginClient({ initialIdentifier }: { initialIdentifier: string }) {
  const { theme } = useTheme();
  const router = useRouter();
  const { status } = useSession();

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already signed in, follow the requested flow: onboarding → dashboard.
    if (status === "authenticated") router.push("/onboarding");
  }, [router, status]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              margin: "0 auto 14px",
              background: `linear-gradient(135deg, ${theme.g3}, ${theme.g4})`,
              border: `1px solid ${theme.accentBorder}`,
            }}
          />
          <div
            style={{
              fontFamily: "var(--pp-font-head)",
              fontWeight: 900,
              fontSize: 32,
              letterSpacing: "-0.03em",
            }}
          >
            Log in
          </div>
          <div style={{ color: theme.muted, marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
            Log in to your PixelPush account.
          </div>
        </div>

        <Card style={{ padding: 20 }}>
          <Btn
            className="w-full"
            style={{ width: "100%", marginBottom: 10 }}
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setError(null);
              void signIn("github", { callbackUrl: "/onboarding" });
            }}
          >
            Continue with GitHub
          </Btn>

          <div style={{ marginBottom: 12, color: theme.faint, fontSize: 12, textAlign: "center" }}>
            Or log in with your email and password
          </div>

          {identifier ? (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.border2}`,
                background: theme.surface2,
                color: theme.muted,
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontWeight: 800, color: theme.text, marginBottom: 4 }}>
                You’re almost there
              </div>
              <div>Prefilled: {identifier}</div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.danger}`,
                background: `color-mix(in srgb, ${theme.danger} 10%, ${theme.surface} 90%)`,
                color: theme.text,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
              Email or username
            </div>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@domain.com"
              autoComplete="username"
              style={{
                width: "100%",
                height: 40,
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.text,
                padding: "0 12px",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
              Password
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: "100%",
                height: 40,
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.text,
                padding: "0 12px",
                outline: "none",
              }}
            />
          </label>

          <Btn
            className="w-full"
            style={{ width: "100%" }}
            disabled={busy || !identifier.trim() || !password}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const res = await signIn("credentials", {
                  redirect: false,
                  identifier: identifier.trim(),
                  password,
                  callbackUrl: "/onboarding",
                });

                if (!res || res.error) {
                  setError("Invalid login");
                  setBusy(false);
                  return;
                }

                router.push("/onboarding");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to log in");
                setBusy(false);
              }
            }}
          >
            {busy ? "Logging in…" : "Log in"}
          </Btn>

          <div style={{ marginTop: 14, fontSize: 13, color: theme.muted, textAlign: "center" }}>
            New here?{" "}
            <a href="/signup" style={{ color: theme.accent, textDecoration: "none", fontWeight: 800 }}>
              Create an account
            </a>
          </div>
        </Card>

        <div style={{ marginTop: 14, fontSize: 12, color: theme.faint, textAlign: "center" }}>
          Developed by Aepostrophee
        </div>
      </div>
    </main>
  );
}
