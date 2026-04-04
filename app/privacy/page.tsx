// TODO: replace placeholder content with real legal copy reviewed by a lawyer before going live

"use client";

import type { ReactNode } from "react";

import { PublicNav } from "@/components/ui/PublicNav";
import { useTheme } from "@/lib/theme";

export const dynamic = "force-static";

const LAST_UPDATED = "April 4, 2026";

function PlaceholderParagraph({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <p
      style={{
        margin: "10px 0 0",
        fontStyle: "italic",
        color: theme.faint,
        borderLeft: `3px solid ${theme.warn}`,
        paddingLeft: 12,
        lineHeight: 1.7,
      }}
    >
      [ PLACEHOLDER — update before launch ] {children}
    </p>
  );
}

export default function PrivacyPage() {
  const { theme } = useTheme();
  const showBanner =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_LEGAL_DRAFT === "true";

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "var(--pp-font-body)" }}>
      <PublicNav />

      <div className="mx-auto" style={{ maxWidth: 720, padding: "48px 24px" }}>
        {showBanner ? (
          <div
            role="alert"
            style={{
              background: `color-mix(in srgb, ${theme.warn} 15%, transparent)`,
              border: `1px solid ${theme.warn}`,
              color: theme.warn,
              borderRadius: theme.borderRadius,
              padding: "12px 16px",
              marginBottom: 32,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            This page contains placeholder content and must be updated with real legal copy before launching PixelPush
            to the public.
          </div>
        ) : null}

        <h1
          style={{
            margin: 0,
            fontFamily: "var(--pp-font-head)",
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          Privacy Policy
        </h1>

        <div style={{ marginTop: 10, color: theme.muted, fontSize: 14 }}>
          Last updated: {LAST_UPDATED}
        </div>

        <section style={{ marginTop: 28 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Information We Collect</h2>
          <PlaceholderParagraph>Describe the categories of information collected.</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>How We Use Your Information</h2>
          <PlaceholderParagraph>Explain how collected data is used to provide and improve the service.</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>GitHub Data</h2>
          <PlaceholderParagraph>Explain what GitHub data is accessed and how it is used.</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Cookies</h2>
          <PlaceholderParagraph>Describe cookies and similar technologies used by PixelPush.</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Third-Party Services</h2>
          <PlaceholderParagraph>
            List third-party providers and what they do (e.g., hosting, analytics, billing).
          </PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Data Retention</h2>
          <PlaceholderParagraph>Explain retention periods and deletion practices.</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Your Rights</h2>
          <PlaceholderParagraph>Describe user rights (access, correction, deletion, objection).</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Security</h2>
          <PlaceholderParagraph>Summarize security practices and limitations.</PlaceholderParagraph>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, fontFamily: "var(--pp-font-head)" }}>Contact Us</h2>
          <PlaceholderParagraph>Provide contact information for privacy inquiries.</PlaceholderParagraph>
        </section>

        <footer
          style={{
            marginTop: 40,
            paddingTop: 18,
            borderTop: `1px solid ${theme.border}`,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {[
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
            { href: "/refund", label: "Refund" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                color: theme.muted,
                fontSize: 13,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.textDecoration = "none";
              }}
            >
              {l.label}
            </a>
          ))}
        </footer>
      </div>
    </main>
  );
}
