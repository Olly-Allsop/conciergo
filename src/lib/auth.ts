import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

/**
 * NextAuth v4 configuration shared between API route and
 * any server-side utilities that need to read the session.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    /**
     * Persist the user `id` in the JWT token right after sign-in so that we can
     * read it later in `session()`.
     */
    async jwt({ token, user }) {
      // Persist the user id to the JWT if it exists
      const typedUser = user as (User & { id: string }) | undefined;
      if (typedUser?.id) {
        (token as JWT & { id?: string }).id = typedUser.id;
      }
      return token as JWT;
    },
    /**
     * Expose the user `id` on the client by copying it from the JWT token to
     * the returned session object.
     */
    async session({ session, token }) {
      const typedSession = session as Session & {
        user: Session["user"] & { id?: string };
      };
      const typedToken = token as JWT & { id?: string };

      if (typedSession.user && typedToken.id) {
        typedSession.user.id = typedToken.id;
      }
      return typedSession;
    },
  },
  secret: process.env.AUTH_SECRET,
};

/**
 * Convenience helper for fetching the current session in
 * server components / server actions.
 */
export function getSession() {
  return getServerSession(authOptions);
}
