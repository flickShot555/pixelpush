import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
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
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
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
