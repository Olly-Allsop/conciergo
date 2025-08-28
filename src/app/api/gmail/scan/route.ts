import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createOAuthClient } from "@/lib/gmail";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const account = await prisma.emailAccount.findFirst({ where: { userId: session.user.id, provider: "gmail" } });
  if (!account?.refreshToken) return NextResponse.json({ error: "not_connected" }, { status: 400 });

  try {
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ 
      refresh_token: account.refreshToken, 
      access_token: account.accessToken, 
      expiry_date: account.tokenExpiry?.getTime() 
    });
    
    // Handle token refresh if needed
    if (account.tokenExpiry && account.tokenExpiry < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          accessToken: credentials.access_token,
          tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        }
      });
    }
    
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Query for insurance-related emails from the past 2 years
    const q = 'subject:(policy OR renewal OR insurance OR coverage OR premium OR claim) newer_than:2y';
    const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 25 });
    const messages = res.data.messages || [];
    
    // Get basic metadata for the first 5 messages to help with debugging/development
    const sampleMessages = [];
    if (messages.length > 0) {
      for (let i = 0; i < Math.min(5, messages.length); i++) {
        try {
          const message = await gmail.users.messages.get({
            userId: 'me',
            id: messages[i].id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          });
          
          const headers = message.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || '';
          
          sampleMessages.push({ id: messages[i].id, subject, from });
        } catch (error) {
          console.error('Error fetching message details:', error);
        }
      }
    }

    return NextResponse.json({ 
      searched: true, 
      count: messages.length,
      sampleMessages,
      query: q
    });
  } catch (error) {
    console.error('Gmail scan error:', error);
    return NextResponse.json({ 
      error: "scan_failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
