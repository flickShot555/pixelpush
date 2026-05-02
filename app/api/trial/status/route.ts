import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTrialActive } from "@/lib/check-plan";

export const runtime = "nodejs";

function msToDaysCeil(ms: number): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil(ms / day));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const enabled = (process.env.NEXT_PUBLIC_LAUNCH_TRIAL ?? "").trim().toLowerCase() === "true";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, trialEndsAt: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const trialEndsAtIso = user.trialEndsAt ? user.trialEndsAt.toISOString() : null;
  const active = isTrialActive({ trialEndsAt: user.trialEndsAt });

  const daysRemaining = user.trialEndsAt
    ? msToDaysCeil(user.trialEndsAt.getTime() - Date.now())
    : null;

  const eligible = enabled && user.plan === "FREE" && user.trialEndsAt == null;

  return NextResponse.json({
    ok: true,
    enabled,
    plan: user.plan,
    trialEndsAt: trialEndsAtIso,
    active,
    daysRemaining,
    eligible,
  });
}
