import { NextResponse } from "next/server";
import { createOAuthClient, getProfileEmail, getBaseUrl } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { OAuth2Client } from "google-auth-library";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error) return NextResponse.redirect(`${getBaseUrl()}/dashboard?error=${encodeURIComponent(error)}`);
  if (!code) return NextResponse.redirect(`${getBaseUrl()}/dashboard?error=missing_code`);

  const session = await getSession();
  if (!session?.user?.id) return NextResponse.redirect(`${getBaseUrl()}/api/auth/signin`);

  // Ensure the client is strongly typed to avoid `any`
  const oauth2Client = createOAuthClient() as OAuth2Client;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const email = await getProfileEmail(oauth2Client);

  await prisma.emailAccount.upsert({
    where: { id: `${session.user.id}-gmail` },
    update: {
      provider: "gmail",
      email,
      scope: tokens.scope || undefined,
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
    create: {
      id: `${session.user.id}-gmail`,
      userId: session.user.id,
      provider: "gmail",
      email,
      scope: tokens.scope || undefined,
      accessToken: tokens.access_token || undefined,
      refreshToken: tokens.refresh_token || undefined,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
  });

  return NextResponse.redirect(`${getBaseUrl()}/dashboard?gmail=connected`);
}
