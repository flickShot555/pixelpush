"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Btn } from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/lib/theme";

type FormState = {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  agreed: boolean;
};

function validate(form: FormState): string | null {
  if (!form.name.trim()) return "Please enter your name.";
  if (!form.email.trim()) return "Please enter your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email.";
  if (!form.username.trim()) return "Please enter a username.";
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(form.username.trim())) {
    return "Usernames are 1–39 characters (letters, numbers, hyphens).";
  }
  if (!form.password || form.password.length < 8) return "Password must be at least 8 characters.";
  if (form.password !== form.confirmPassword) return "Passwords do not match.";
  if (!form.agreed) return "Please confirm you agree to continue.";
  return null;
}

export default function SignupPage() {
  const { theme } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    agreed: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => validate(form) === null, [form]);

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
      <div style={{ width: "100%", maxWidth: 560 }}>
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
            Sign up
          </div>
          <div style={{ color: theme.muted, marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
            Create your PixelPush account. You can connect GitHub later from your Profile.
          </div>
        </div>

        <Card style={{ padding: 20 }}>
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
              Full name
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Your name"
              autoComplete="name"
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

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
              Email
            </div>
            <input
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="you@domain.com"
              inputMode="email"
              autoComplete="email"
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

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
              Username
            </div>
            <input
              value={form.username}
              onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
              placeholder="octocat"
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
            <div style={{ marginTop: 6, fontSize: 12, color: theme.faint, lineHeight: 1.5 }}>
              This will be your public PixelPush username (you can connect GitHub later).
            </div>
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
              Password
            </div>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
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

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.muted, marginBottom: 6 }}>
              Confirm password
            </div>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
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

          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              marginTop: 10,
              marginBottom: 14,
              color: theme.muted,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => setForm((s) => ({ ...s, agreed: e.target.checked }))}
              style={{ marginTop: 2 }}
            />
            <span>I agree to continue and connect my GitHub account for verification.</span>
          </label>

          <Btn
            className="w-full"
            style={{ width: "100%" }}
            disabled={!canSubmit || busy}
            onClick={async () => {
              const msg = validate(form);
              if (msg) {
                setError(msg);
                return;
              }
              setError(null);

              setBusy(true);
              try {
                const res = await fetch("/api/signup", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    username: form.username.trim(),
                    password: form.password,
                  }),
                });

                const json = (await res.json().catch(() => null)) as
                  | { ok?: boolean; error?: string; requestId?: string }
                  | null;

                if (!res.ok || !json?.ok) {
                  const base = json?.error ?? "Unable to create account";
                  const withRef = json?.requestId ? `${base} (ref: ${json.requestId})` : base;
                  setError(withRef);
                  setBusy(false);
                  return;
                }

                const qp = new URLSearchParams({
                  identifier: form.email.trim().toLowerCase(),
                });
                router.push(`/login?${qp.toString()}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to create account");
                setBusy(false);
              }
            }}
          >
            {busy ? "Creating account…" : "Create account"}
          </Btn>

          <div style={{ marginTop: 14, fontSize: 13, color: theme.muted, textAlign: "center" }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: theme.accent, textDecoration: "none", fontWeight: 800 }}>
              Log in
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
