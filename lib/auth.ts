import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

// Vercel deploys provide a stable host per deployment via VERCEL_URL.
// If NEXTAUTH_URL is missing (or mistakenly set to localhost), NextAuth may generate
// incorrect OAuth callback URLs in production/preview.
const vercelUrl = (process.env.VERCEL_URL ?? "").trim();
const nextAuthUrl = (process.env.NEXTAUTH_URL ?? "").trim();
const isVercel = (process.env.VERCEL ?? "").trim().length > 0;

if (vercelUrl) {
  const derived = `https://${vercelUrl}`;
  if (!nextAuthUrl) {
    process.env.NEXTAUTH_URL = derived;
  } else if (isVercel && nextAuthUrl.includes("localhost")) {
    process.env.NEXTAUTH_URL = derived;
  }
}

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  providers: (() => {
    const providers: NextAuthOptions["providers"] = [
      CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = (credentials?.identifier ?? "").trim();
        const password = credentials?.password ?? "";

        if (!identifier || !password) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
        });

        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          username: user.username,
          githubId: user.githubId ?? undefined,
        };
      },
    }),
    ];

    const githubClientId = (process.env.GITHUB_CLIENT_ID ?? "").trim();
    const githubClientSecret = (process.env.GITHUB_CLIENT_SECRET ?? "").trim();

    // Only enable GitHub OAuth when it is configured.
    // If configured with empty strings, NextAuth will throw and break all /api/auth/* routes.
    if (githubClientId && githubClientSecret) {
      providers.push(
        GitHubProvider({
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          authorization: {
            params: {
              scope: "read:user user:email repo",
            },
          },
          profile(profile) {
            // Ensure required Prisma fields exist for user creation.
            return {
              id: String(profile.id),
              githubId: String(profile.id),
              username: profile.login,
              name: profile.name,
              email: profile.email,
              image: profile.avatar_url,
              avatarUrl: profile.avatar_url,
            };
          },
        })
      );
    }

    return providers;
  })(),
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      // Credentials sign-in (local PixelPush account)
      if (user && typeof user === "object") {
        const u = user as { username?: string; githubId?: string };
        if (u.username) token.username = u.username;
        if (u.githubId) token.githubId = u.githubId;
      }

      // On sign-in, pull the latest user metadata from the database.
      // This is used for feature gating (plan) and to keep the session consistent.
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, githubId: true, plan: true },
        });

        if (dbUser?.username) token.username = dbUser.username;
        if (dbUser?.githubId) token.githubId = dbUser.githubId;
        if (dbUser?.plan) token.plan = dbUser.plan;
      }

      if (profile && typeof profile === "object") {
        const p = profile as { id?: number | string; login?: string };
        if (p.id !== undefined) token.githubId = String(p.id);
        if (p.login) token.username = p.login;
      }

      // Default any missing plan to FREE.
      if (!token.plan) token.plan = "FREE";

      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.username) {
          session.user.username = token.username;
        }
        if (token.githubId) {
          session.user.githubId = token.githubId;
        }

        session.user.plan = token.plan ?? "FREE";
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== "github") return;
      const image = (user as { image?: string | null }).image ?? null;
      if (!image) return;

      // Keep User.image and User.avatarUrl aligned with the GitHub avatar.
      // This ensures the avatar displays consistently even after logging in via credentials.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          image,
          avatarUrl: image,
        },
        select: { id: true },
      });
    },
  },
};
