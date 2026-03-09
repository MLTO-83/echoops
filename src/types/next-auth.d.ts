import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
      organizationId?: string;
      theme?: string;
    } & DefaultSession["user"];
  }
}
