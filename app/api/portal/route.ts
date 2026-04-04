import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { paddle } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, paddleCustomerId: true, paddleSubscriptionId: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.plan !== "PRO") {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const customerId = user.paddleCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: "Missing billing customer" }, { status: 400 });
  }

  const subscriptionId = user.paddleSubscriptionId;
  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing billing subscription" }, { status: 400 });
  }

  const portalSession = await paddle.customerPortalSessions.create(customerId, [subscriptionId]);
  const portalUrl = portalSession.urls.general.overview;

  return NextResponse.json({ portalUrl });
}
