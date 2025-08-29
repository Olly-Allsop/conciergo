import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function PolicyDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  const policy = await prisma.policy.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!policy) return notFound();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{policy.provider} — {policy.type}</h1>
        <Link href="/policies" className="px-3 py-1.5 border border-black rounded-md">Back</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Info label="Policy Number" value={policy.policyNumber || "—"} />
        <Info label="Premium" value={policy.premiumPence != null ? `£${(policy.premiumPence/100).toFixed(2)}${policy.paymentFrequency ? `/${policy.paymentFrequency}` : ""}` : "—"} />
        <Info label="Start" value={policy.startDate ? new Date(policy.startDate).toLocaleDateString() : "—"} />
        <Info label="End / Renewal" value={policy.endDate ? new Date(policy.endDate).toLocaleDateString() : "—"} />
        <Info label="Auto‑renew" value={policy.autoRenew ? "Yes" : "No"} />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2">Documents ({policy.documents.length})</h2>
        {policy.documents.length === 0 ? (
          <p className="text-black/70">No documents attached.</p>
        ) : (
          <ul className="space-y-2">
            {policy.documents.map(d => (
              <li key={d.id} className="flex items-center justify-between border border-black/10 rounded-md p-3">
                <div>
                  <div className="font-medium">{d.fileName}</div>
                  <div className="text-sm text-black/60">Uploaded {new Date(d.uploadedAt).toLocaleString()}</div>
                </div>
                <a className="px-3 py-1.5 bg-black text-white rounded-md" href={`/api/documents/${d.id}`}>Download</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-black/60">{label}</div>
      <div className="text-base">{value}</div>
    </div>
  );
}
