"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/lib/theme";

export default function ProfilePage() {
  const { theme } = useTheme();
  const { data: session } = useSession();

  const username = session?.user?.username ?? "";
  const githubId = session?.user?.githubId;

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
