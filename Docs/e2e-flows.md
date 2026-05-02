# PixelPush E2E Flows

As-of: 2026-04-30

Legend:
- ✅ Implemented and should work end-to-end (given required env vars)
- ⚠️ Works but incomplete / mocked / inconsistent
- ❌ Not implemented
- 🔒 Implemented but has a security/privacy/auth concern

---

## Flow Health Summary

| # | Flow | Health | Notes |
|---:|---|---|---|
| 1 | Credentials signup | ✅ | Solid validations + Prisma create. |
| 2 | Credentials login | ✅ | NextAuth CredentialsProvider → onboarding redirect. |
| 3 | GitHub OAuth connect | ✅ | Works when GitHub env vars set; stores token in NextAuth account. |
| 4 | Fetch GitHub contributions (authed) | ✅ | Uses stored OAuth token → GitHub GraphQL calendar. |
| 5 | Generate AI design candidates | ⚠️ | Not Pro-gated; depends on Groq env/config and GitHub token. |
| 6 | Activate design → generate schedule | ✅ | Creates Design + ScheduleEntry rows. |
| 7 | View schedule (calendar/list) | ✅ | Month-scoped entries loaded from DB. |
| 8 | Sync a day’s commits from GitHub | ✅ | POST updates ScheduleEntry actual count/status. |
| 9 | Recalculate schedule from today (Pro) | ✅ | Server-enforced Pro/Lifetime gate. |
| 10 | Dashboard + progress stats | ✅ | `/api/progress` powers dashboard + progress page. |
| 11 | Public profile + share link | 🔒 | Public endpoints expose schedule/progress details without explicit opt-in. |
| 12 | Paddle upgrade + webhook plan sync + portal | ⚠️ | Webhook returns 200 even if secret missing; portal is Pro-only (lifetime excluded). |

---

## 1) Credentials signup

1. ✅ User opens `/signup` (`app/signup/page.tsx`).
2. ✅ Client validates fields and POSTs JSON to `/api/signup` (`app/api/signup/route.ts`).
3. ✅ Server validates + hashes password + `prisma.user.create(...)`.
4. ✅ Client redirects to `/login?identifier=...`.

## 2) Credentials login

1. ✅ User opens `/login` (`app/login/page.tsx`, `app/login/LoginClient.tsx`).
2. ✅ Client calls `signIn("credentials")` with identifier/password.
3. ✅ NextAuth credentials provider verifies user (`lib/auth.ts`) and issues a session.
4. ✅ Client redirects to `/onboarding` (then onward to app routes).

## 3) GitHub OAuth connect

1. ✅ User clicks “Continue with GitHub” on login OR “Connect GitHub” on profile (`app/login/LoginClient.tsx`, `app/profile/page.tsx`).
2. ✅ NextAuth GitHub provider flow begins (`lib/auth.ts`).
3. ✅ On callback, NextAuth persists GitHub account tokens in the `Account` table (NextAuth schema via Prisma).
4. ✅ Session callback exposes `accessToken` for API routes that fetch GitHub data.

## 4) Fetch GitHub contributions (authenticated)

1. ✅ UI triggers fetch (e.g. Design overlay preview) (`app/design/DesignClient.tsx`).
2. ✅ GET `/api/github/contributions` (`app/api/github/contributions/route.ts`).
3. ✅ Server checks session + `accessToken` and calls `fetchContributionCalendar` (`lib/github.ts`).
4. ✅ Client converts calendar → 52×7 grid (`lib/graph-utils.ts`) for display.

## 5) Generate AI design candidates

1. ✅ User opens `/design` (`app/design/page.tsx`, `app/design/DesignClient.tsx`).
2. ✅ Client requests candidates for a theme: GET `/api/design/candidates?theme=...`.
3. ✅ Server checks session + GitHub token, fetches repos/languages + current contributions, then calls Groq (`app/api/design/candidates/route.ts`).
4. ⚠️ Client normalizes response and falls back to local canned designs if AI fails (`genMidnightCat`, etc.).
5. ⚠️ Not Pro-gated and may be expensive; dependent on Groq configuration.

