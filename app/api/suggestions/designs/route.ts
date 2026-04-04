import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import Groq from "groq-sdk";

import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Body = {
  username: string;
  languages: string[];
  repos: string[];
  theme: string;
  days: number;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user?.plan !== "PRO" && session.user?.plan !== "LIFETIME") {
    return NextResponse.json(
      { error: "AI design suggestions are available in Pro." },
      { status: 403 }
    );
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured" }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const languages = Array.isArray(body?.languages) ? body.languages.filter((x) => typeof x === "string") : [];
  const repos = Array.isArray(body?.repos) ? body.repos.filter((x) => typeof x === "string") : [];
  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";
  const days = typeof body?.days === "number" && Number.isFinite(body.days) ? body.days : NaN;

  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });
  if (!theme) return NextResponse.json({ error: "theme is required" }, { status: 400 });
  if (!Number.isFinite(days) || days <= 0) return NextResponse.json({ error: "days is required" }, { status: 400 });

  const systemPrompt =
    "You are a creative assistant for PixelPush, an app where \n" +
    "developers draw pixel art on their GitHub contribution graph \n" +
    "by making real commits. Suggest pixel art designs that match \n" +
    "the user's tech stack, personality, and selected theme. \n" +
    "The canvas is a 52 columns x 7 rows grid with 5 shade levels. \n" +
    "Always respond in raw JSON only — no markdown, no backticks, \n" +
    "no explanation.";

  const userPrompt =
    `Username: ${username}\n` +
    `Top languages: ${languages.join(", ")}\n` +
    `Top repos: ${repos.join(", ")}\n` +
    `Selected theme: ${theme}\n` +
    `Schedule duration: ${days} days\n\n` +
    "Suggest 3 pixel art design names that would look great on a \n" +
    "52x7 GitHub contribution graph and match this developer's \n" +
    "profile. Return a JSON array of 3 objects each with:\n" +
    "- name (string): short creative design name\n" +
    "- description (string): one sentence describing the design\n" +
    "- whyItFits (string): one sentence explaining why it suits \n" +
    "  this developer\n" +
    "- difficulty: one of 'easy', 'medium', or 'hard'";

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.9,
    max_tokens: 1200,
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown JSON parse error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
