import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createOAuthClient } from "@/lib/gmail";
import { getSession } from "@/lib/auth";
import { extractPolicy } from "@/lib/extraction";
import fs from "fs";
import path from "path";

// Local copy of the shape we actually use so we don't depend on deep googleapis types
interface MessagePart {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null; attachmentId?: string | null } | null;
  parts?: MessagePart[] | null;
  headers?: Array<{ name?: string | null; value?: string | null }> | null;
}

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

    // insurance-related query last 2y
    const q =
      "subject:(policy OR renewal OR insurance OR coverage OR premium) newer_than:2y";
    const res = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: 50,
    });
    const messages = res.data.messages || [];

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

    let processed = 0,
      created = 0,
      updated = 0;

    for (const msg of messages) {
      if (!msg.id) continue;
      processed++;

      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      // collect attachment info to link later
      const saved: { filePath: string; fileName: string; contentType?: string }[] =
        [];

      // pull headers
      const headers =
        Object.fromEntries(
          (full.data.payload?.headers || []).map((h) => [h.name!, h.value || ""])
        ) as Record<string, string>;
      const from = headers["From"];

      // gather text & save pdfs
      let text = "";
      const payload = full.data.payload as MessagePart | undefined;
      const stack: MessagePart[] = payload ? [payload] : [];
      while (stack.length) {
        const part = stack.pop();
        if (!part) continue;
        if (part.parts) stack.push(...part.parts);
        if (part.mimeType === "text/plain" && part.body?.data) {
          text +=
            "\n" + Buffer.from(part.body.data, "base64").toString("utf8");
        }
        if (part.filename && part.body?.attachmentId) {
          try {
            const att = await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: msg.id,
              id: part.body.attachmentId,
            });
            if (att.data.data) {
              const dataBuf = Buffer.from(
                att.data.data.replace(/-/g, "+").replace(/_/g, "/"),
                "base64"
              );
              const safe = `${msg.id}-${part.filename}`.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
              );
              const fullPath = path.join(uploadsDir, safe);
              await fs.promises.writeFile(fullPath, dataBuf);

              // If PDF, extract text
              if (part.filename.toLowerCase().endsWith(".pdf")) {
                try {
                  const { default: pdfParse } = await import("pdf-parse");
                  const parsed = await pdfParse(dataBuf);
                  if (parsed.text) text += "\n" + parsed.text;
                } catch {
                  /* ignore pdf parse failures */
                }
              }

              // Keep for Document linking
              saved.push({
                filePath: fullPath,
                fileName: part.filename,
                contentType: part.mimeType ?? undefined,
              });
            }
          } catch {
            /* ignore attachment failures */
          }
        }
      }

      const extracted = extractPolicy(from, text);
      if (!extracted.provider) continue;

      const existing = await prisma.policy.findFirst({
        where: {
          userId: session.user.id,
          provider: extracted.provider,
          ...(extracted.policyNumber
            ? { policyNumber: extracted.policyNumber }
            : extracted.endDate
            ? { endDate: extracted.endDate }
            : {}),
        },
      });

      if (existing) {
        await prisma.policy.update({
          where: { id: existing.id },
          data: {
            type: extracted.type || existing.type,
            premiumPence:
              extracted.premiumPence ?? existing.premiumPence,
            paymentFrequency:
              extracted.paymentFrequency ?? existing.paymentFrequency,
            startDate: extracted.startDate ?? existing.startDate,
            endDate: extracted.endDate ?? existing.endDate,
            autoRenew:
              typeof extracted.autoRenew === "boolean"
                ? extracted.autoRenew
                : existing.autoRenew,
          },
        });
        updated++;
      } else if (extracted.policyNumber || extracted.endDate) {
        const newPolicy = await prisma.policy.create({
          data: {
            userId: session.user.id,
            provider: extracted.provider,
            policyNumber: extracted.policyNumber,
            type: extracted.type || "OTHER",
            premiumPence: extracted.premiumPence,
            paymentFrequency: extracted.paymentFrequency,
            startDate: extracted.startDate,
            endDate: extracted.endDate,
            autoRenew: !!extracted.autoRenew,
          },
        });
        created++;

        // Link documents to newly created policy
        for (const file of saved) {
          await prisma.document.create({
            data: {
              policyId: newPolicy.id,
              fileName: file.fileName,
              filePath: file.filePath,
              contentType: file.contentType,
            },
          });
        }
      }

      // Link documents to updated policy
      if (existing && saved.length) {
        for (const file of saved) {
          await prisma.document.create({
            data: {
              policyId: existing.id,
              fileName: file.fileName,
              filePath: file.filePath,
              contentType: file.contentType,
            },
          });
        }
      }
    }

    return NextResponse.json({
      searched: true,
      processed,
      created,
      updated,
    });
  } catch (error) {
    console.error('Gmail scan error:', error);
    return NextResponse.json({ 
      error: "scan_failed", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
