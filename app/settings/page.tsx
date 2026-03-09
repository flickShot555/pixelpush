"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { useTheme } from "@/lib/theme";

// TODO: replace with real session data from NextAuth
const MOCK_USERNAME = "flickShot555";
// TODO: replace with real session data from NextAuth
const MOCK_EMAIL = "flickshot555@github.com";
// TODO: replace with real sync metadata from database
const MOCK_LAST_SYNCED = "Today at 8:42 AM";

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.trim().replace(/^#/, "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return hex;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SettingsPage() {
  const { mode, setMode, theme } = useTheme();
  const router = useRouter();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const dangerBorder = useMemo(() => hexToRgba(theme.danger, 0.2), [theme.danger]);

  return (
    <div className="p-8">
      <div className="w-full" style={{ maxWidth: 640 }}>
        <h1
          style={{
            color: theme.text,
            fontFamily: "var(--pp-font-head)",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 28,
          }}
        >
          Settings
        </h1>

        <Card className="w-full mb-4">
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Account
          </div>

          <div className="flex items-center gap-4">
            <div
              aria-hidden
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${theme.g2}, ${theme.g4})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.onAccent,
                fontFamily: "var(--pp-font-head)",
                fontWeight: 700,
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              F
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ color: theme.text, fontSize: 15, fontWeight: 700 }}>
                {MOCK_USERNAME}
              </div>
              <div style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
                {MOCK_EMAIL}
              </div>
            </div>

            <Btn
              variant="secondary"
              small
              className="ml-auto"
              onClick={() => {
                // TODO: implement NextAuth signOut and GitHub token revocation
                console.log("Disconnect clicked");
              }}
            >
              Disconnect
            </Btn>
          </div>
        </Card>

        <Card className="w-full mb-4">
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Interface Mode
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="cursor-pointer"
              onClick={() => {
                setMode("dev");
                window.localStorage.setItem("pixelpush-mode", "dev");
              }}
              style={{
                padding: "12px 16px",
                borderRadius: theme.borderRadius,
                transition: "all 0.15s",
                border: `2px solid ${mode === "dev" ? theme.accent : theme.border}`,
                background: mode === "dev" ? theme.accentBg : theme.surface2,
              }}
            >
              <div style={{ color: theme.text, fontSize: 13, fontWeight: 700 }}>
                ⌨ Dev Mode
              </div>
              <div style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>
                Dark · Monospace · Minimal
              </div>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => {
                setMode("creative");
                window.localStorage.setItem("pixelpush-mode", "creative");
              }}
              style={{
                padding: "12px 16px",
                borderRadius: theme.borderRadius,
                transition: "all 0.15s",
                border: `2px solid ${mode === "creative" ? theme.accent : theme.border}`,
                background: mode === "creative" ? theme.accentBg : theme.surface2,
              }}
            >
              <div style={{ color: theme.text, fontSize: 13, fontWeight: 700 }}>
                🎨 Creative Mode
              </div>
              <div style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>
                Light · Expressive · Playful
              </div>
            </div>
          </div>
        </Card>

        <Card className="w-full mb-4">
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Notifications
          </div>

          <div
            className="flex items-center justify-between"
            style={{ padding: "10px 0", borderBottom: `1px solid ${theme.border2}` }}
          >
            <div>
              <div style={{ color: theme.text, fontSize: 14, fontWeight: 500 }}>
                Push Notifications
              </div>
              <div style={{ color: theme.muted, fontSize: 12 }}>
                Daily commit reminders via browser
              </div>
            </div>
            <Toggle
              value={pushEnabled}
              onChange={(next) => {
                // TODO: wire to Web Push API subscription in Milestone 8
                setPushEnabled(next);
              }}
            />
          </div>

          <div
            className="flex items-center justify-between"
            style={{ padding: "10px 0", borderBottom: `1px solid ${theme.border2}` }}
          >
            <div>
              <div style={{ color: theme.text, fontSize: 14, fontWeight: 500 }}>
                Email Digest
              </div>
              <div style={{ color: theme.muted, fontSize: 12 }}>
                Daily schedule summary to your email
              </div>
            </div>
            <Toggle
              value={emailEnabled}
              onChange={(next) => {
                // TODO: wire to user notification preferences in database
                setEmailEnabled(next);
              }}
            />
          </div>
        </Card>

        <Card className="w-full mb-4">
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            GitHub Sync
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div style={{ color: theme.muted, fontSize: 14 }}>Last synced</div>
              <div style={{ color: theme.text, fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                {MOCK_LAST_SYNCED}
              </div>
            </div>

            <Btn
              variant="secondary"
              small
              onClick={() => {
                // TODO: trigger manual GitHub graph sync
                console.log("Sync Now clicked");
              }}
            >
              Sync Now 🔄
            </Btn>
          </div>
        </Card>

        <Card className="w-full mb-4">
          <div
            style={{
              color: theme.text,
              fontFamily: "var(--pp-font-head)",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Billing
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div style={{ color: theme.muted, fontSize: 14 }}>
                Current Plan: <span style={{ color: theme.text, fontWeight: 700 }}>Free</span>
              </div>
              <div style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                Upgrade to unlock AI suggestions and more
              </div>
            </div>

            <Btn
              small
              onClick={() => {
                router.push("/pricing");
              }}
            >
              View Pricing
            </Btn>
          </div>
        </Card>

        <Card className="w-full" style={{ border: `1px solid ${dangerBorder}` }}>
          <div
            style={{
              color: theme.danger,
              fontFamily: "var(--pp-font-head)",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Danger Zone
          </div>

          <div className="flex items-center justify-between gap-4">
            <div style={{ color: theme.muted, fontSize: 13 }}>
              Permanently delete your account and all data
            </div>

            <Btn
              variant="secondary"
              small
              style={{
                border: `1px solid ${theme.danger}`,
                color: theme.danger,
              }}
              onClick={() => {
                const ok = window.confirm("Are you sure? This cannot be undone.");
                if (!ok) return;
                // TODO: implement account deletion API call
                console.log("Delete account confirmed");
              }}
            >
              Delete Account
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
