"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavSarpras({ lihat, kelola }: { lihat: boolean; kelola: boolean }) {
  const p = usePathname();
  const item = [
    { href: "/admin/sarpras", label: "Inventaris", boleh: lihat },
    { href: "/admin/sarpras/peminjaman", label: "Peminjaman", boleh: true },
    { href: "/admin/sarpras/kerusakan", label: "Laporan kerusakan", boleh: true },
    { href: "/admin/sarpras/ruang", label: "Ruang", boleh: kelola },
    { href: "/admin/sarpras/label", label: "Label QR", boleh: kelola },
  ].filter((i) => i.boleh);
  return (
    <nav aria-label="Menu sarpras" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm print:hidden">
      {item.map((i) => (
        <Link key={i.href} href={i.href} aria-current={p === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${p === i.href ? "bg-ink text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
