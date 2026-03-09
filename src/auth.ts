import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import { Session } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { PrismaClient } from "@prisma/client";
import prisma from "./lib/prisma";

// Create a new instance of PrismaAdapter with the prisma import
// This ensures type compatibility with the adapter
const adapter = PrismaAdapter(prisma as unknown as PrismaClient);

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      organizationId?: string | null;
      theme?: string | null;
      emailVerified?: Date | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: adapter,
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      // Add user ID and theme to session
      if (session.user) {
        session.user.id = user.id;

        // Get the complete user record with theme and organizationId
        try {
          const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { theme: true, organizationId: true, emailVerified: true },
          });

          if (fullUser) {
            // Include theme in the session (if available)
            if (fullUser.theme) {
              session.user.theme = fullUser.theme;
            }

            // Include organizationId in the session (if available)
            if (fullUser.organizationId) {
              session.user.organizationId = fullUser.organizationId;
            }

            // Include emailVerified status in the session
            session.user.emailVerified = fullUser.emailVerified;
          }
        } catch (error) {
          console.error("Failed to fetch user data for session:", error);
        }
      }

      console.log(
        `Auth: Session callback for user ${user.email}, ID: ${
          user.id
        }, OrgID: ${session.user?.organizationId || "none"}`
      );
      return session;
    },
    async jwt({ token, user }) {
      // Add user ID to token if available
      if (user) {
        token.id = user.id;

        // Try to include theme and organizationId in the token
        try {
          // Only needed if you're using JWT strategy, but good to have
          const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { theme: true, organizationId: true },
          });

          if (fullUser) {
            if (fullUser.theme) {
              token.theme = fullUser.theme;
            }
            if (fullUser.organizationId) {
              token.organizationId = fullUser.organizationId;
            }
          }
        } catch (error) {
          console.error("Failed to fetch user data for token:", error);
        }

        console.log(
          `Auth: JWT callback for user ${user.email}, ID: ${user.id}, OrgID: ${
            token.organizationId || "none"
          }`
        );
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
};
