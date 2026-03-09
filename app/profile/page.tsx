"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/lib/theme";

export default function ProfilePage() {
  const { theme } = useTheme();
  const { data: session } = useSession();

  const username = session?.user?.username ?? "";
  const githubId = session?.user?.githubId;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "var(--pp-font-body)",
      }}
    >
      <div className="mx-auto w-full p-8" style={{ maxWidth: 820 }}>
        <header style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: "var(--pp-font-head)",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            Profile
          </h1>
          <div style={{ color: theme.muted, fontSize: 14, lineHeight: 1.6 }}>
            Manage your PixelPush account, connect GitHub, and sign out.
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--pp-font-head)", fontWeight: 800, marginBottom: 12 }}>
              Account
            </div>

            <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.7 }}>
              <div>
                <span style={{ color: theme.faint }}>Username:</span>{" "}
                <span style={{ color: theme.text, fontWeight: 800 }}>{username || "—"}</span>
              </div>
              <div>
                <span style={{ color: theme.faint }}>Email:</span>{" "}
                <span style={{ color: theme.text, fontWeight: 800 }}>
                  {session?.user?.email ?? "—"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Btn
                className="w-full"
                style={{ width: "100%" }}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Log out
              </Btn>
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--pp-font-head)", fontWeight: 800, marginBottom: 12 }}>
              Password
            </div>

            <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.7, marginBottom: 12 }}>
              If you originally signed up with GitHub, set a password here to enable email/password login.
            </div>

            {pwError ? (
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
                {pwError}
              </div>
            ) : null}

            {pwOk ? (
              <div
                role="status"
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: theme.borderRadius,
                  border: `1px solid ${theme.border2}`,
                  background: theme.surface2,
                  color: theme.text,
                  fontSize: 13,
                }}
              >
                {pwOk}
              </div>
            ) : null}

            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
                New password
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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
                Confirm new password
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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
              disabled={pwBusy || !newPassword || !confirmPassword}
              onClick={async () => {
                setPwError(null);
                setPwOk(null);

                if (newPassword.length < 8) {
                  setPwError("Password must be at least 8 characters.");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setPwError("Passwords do not match.");
                  return;
                }

                setPwBusy(true);
                try {
                  const res = await fetch("/api/account/password", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ password: newPassword }),
                  });

                  const json = (await res.json().catch(() => null)) as
                    | { ok?: boolean; error?: string; requestId?: string }
                    | null;

                  if (!res.ok || !json?.ok) {
                    const base = json?.error ?? "Unable to set password";
                    const withRef = json?.requestId ? `${base} (ref: ${json.requestId})` : base;
                    setPwError(withRef);
                    setPwBusy(false);
                    return;
                  }

                  setNewPassword("");
                  setConfirmPassword("");
                  setPwOk("Password updated. You can now log in with credentials.");
                  setPwBusy(false);
                } catch (e) {
                  setPwError(e instanceof Error ? e.message : "Unable to set password");
                  setPwBusy(false);
                }
              }}
            >
              {pwBusy ? "Saving…" : "Set password"}
            </Btn>
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--pp-font-head)", fontWeight: 800, marginBottom: 12 }}>
              GitHub Connection
            </div>

            <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.7 }}>
              {githubId ? (
                <div>
                  Connected as GitHub user ID <span style={{ color: theme.text, fontWeight: 800 }}>{githubId}</span>.
                </div>
              ) : (
                <div>
                  Not connected yet. Connect GitHub to sync your contribution graph and power progress tracking.
                </div>
              )}
            </div>

            <div className="flex gap-2" style={{ marginTop: 14, flexWrap: "wrap" }}>
              <Btn
                variant={githubId ? "secondary" : "primary"}
                onClick={() => {
                  // Starts OAuth; when already logged in with credentials, NextAuth will attempt to link accounts.
                  void signIn("github", { callbackUrl: "/profile" });
                }}
              >
                {githubId ? "Reconnect GitHub" : "Connect GitHub"}
              </Btn>

              {username ? (
                <Btn variant="ghost" href={`/u/${encodeURIComponent(username)}`}>
                  View Public Profile
                </Btn>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
