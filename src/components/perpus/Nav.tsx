"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavPerpus({ kelola }: { kelola: boolean }) {
  const p = usePathname();
  const item = [
    { href: "/admin/perpus", label: "Sirkulasi" },
    { href: "/admin/perpus/katalog", label: "Katalog" },
    { href: "/admin/perpus/literasi", label: "Literasi" },
    { href: "/admin/perpus/pojok", label: "Pojok baca" },
    { href: "/admin/perpus/laporan", label: "Laporan & aturan" },
    ...(kelola ? [{ href: "/admin/perpus/label", label: "Label buku" }] : []),
  ];
  return (
    <nav aria-label="Menu perpustakaan" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm print:hidden">
      {item.map((i) => (
        <Link key={i.href} href={i.href} aria-current={p === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${p === i.href ? "bg-ink text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
