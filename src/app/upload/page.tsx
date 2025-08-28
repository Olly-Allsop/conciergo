import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  async function upload(formData: FormData) {
    "use server";
    const file = formData.get("file") as File | null;
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    const filePath = path.join(uploadsDir, `${Date.now()}-${file.name}`);
    await fs.promises.writeFile(filePath, buffer);
  }

  return (
    <form action={upload} className="space-y-4">
      <h1 className="text-xl font-semibold">Upload Documents</h1>
      <input type="file" name="file" className="block" />
      <button className="px-4 py-2 bg-black text-white rounded-md">Upload</button>
    </form>
  );
}
