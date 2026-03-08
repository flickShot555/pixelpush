import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
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
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
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
    }),
  ],
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

      if (profile && typeof profile === "object") {
        const p = profile as { id?: number | string; login?: string };
        if (p.id !== undefined) token.githubId = String(p.id);
        if (p.login) token.username = p.login;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (session.user) {
        if (token.username) {
          session.user.username = token.username;
        }
        if (token.githubId) {
          session.user.githubId = token.githubId;
        }
      }
      return session;
    },
  },
};