## 6) Activate design → generate schedule

1. ✅ User selects a candidate design and clicks “Generate Schedule” (`app/design/DesignClient.tsx`).
2. ✅ Client POSTs `{ name, theme, grid }` to `/api/design/activate`.
3. ✅ Server checks session, ensures user has GitHub connected, creates Design + ScheduleEntry rows (`app/api/design/activate/route.ts`, `lib/schedule.ts`).
4. ✅ Client navigates to `/schedule`.

## 7) View schedule (calendar/list)

1. ✅ User opens `/schedule` (`app/schedule/ScheduleClient.tsx`).
2. ✅ Client enforces `view` + `month` query params in URL.
3. ✅ GET `/api/schedule?month=YYYY-MM` returns `{ design, entries }` (`app/api/schedule/route.ts`).
4. ✅ UI renders calendar grid or list view and uses entry `status` and counts.

## 8) Sync a day’s commits from GitHub

1. ✅ In schedule calendar view, user clicks a target day (`app/schedule/ScheduleClient.tsx`).
2. ✅ Client POSTs `{ date }` to `/api/schedule/sync`.
3. ✅ Server checks session + token, re-fetches GitHub calendar and updates that day’s actual count + status (`app/api/schedule/sync/route.ts`, `lib/github.ts`).
4. ✅ Client reloads schedule month data.

## 9) Recalculate schedule from today (Pro)

1. ✅ Pro user clicks “Recalculate from Today” (`app/schedule/ScheduleClient.tsx`).
2. ✅ Client POSTs `/api/schedule/recalculate`.
3. ✅ Server enforces plan gate (`lib/check-plan.ts`) and regenerates entries from today (`app/api/schedule/recalculate/route.ts`, `lib/schedule.ts`).
4. ✅ Client reloads current month.

## 10) Dashboard + progress stats

1. ✅ User opens `/dashboard` or `/progress` (`app/dashboard/page.tsx`, `app/progress/page.tsx`).
2. ✅ UI fetches `/api/progress` (polling on dashboard) (`app/api/progress/route.ts`).
3. ✅ Server checks session + token, syncs schedule-derived progress, computes streak + completion, returns grids + stats.
4. ✅ UI renders target/current grids and milestone stats.

## 11) Public profile + share link

1. ✅ User shares a link like `/u/:username` (built in `app/progress/page.tsx`).
2. ✅ Public profile page loads (`app/u/[username]/page.tsx`).
3. 🔒 Public streak endpoints are accessible by username (e.g. `/api/streaks/schedule`) and expose schedule-derived activity without opt-in.
4. 🔒 Share-card data endpoint is public and can use stored GitHub OAuth tokens server-side for any username (`app/api/share-card/data/route.ts`).

## 12) Paddle upgrade + webhook plan sync + portal

1. ✅ User clicks “Upgrade” on pricing (`app/pricing/PricingClient.tsx`).
2. ✅ Client POSTs `/api/checkout` with `{ plan: "pro" | "lifetime" }` (`app/api/checkout/route.ts`).
3. ✅ Server creates Paddle transaction with `customData: { userId, plan }` and returns `checkoutUrl`.
4. ✅ User completes Paddle-hosted checkout and is redirected back to `/dashboard?upgraded=true`.
5. ✅ Paddle sends webhook → `/api/webhook/paddle` updates the user’s plan/subscription IDs (`app/api/webhook/paddle/route.ts`).
6. ⚠️ If `PADDLE_WEBHOOK_SECRET` is missing/incorrect, the handler can silently no-op while still returning 200.
7. ✅ Pro subscriber can open portal: GET `/api/portal` returns a Paddle portal URL (`app/api/portal/route.ts`).
8. ⚠️ Portal is explicitly restricted to `plan === "PRO"`; lifetime purchasers won’t get a portal link (may be intentional, but it’s a product decision).
