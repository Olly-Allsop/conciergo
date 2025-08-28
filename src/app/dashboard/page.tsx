import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getSession();
  if (!session?.user?.id) {
    return (
      <div>
        <p className="text-black/70">Please sign in to view your dashboard.</p>
        <div className="mt-4">
          <Link href="/" className="underline">Go to home</Link>
        </div>
      </div>
    );
  }

  const [policyCount, upcomingRenewals, gmailAccount] = await Promise.all([
    prisma.policy.count({ where: { userId: session.user.id } }),
    prisma.policy.count({ where: { userId: session.user.id, endDate: { gte: new Date(), lte: new Date(Date.now() + 30*24*3600*1000) } } }),
    prisma.emailAccount.findFirst({ where: { userId: session.user.id, provider: "gmail" } }),
  ]);

  const policies = await prisma.policy.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: "desc" }, take: 10 });

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/policies/new" className="px-3 py-1.5 bg-black text-white rounded-md">Add Policy</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Policies" value={String(policyCount)} sub="" />
        <KPI label="Potential Savings" value="£0" sub="Coming soon" />
        <KPI label="Renewals Due" value={String(upcomingRenewals)} sub="Next 30 days" />
        <KPI label="Annual Spend" value="£0" sub="" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Your Policies</h2>
        <Link href="/policies" className="underline">View All</Link>
      </div>

      {policies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {policies.map((p) => (
            <div key={p.id} className="border border-black/10 rounded-lg p-4">
              <div className="text-sm text-black/60">{p.provider}</div>
              <div className="text-lg font-medium">{p.type}</div>
              <div className="text-sm">Renewal: {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}</div>
              <div className="mt-3 flex gap-2">
                <Link href={`/policies/${p.id}`} className="px-3 py-1.5 border border-black rounded-md">View Policy</Link>
                <button className="px-3 py-1.5 bg-black text-white rounded-md" disabled>Find Better Deal</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-black/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Email Scanner</h3>
          {gmailAccount ? (
            <form
              action={async () => {
                "use server";
                await fetch(
                  `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/gmail/scan`,
                  { method: "POST" }
                );
              }}
            >
              <button className="px-3 py-1.5 bg-black text-white rounded-md">
                Scan New Emails (Gmail)
              </button>
            </form>
          ) : (
            <Link
              href="/api/gmail/connect"
              className="px-3 py-1.5 bg-black text-white rounded-md"
            >
              Connect Gmail
            </Link>
          )}
        </div>
        <div className="text-sm text-black/60 mt-2">
          {gmailAccount
            ? `Connected: ${gmailAccount.email}`
            : "Connect your Gmail account to auto-import policies."}
        </div>
      </div>
    </section>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="text-sm text-black/60">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-black/50">{sub}</div> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-black/10 p-8 text-center">
      <p className="text-black/70">No policies yet.</p>
      <p className="text-sm text-black/60 mt-1">Add one manually or upload a document to get started.</p>
    </div>
  );
}
