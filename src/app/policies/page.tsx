import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PoliciesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  const policies = await prisma.policy.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { documents: true } } },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your Policies</h1>
        <Link href="/policies/new" className="px-3 py-1.5 bg-black text-white rounded-md">Add Policy</Link>
      </div>
      {policies.length === 0 ? (
        <p className="text-black/70">No policies yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {policies.map((p) => (
            <div key={p.id} className="border border-black/10 rounded-lg p-4">
              <div className="text-sm text-black/60">{p.provider}</div>
              <div className="text-lg font-medium">{p.type}</div>
              <div className="text-sm">Renewal: {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}</div>
              <div className="text-sm text-black/60">Documents: {p._count.documents}</div>
              <div className="mt-3 flex gap-2">
                <Link href={`/policies/${p.id}`} className="px-3 py-1.5 border border-black rounded-md">View Policy</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
