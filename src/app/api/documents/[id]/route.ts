import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { policy: { select: { userId: true } } },
  });
  if (!doc || doc.policy.userId !== session.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!fs.existsSync(doc.filePath)) return NextResponse.json({ error: "missing_file" }, { status: 410 });
  const buf = await fs.promises.readFile(doc.filePath);
  // Convert Node.js Buffer -> ArrayBuffer to satisfy BodyInit without relying on Blob.
  const arrayBuffer = new ArrayBuffer(buf.length);
  new Uint8Array(arrayBuffer).set(buf);
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": doc.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
