import { getServerSession } from "next-auth/next";

import { AuthButtons } from "@/components/AuthButtons";
import { authOptions } from "@/lib/auth";
import { fetchContributionCalendar } from "@/lib/github";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as unknown as { accessToken?: string })?.accessToken;

  let calendar:
    | Awaited<ReturnType<typeof fetchContributionCalendar>>
    | null = null;
  let error: string | null = null;

  if (accessToken) {
    try {
      calendar = await fetchContributionCalendar({ accessToken });
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            PixelPush
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Milestone 1: read your real GitHub contribution graph and render it.
          </p>
        </div>

        <div className="mt-6">
          <AuthButtons />
        </div>

        {!session && (
          <div className="mt-10 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Connect GitHub to load and render your contribution calendar.
            </p>
          </div>
        )}

        {session && !accessToken && (
          <div className="mt-10 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Signed in, but no GitHub access token was found in the session.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-10 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              GitHub fetch failed
            </p>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {error}
            </p>
          </div>
        )}

        {calendar && (
          <div className="mt-10 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Your contribution grid (52×7)
              </h2>
              <a
                className="text-sm font-medium text-zinc-950 underline dark:text-zinc-50"
                href="/api/github/contributions"
                target="_blank"
                rel="noreferrer"
              >
                View raw JSON
              </a>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="inline-grid grid-flow-col grid-rows-7 gap-1">
                {calendar.weeks.map((week, weekIndex) =>
                  week.contributionDays.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}-${day.date}`}
                      title={`${day.date} — ${day.contributionCount} contributions`}
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: day.color }}
                    />
                  ))
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
              Colors come directly from GitHub’s GraphQL API.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
