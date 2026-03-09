import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SignupBody = {
  name?: string;
  email?: string;
  username?: string;
  password?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!name) return badRequest("Name is required");
  if (!email) return badRequest("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Email is invalid");
  if (!username) return badRequest("Username is required");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    return badRequest("Username must be 1–39 characters (letters, numbers, hyphens)");
  }
  if (!password || password.length < 8) {
    return badRequest("Password must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        passwordHash,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    const requestId = crypto.randomUUID();
    const msg = e instanceof Error ? e.message : "Unable to create account";

    // Log full error server-side for Vercel function logs.
    console.error("/api/signup failed", { requestId, error: e });

    if (msg.includes("DATABASE_URL is not set")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Server is not configured (missing database)",
          requestId,
        },
        { status: 500 }
      );
    }

    if (e instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Database connection failed",
          requestId,
        },
        { status: 500 }
      );
    }

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // P2021: table does not exist (common if migrations weren't applied)
      if (e.code === "P2021") {
        return NextResponse.json(
          {
            ok: false,
            error: "Database schema is not initialized",
            requestId,
          },
          { status: 500 }
        );
      }

      // Unique constraint violation
      if (e.code === "P2002") {
        return badRequest("That email or username is already in use");
      }
    }

    // Best-effort unique constraint messaging.
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
      return badRequest("That email or username is already in use");
    }

    return NextResponse.json(
      { ok: false, error: "Unable to create account", requestId },
      { status: 500 }
    );
  }
}
