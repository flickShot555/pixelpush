import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const enabled = (process.env.NEXT_PUBLIC_LAUNCH_TRIAL ?? "").trim().toLowerCase() === "true";
  if (!enabled) {
    return NextResponse.json({ ok: false, error: "Trial is not available" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, plan: true, trialEndsAt: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  if (user.plan !== "FREE") {
    return NextResponse.json({ ok: false, error: "Trial is only available on the Free plan" }, { status: 400 });
  }

  if (user.trialEndsAt) {
    return NextResponse.json({ ok: false, error: "Trial has already been activated" }, { status: 400 });
  }

  const now = new Date();
  const trialEndsAt = addDays(now, 7);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { trialEndsAt },
    select: { trialEndsAt: true },
  });

  return NextResponse.json({
    ok: true,
    trialEndsAt: updated.trialEndsAt ? updated.trialEndsAt.toISOString() : null,
  });
}
