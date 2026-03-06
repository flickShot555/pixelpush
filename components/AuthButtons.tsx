"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading session…</div>
    );
  }

  if (!session) {
    return (
      <button
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        onClick={() => signIn("github")}
      >
        Connect GitHub
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-zinc-700 dark:text-zinc-300">
        Signed in as {session.user?.name ?? session.user?.email ?? "GitHub user"}
      </div>
      <button
        className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium dark:border-white/[.145]"
        onClick={() => signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
