import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-10">
      <div className="rounded-xl border border-black/10 p-10 bg-white">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">Your Complete Insurance Dashboard</h1>
          <p className="text-black/60">
            Manage all your policies, track renewals, and discover better deals automatically.
            Conciergo scans your emails to find and organize your insurance documents.
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="px-4 py-2 bg-black text-white rounded-md">Scan Emails Now</Link>
            <Link href="/upload" className="px-4 py-2 border border-black rounded-md">Upload Documents</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Policies", value: "12", sub: "+2 this month" },
          { label: "Potential Savings", value: "£2,340", sub: "Based on 8 policies" },
          { label: "Renewals Due", value: "3", sub: "Next 30 days" },
          { label: "Annual Spend", value: "£12,460", sub: "-£340 vs last year" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-black/10 p-4">
            <div className="text-sm text-black/60">{kpi.label}</div>
            <div className="text-2xl font-semibold">{kpi.value}</div>
            <div className="text-xs text-black/50">{kpi.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
