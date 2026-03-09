import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  password?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const password = body.password ?? "";
  if (!password || password.length < 8) {
    return badRequest("Password must be at least 8 characters");
  }

  const email = session.user?.email ?? undefined;
  const username = (session.user as unknown as { username?: string })?.username;
  const githubId = (session.user as unknown as { githubId?: string })?.githubId;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email: email.toLowerCase() } : undefined,
        username ? { username } : undefined,
        githubId ? { githubId } : undefined,
      ].filter(Boolean) as Array<{ email?: string; username?: string; githubId?: string }>,
    },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const requestId = crypto.randomUUID();
    console.error("/api/account/password failed", { requestId, error: e });
    return NextResponse.json(
      { ok: false, error: "Unable to set password", requestId },
      { status: 500 }
    );
  }
}
