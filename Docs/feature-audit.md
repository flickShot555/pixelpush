# PixelPush Feature Audit

As-of: 2026-04-30

This audit is intentionally blunt. It’s based on scanning the repo (App Router pages, API routes, libs, and TODO/placeholder markers). “Working” means there is an end-to-end code path that can succeed in a real deployment (given required env vars).

---

## SECTION 1 — WORKING FEATURES

| Feature | Files involved (route / component / lib) | What it does | Status |
|---|---|---|---|
| Landing page | `app/page.tsx`, `components/landing/LandingScreen.tsx`, `components/ui/PublicNav.tsx`, `lib/theme.tsx` | Public marketing page with animated contribution-grid demo and CTAs. | ✅ Working |
| App shell navigation (desktop + mobile) | `components/AppShell.tsx`, `components/ui/*`, `components/pwa/PwaInstallButton.tsx` | Provides sidebar / bottom-nav layout for authenticated app pages. | ✅ Working |
| Theme system (Dev/Creative) | `lib/theme.tsx`, `app/providers.tsx`, `app/layout.tsx`, `app/onboarding/page.tsx` | Switches UI theme tokens and typography between modes. | ✅ Working |
| Signup (credentials) | `app/signup/page.tsx`, `app/api/signup/route.ts`, `lib/prisma.ts`, `prisma/schema.prisma` | Creates a local PixelPush account with password hashing and uniqueness checks. | ✅ Working |
| Login (credentials) | `app/login/page.tsx`, `app/login/LoginClient.tsx`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts` | Signs users in via NextAuth CredentialsProvider. | ✅ Working |
| GitHub OAuth connect (optional) | `lib/auth.ts`, `app/profile/page.tsx` | Connects GitHub via NextAuth GitHub provider when env vars are configured. | ✅ Working |
| Session + plan in session | `lib/auth.ts`, `next-auth.d.ts` | Enriches session with `user.id`, `user.plan`, `subscriptionStatus`, and (when present) GitHub `accessToken`. | ✅ Working |
| Auth redirect middleware | `middleware.ts` | Redirects unauthenticated users away from app pages to `/login`. | ✅ Working |
| Password set/change | `app/profile/page.tsx`, `app/api/account/password/route.ts` | Allows setting a password (useful for GitHub-first users) and updating it. | ✅ Working |
| GitHub contribution calendar fetch (authed) | `app/api/github/contributions/route.ts`, `lib/github.ts` | Reads the user’s GitHub contribution calendar via GraphQL using stored OAuth token. | ✅ Working |
| GitHub repo/language fetch (authed) | `app/api/github/repos/route.ts`, `lib/github.ts` | Fetches top repos + language info for AI prompts. | ✅ Working |
| Design candidate generation (AI) | `app/design/DesignClient.tsx`, `app/api/design/candidates/route.ts`, `lib/github.ts`, `lib/schedule.ts` | Generates 5 candidate 52×7 target designs using Groq, preserving locked pixels for the current week. | ✅ Working |
| AI design name suggestions (Pro-gated) | `app/design/DesignClient.tsx`, `app/api/suggestions/designs/route.ts` | Uses Groq to suggest 3 design names/descriptions based on repos/languages/theme. | ✅ Working |
| Activate a design + generate schedule | `app/api/design/activate/route.ts`, `lib/schedule.ts`, `lib/graph-utils.ts`, `prisma/schema.prisma` | Creates an active design and schedules day-by-day commit targets in the DB. | ✅ Working |
| Get active design | `app/api/design/active/route.ts`, `app/design/DesignClient.tsx` | Reads the currently active design metadata. | ✅ Working |
| Discard active design | `app/api/design/discard/route.ts`, `app/design/DesignClient.tsx` | Marks the active design as abandoned. | ✅ Working |
| Schedule view (month filter) | `app/schedule/page.tsx`, `app/schedule/ScheduleClient.tsx`, `app/api/schedule/route.ts` | Displays schedule entries for a month, sourced from DB. | ✅ Working |
| Schedule sync (per-day update from GitHub) | `app/schedule/ScheduleClient.tsx`, `app/api/schedule/sync/route.ts`, `lib/github.ts` | Updates a selected day’s actual commit count/status using GitHub calendar data. | ✅ Working |
| Schedule recalculation (Pro-gated, server-enforced) | `app/api/schedule/recalculate/route.ts`, `lib/check-plan.ts` | Regenerates schedule from “today forward” for Pro/Lifetime users only. | ✅ Working |
| Dashboard progress/stats | `app/dashboard/page.tsx`, `app/api/progress/route.ts` | Shows target vs current grid, streak days, days remaining, and upcoming targets. | ✅ Working |
| Progress details + social sharing actions | `app/progress/page.tsx`, `app/api/progress/route.ts` | Displays milestones and share actions that link to public share pages. | ✅ Working |
| Public profile page | `app/u/[username]/page.tsx`, `app/u/[username]/ProfileClient.tsx`, `prisma/schema.prisma` | Shows a public user profile with active design progress and completed designs. | ✅ Working |
| Share card data (public) | `app/api/share-card/data/route.ts`, `lib/github.ts`, `lib/graph-utils.ts` | Produces JSON payload used to render an OG image (target/current grids, labels, etc.). | ✅ Working |
| Share card image generation (edge) | `app/api/share-card/route.tsx` | Renders a PNG via `next/og` for social previews. | ✅ Working |
| Public streak badges (GitHub + PixelPush) | `app/api/streaks/github/route.ts`, `app/api/streaks/schedule/route.ts`, `components/streaks/*` | Returns streak day counts (public endpoints) and renders badges. | ✅ Working |
| Paddle checkout initiation | `app/pricing/PricingClient.tsx`, `app/api/checkout/route.ts`, `lib/paddle.ts` | Creates a Paddle-hosted checkout session and redirects user to Paddle. | ✅ Working |
| Paddle webhook plan sync | `app/api/webhook/paddle/route.ts`, `lib/paddle.ts`, `prisma/schema.prisma` | Processes Paddle events to update user plan/subscription fields. | ✅ Working |
| Paddle customer portal (Pro subs only) | `app/settings/page.tsx`, `app/api/portal/route.ts` | Generates a Paddle portal link to manage/cancel a Pro subscription. | ✅ Working |
| PWA install prompt + manifest | `components/pwa/*`, `public/manifest.webmanifest`, `public/sw.js` | Provides “install app” UI and PWA metadata. | ✅ Working |

---

## SECTION 2 — PARTIALLY WORKING FEATURES

| Feature | Files involved | What works | What is missing or mocked | Status |
|---|---|---|---|---|
| Settings page (Account section) | `app/settings/page.tsx` | UI renders and reads `session.user.plan` for billing label. | Uses mock username/email and mock “last synced”; Disconnect is TODO; multiple actions only `console.log`. | ⚠️ Partial |
| Notifications settings | `app/settings/page.tsx`, `components/ui/Toggle.tsx` | Toggles render and can be flipped locally. | No Web Push subscription, no DB persistence, no notification delivery system. | ⚠️ Partial |
| Manual GitHub sync (Settings) | `app/settings/page.tsx` | Button exists. | No API call wired; only logs. | ⚠️ Partial |
| Account deletion | `app/settings/page.tsx` | UI and confirmation dialog exist. | No deletion API route; no DB cleanup; no session invalidation. | ⚠️ Partial |
| Legal pages (Terms/Privacy/Refund) | `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/refund/page.tsx` | Pages exist and render. | Content is explicitly placeholder and marked TODO (not production-ready). | ⚠️ Partial |
| “Target design” storage | `app/api/target/route.ts`, `lib/graph-utils.ts`, `prisma/schema.prisma` | Endpoint upserts a per-user target design and returns it. | Comment states it’s a temporary default generator; not truly user-generated/selected; no UI to edit/choose. | ⚠️ Partial |
| Pricing page feature matrix | `app/pricing/PricingClient.tsx` | Checkout buttons work (calls `/api/checkout`). | Many listed features are marketing/aspirational and have no code behind them (see SECTION 3). | ⚠️ Partial |
| AI suggestion “schedule duration” input | `app/design/DesignClient.tsx`, `app/api/suggestions/designs/route.ts` | AI suggestion request works. | `days: 68` is hardcoded with a TODO (not derived from real schedule duration). | ⚠️ Partial |
| Pro gating consistency | `lib/check-plan.ts`, `app/design/DesignClient.tsx`, `app/api/schedule/recalculate/route.ts`, `app/api/design/candidates/route.ts` | Some gates are server-enforced (e.g. schedule recalculation, name suggestions). | Other expensive AI calls (candidate generation) are not Pro-gated; plan gating is inconsistent across endpoints. | ⚠️ Partial |
| Webhook operational safety | `app/api/webhook/paddle/route.ts` | Signature verification + dedupe record are implemented. | Uses non-null assertion on `PADDLE_WEBHOOK_SECRET`; if unset, events get dropped silently (always 200). Also contains a confusing TODO about idempotency that doesn’t match current behavior. | ⚠️ Partial |

---

## SECTION 3 — NOT IMPLEMENTED

| Feature | Where it is referenced | Status |
|---|---|---|
| GitHub disconnect / token revocation | `app/settings/page.tsx` (Disconnect button TODO) | ❌ Missing |
| Account deletion API | `app/settings/page.tsx` (“Delete account” TODO) | ❌ Missing |
| Web Push subscription + reminders | `app/settings/page.tsx` (TODO) | ❌ Missing |
| Email digest system | `app/settings/page.tsx` (TODO) | ❌ Missing |
| Portfolio fit scores | `app/pricing/PricingClient.tsx` feature matrix | ❌ Missing |
| Custom image upload | `app/pricing/PricingClient.tsx` feature matrix | ❌ Missing |
| Org / team graphs | `app/pricing/PricingClient.tsx` feature matrix | ❌ Missing |
| Watermark-free sharing (watermarking system at all) | Only referenced in `app/pricing/PricingClient.tsx` | ❌ Missing |
| Timelapse GIF export | `app/pricing/PricingClient.tsx` feature matrix | ❌ Missing |
| Priority support workflow | `app/pricing/PricingClient.tsx` feature matrix | ❌ Missing |

---

## SECTION 4 — SECURITY GAPS

| What is unprotected (or under-protected) | File location | Recommended fix | Status |
|---|---|---|---|
| Public share-card data uses stored GitHub OAuth tokens for *any* PixelPush username | `app/api/share-card/data/route.ts` | Add a user-controlled “public profile/share enabled” flag and refuse requests when disabled; consider using only public GitHub data (no stored token) for public endpoints; add rate limiting. | 🔒 Needs Fix |
| Public schedule streak leaks private schedule-derived activity by username | `app/api/streaks/schedule/route.ts` | Require opt-in public setting, or restrict to completed designs only; add rate limiting. | 🔒 Needs Fix |
| Mixed identity strategy: many routes resolve user by `email/username/githubId` instead of `session.user.id` | Multiple API routes (e.g. `app/api/design/*`, `app/api/schedule/*`, `app/api/account/password/route.ts`) | Prefer using `session.user.id` as the primary key to avoid edge cases where session fields drift; only fall back if strictly necessary. | 🔒 Needs Fix |
| Webhook misconfiguration is hard to detect (returns 200 when secret missing/invalid) | `app/api/webhook/paddle/route.ts` | If `PADDLE_WEBHOOK_SECRET` is missing, log loudly and return non-2xx so Vercel/monitoring can catch it; optionally validate payload schema and store failed deliveries. | 🔒 Needs Fix |
