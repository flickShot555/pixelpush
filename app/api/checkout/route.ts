import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { paddle } from "@/lib/paddle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? "").trim();
  if (!baseUrl) {
    return NextResponse.json({ error: "NEXTAUTH_URL is not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | { plan?: "pro" | "lifetime" }
    | null;

  const plan = body?.plan;
  if (plan !== "pro" && plan !== "lifetime") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId =
    plan === "pro"
      ? process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID
      : process.env.NEXT_PUBLIC_PADDLE_LIFETIME_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  const transaction = await paddle.transactions.create({
    items: [{ priceId, quantity: 1 }],
    customData: { userId: session.user.id, plan },
    customer: {
      email: session.user.email ?? undefined,
    },
    checkout: {
      // Paddle-hosted checkout should redirect here after completion.
      url: `${baseUrl}/dashboard?upgraded=true`,
    },
  } as unknown as Parameters<typeof paddle.transactions.create>[0]);

  const checkoutUrl = (transaction as unknown as { checkout?: { url?: string } })?.checkout?.url;
  if (!checkoutUrl) {
    return NextResponse.json({ error: "Unable to create checkout" }, { status: 500 });
  }

  // Defensive: ensure we're not accidentally redirecting users away from Paddle-hosted checkout.
  if (checkoutUrl.startsWith(baseUrl)) {
    return NextResponse.json({ error: "Unexpected checkout URL" }, { status: 500 });
  }

  // NOTE: plan is activated via webhook, not this redirect
  return NextResponse.json({ checkoutUrl });
}
