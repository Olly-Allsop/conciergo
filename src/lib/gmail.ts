import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
];

export function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${getBaseUrl()}/api/gmail/auth/callback`;
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  ) as OAuth2Client;
}

export function generateAuthUrl() {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

export async function getProfileEmail(oauth2Client: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.emailAddress || "";
}
