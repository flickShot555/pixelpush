import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  if (!session || !accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  try {
    const calendar = await fetchContributionCalendar({ accessToken, from, to });
    return Response.json({ calendar });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
