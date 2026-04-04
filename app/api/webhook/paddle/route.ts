import { NextResponse } from "next/server";

import { paddle } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object";
}

function getPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function getPathString(value: unknown, path: string[]): string | undefined {
  const v = getPath(value, path);
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}

export async function POST(request: Request) {
  // Paddle requires a fast response.
  const signature = request.headers.get("paddle-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let event: unknown;
  try {
    event = await paddle.webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    );
  } catch {
    // Always return 200 quickly; do not leak details.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Idempotency: dedupe on Paddle's event id.
  const eventRecordForId: UnknownRecord = isRecord(event) ? event : {};
  const eventId: string =
    getPathString(eventRecordForId, ["eventId"]) ??
    getPathString(eventRecordForId, ["event_id"]) ??
    getPathString(eventRecordForId, ["id"]) ??
    "";

  const eventTypeForId: string =
    getPathString(eventRecordForId, ["eventType"]) ??
    getPathString(eventRecordForId, ["event_type"]) ??
    getPathString(eventRecordForId, ["event_name"]) ??
    getPathString(eventRecordForId, ["type"]) ??
    "";

  if (eventId) {
    try {
      const webhookEvents = (prisma as any).webhookEvent as any;

      const existing = await webhookEvents.findUnique({
        where: { id: eventId },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      await webhookEvents.create({
        data: { id: eventId, type: eventTypeForId || "unknown" },
        select: { id: true },
      });
    } catch {
      // If we can't write the idempotency record, do not block webhook processing.
      // Paddle will retry failed deliveries.
    }
  }

  const eventRecord: UnknownRecord = isRecord(event) ? event : {};
  const eventName: string =
    getPathString(eventRecord, ["eventType"]) ??
    getPathString(eventRecord, ["event_name"]) ??
    getPathString(eventRecord, ["name"]) ??
    getPathString(eventRecord, ["type"]) ??
    "";

  const data: unknown = isRecord(eventRecord["data"]) ? eventRecord["data"] : eventRecord;

  const planFromCustomData =
    (getPathString(data, ["customData", "plan"]) ??
      getPathString(data, ["custom_data", "plan"]) ??
      "")
      .toLowerCase();

  // TODO: add idempotency check to prevent duplicate processing
  try {
    if (eventName === "subscription.created") {
      const userId =
        getPathString(data, ["customData", "userId"]) ??
        getPathString(data, ["custom_data", "userId"]);
      const subscriptionId = getPathString(data, ["id"]) ?? "";
      const customerId =
        getPathString(data, ["customerId"]) ??
        getPathString(data, ["customer_id"]) ??
        getPathString(data, ["customer", "id"]) ??
        "";

      if (userId && planFromCustomData !== "lifetime") {
        await prisma.user.update({
          where: { id: String(userId) },
          data: {
            plan: "PRO",
            paddleSubscriptionId: subscriptionId || null,
            paddleSubscriptionStatus: "active",
            paddleCustomerId: customerId || null,
          },
          select: { id: true },
        });
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (eventName === "transaction.completed") {
      const userId =
        getPathString(data, ["customData", "userId"]) ??
        getPathString(data, ["custom_data", "userId"]);
      const customerId =
        getPathString(data, ["customerId"]) ??
        getPathString(data, ["customer_id"]) ??
        getPathString(data, ["customer", "id"]) ??
        "";

      if (userId) {
        if (planFromCustomData === "lifetime") {
          await prisma.user.update({
            where: { id: String(userId) },
            data: {
              plan: "LIFETIME",
              paddleSubscriptionId: null,
              paddleSubscriptionStatus: "active",
              paddleCustomerId: customerId || null,
            },
            select: { id: true },
          });
        } else if (planFromCustomData === "pro") {
          await prisma.user.update({
            where: { id: String(userId) },
            data: {
              plan: "PRO",
              paddleSubscriptionStatus: "active",
              paddleCustomerId: customerId || null,
            },
            select: { id: true },
          });
        }
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (eventName === "subscription.canceled") {
      const subscriptionId = getPathString(data, ["id"]) ?? "";
      if (subscriptionId) {
        await prisma.user.updateMany({
          where: { paddleSubscriptionId: subscriptionId },
          data: {
            plan: "FREE",
            paddleSubscriptionStatus: "canceled",
          },
        });
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (eventName === "subscription.updated") {
      const subscriptionId = getPathString(data, ["id"]) ?? "";
      const status =
        getPathString(data, ["status"]) ??
        getPathString(data, ["subscriptionStatus"]) ??
        "";

      if (subscriptionId) {
        await prisma.user.updateMany({
          where: { paddleSubscriptionId: subscriptionId },
          data: {
            paddleSubscriptionStatus: status || null,
          },
        });
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch {
    // Ignore errors to keep webhook fast; retry behavior is handled by Paddle.
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
