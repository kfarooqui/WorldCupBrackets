import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-3">
        <span className="font-bold text-[var(--accent)]">Admin</span>
        <Link href="/admin/requests" className="text-sm hover:underline">Requests</Link>
        <Link href="/admin/results" className="text-sm hover:underline">Results</Link>
        <Link href="/admin/settings" className="text-sm hover:underline">Settings</Link>
      </div>
      {children}
    </div>
  );
}
