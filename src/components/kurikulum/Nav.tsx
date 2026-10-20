"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEM = [
  { href: "/admin/kurikulum", label: "Struktur" },
  { href: "/admin/kurikulum/atp", label: "CP, TP & ATP" },
  { href: "/admin/perangkat-ajar", label: "Perangkat ajar" },
  { href: "/admin/materi", label: "Materi digital" },
  { href: "/admin/kokurikuler", label: "Kokurikuler" },
  { href: "/admin/supervisi", label: "Supervisi" },
];

export function NavKurikulum() {
  const p = usePathname();
  const aktif = ITEM.map((i) => i.href).filter((h) => p === h || p.startsWith(h + "/")).sort((a, b) => b.length - a.length)[0];
  return (
    <nav aria-label="Menu kurikulum" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm print:hidden">
      {ITEM.map((i) => (
        <Link key={i.href} href={i.href} aria-current={aktif === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${aktif === i.href ? "bg-ink text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
