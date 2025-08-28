import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth API Route (App Router) — maps both GET and POST requests
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
