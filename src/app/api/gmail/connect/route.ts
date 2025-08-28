import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateAuthUrl } from "@/lib/gmail";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/api/auth/signin", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  const url = generateAuthUrl();
  return NextResponse.redirect(url);
}
