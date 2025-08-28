import { prisma } from "@/lib/prisma";
import { PolicyType } from "@/generated/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NewPolicy() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  async function create(formData: FormData) {
    "use server";
    const s = await getSession();
    if (!s?.user?.id) {
      throw new Error("Unauthorized");
    }
    const userId = s.user.id;
    await prisma.policy.create({
      data: {
        userId,
        type: formData.get("type") as PolicyType,
        provider: String(formData.get("provider") || ""),
        policyNumber: String(formData.get("policyNumber") || ""),
        premiumPence: Number(String(formData.get("premiumPence") || "0")),
        paymentFrequency: String(formData.get("paymentFrequency") || "monthly"),
        startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
        endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
        autoRenew: Boolean(formData.get("autoRenew")),
      },
    });
    redirect("/dashboard");
  }

  return (
    <form action={create} className="space-y-4 max-w-xl">
      <h1 className="text-xl font-semibold">Add Policy</h1>
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-sm text-black/70">Type</span>
          <select name="type" className="border border-black/20 rounded-md px-3 py-2">
            {['CAR','HOME','LIFE','PET','TRAVEL','HEALTH','INCOME_PROTECTION','OTHER'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm text-black/70">Provider</span>
          <input name="provider" className="border border-black/20 rounded-md px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-black/70">Policy Number</span>
          <input name="policyNumber" className="border border-black/20 rounded-md px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-black/70">Premium (pence)</span>
          <input name="premiumPence" type="number" className="border border-black/20 rounded-md px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-black/70">Payment Frequency</span>
          <select name="paymentFrequency" className="border border-black/20 rounded-md px-3 py-2">
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm text-black/70">Start Date</span>
          <input name="startDate" type="date" className="border border-black/20 rounded-md px-3 py-2" />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-black/70">End Date (renewal)</span>
          <input name="endDate" type="date" className="border border-black/20 rounded-md px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 col-span-2">
          <input name="autoRenew" type="checkbox" />
          <span className="text-sm text-black/70">Auto-renew</span>
        </label>
      </div>
      <button className="px-4 py-2 bg-black text-white rounded-md">Save</button>
    </form>
  );
}
