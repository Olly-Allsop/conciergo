import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

function daysFromNow(days: number) {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST() {
  const windows = [60, 30, 14, 7, 1];
  const results: Record<string, number> = {};

  for (const w of windows) {
    const start = daysFromNow(w);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const due = await prisma.policy.findMany({
      where: { endDate: { gte: start, lt: end } },
      include: { user: true },
    });

    results[w] = due.length;

    // Optional email if SMTP configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      for (const p of due) {
        if (!p.user?.email) continue;
        await transporter.sendMail({
          from: `Conciergo <no-reply@conciergo.app>`,
          to: p.user.email,
          subject: `Reminder: ${p.type} policy renewal in ${w} day(s)`,
          text: `Your ${p.type} policy with ${p.provider} renews around ${p.endDate?.toDateString()}.`,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
