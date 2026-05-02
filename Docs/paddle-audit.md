# Paddle Audit

As-of: 2026-04-30

Scope: checkout initiation, webhook processing, plan gating, session plan sync, customer portal, required env vars, and risks/TODOs.

---

## Architecture (current)

- **Checkout**: client calls a server route that creates a Paddle Transaction and returns a hosted `checkoutUrl`.
- **Activation**: user plan changes are applied **only** via Paddle webhooks (not on the client redirect).
- **Gating**: app code checks `session.user.plan` (derived from DB via NextAuth session callback).
- **Portal**: Pro subscribers can open Paddle’s customer portal from settings.

Key files:
- Paddle SDK init: `lib/paddle.ts`
- Checkout API: `app/api/checkout/route.ts`
- Webhook API: `app/api/webhook/paddle/route.ts`
- Portal API: `app/api/portal/route.ts`
- Session sync: `lib/auth.ts`
- Plan gating helper: `lib/check-plan.ts`

---

## Data model (Prisma)

Relevant fields in `User` (`prisma/schema.prisma`):
- `plan`: `FREE | PRO | LIFETIME`
- `paddleCustomerId` (unique)
- `paddleSubscriptionId` (unique)
- `paddleSubscriptionStatus` (string; webhook-fed)

Webhook dedupe table:
- `WebhookEvent { id, type, processedAt }`

---

## Environment variables (what the code expects)

### Used by code

- `PADDLE_API_KEY` (server): required by `lib/paddle.ts` (non-null asserted).
- `NEXT_PUBLIC_PADDLE_ENV` (public): if `"sandbox"` uses sandbox; otherwise production.
- `PADDLE_WEBHOOK_SECRET` (server): required by `app/api/webhook/paddle/route.ts` (non-null asserted).
- `NEXT_PUBLIC_PADDLE_PRO_PRICE_ID` (public): used by `/api/checkout` when plan is `pro`.
- `NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID` (public): used by `/api/checkout` when plan is `lifetime`.
- `NEXTAUTH_URL` (server): required by `/api/checkout` to set the post-checkout redirect.

### Gaps

- `.env.example` currently includes **no Paddle variables**. As a result, a fresh local setup will fail at runtime when hitting checkout/webhook/portal paths.

---

## Checkout flow (what happens today)

Server route: `POST /api/checkout` (`app/api/checkout/route.ts`)

1. Auth: requires `session.user.id`.
2. Input: `{ plan: "pro" | "lifetime" }`.
3. Price resolution:
   - `pro` → `NEXT_PUBLIC_PADDLE_PRO_PRICE_ID`
   - `lifetime` → `NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID`
4. Paddle Transaction created with:
   - `items: [{ priceId, quantity: 1 }]`
   - `customData: { userId: session.user.id, plan }`
   - `customer.email: session.user.email` (if present)
   - `checkout.url: ${NEXTAUTH_URL}/dashboard?upgraded=true`
5. Returns `{ checkoutUrl }`.

Notes:
- The redirect is cosmetic (“show banner”) only; **plan activation is webhook-driven**.
- There is a defensive check preventing redirect URLs that start with `NEXTAUTH_URL`.

---

## Webhook flow (what happens today)

Server route: `POST /api/webhook/paddle` (`app/api/webhook/paddle/route.ts`)

### Signature verification
- Reads `paddle-signature` header and raw body.
- If signature missing: returns `200 { ok: true }`.
- If unmarshal fails: returns `200 { ok: true }`.

### Idempotency (dedupe)
- Attempts to extract Paddle event id (`eventId` / `event_id` / `id`).
- Writes a row to `WebhookEvent` and returns early if it already exists.
- If it cannot write the row, it proceeds anyway (comment claims Paddle will retry “failed deliveries”, but note: the handler still returns 200).

### Events handled

- `subscription.created`
  - Reads `customData.userId` and `customData.plan`.
  - If `plan !== "lifetime"`: updates `User`:
    - `plan = PRO`
    - `paddleSubscriptionId = subscriptionId`
    - `paddleSubscriptionStatus = "active"`
    - `paddleCustomerId = customerId`

- `transaction.completed`
  - Reads `customData.userId` and `customData.plan`.
  - If `plan == "lifetime"`: sets `plan = LIFETIME`, clears subscription id.
  - If `plan == "pro"`: sets `plan = PRO`.

- `subscription.canceled`
  - Finds users by `paddleSubscriptionId` and sets `plan = FREE`, `paddleSubscriptionStatus = "canceled"`.

- `subscription.updated`
  - Finds users by `paddleSubscriptionId` and updates `paddleSubscriptionStatus`.

Notes:
- The code contains a TODO (“add idempotency check…”) even though a dedupe table already exists.
- The webhook handler is intentionally “always 200” and swallows errors.

---

## Plan gating (current behavior)

Helper: `lib/check-plan.ts`
- `isPro({ plan })` returns true for `PRO` and `LIFETIME`.

Usage examples:
- Server-enforced Pro gate: `POST /api/schedule/recalculate`.
- Server-enforced Pro gate: `GET /api/suggestions/designs`.
- Client UX: several pages read `session.user.plan` to show Pro-only buttons.

---

## Session plan sync (why upgrades show quickly)

File: `lib/auth.ts`
- The **NextAuth session callback reads `User.plan` from the database on every session build**, so a webhook-driven plan change shows up without needing the user to log out/in.

Impact:
- Good: upgrades/cancellations appear quickly in UI.
- Tradeoff: adds a DB query to session creation.

---

## Customer portal (current behavior)

Server route: `GET /api/portal` (`app/api/portal/route.ts`)

1. Auth: requires `session.user.id`.
2. Reads `User.plan`, `paddleCustomerId`, `paddleSubscriptionId`.
3. Requires `user.plan === "PRO"`.
4. Calls `paddle.customerPortalSessions.create(customerId, [subscriptionId])`.
5. Returns `{ portalUrl }`.

Note:
- Lifetime users do not have a subscription and therefore will not receive a portal URL (this may be intended, but it should be explicitly documented as a product decision).

---

## Risks / TODOs (actionable)

1. **Webhook observability risk**
   - Current behavior: missing/invalid signature or secret results in a 200 response and a silent no-op.
   - Suggested: return non-2xx (or at least log loudly / store failed webhook payloads) when `PADDLE_WEBHOOK_SECRET` is missing or verification fails.

2. **Dedupe reliability mismatch**
   - If `WebhookEvent` write fails, the handler still returns 200 and processing may duplicate on retries.
   - Suggested: treat dedupe write as required for processing, or store a “processed” flag transactionally per user/subscription.

3. **Portal eligibility**
   - Only `plan === PRO` can open portal; lifetime cannot.
   - Suggested: confirm product intent and update UI copy accordingly.

4. **Env var drift**
   - `.env.example` is missing Paddle-related env vars.
   - Suggested: add all required Paddle env vars and brief comments.

5. **Plan source of truth**
   - Webhook uses `customData.plan` to infer lifetime vs pro.
   - Suggested: ensure price IDs map to intended plans server-side and consider validating webhook payload vs known Paddle price IDs.
