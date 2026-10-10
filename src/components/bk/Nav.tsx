"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBk({ konselor, agregat }: { konselor: boolean; agregat: boolean }) {
  const p = usePathname();
  const item = [
    ...(konselor ? [{ href: "/admin/bk", label: "Layanan & kasus" }, { href: "/admin/bk/kasus/baru", label: "+ Kasus" }, { href: "/admin/rujukan-bk", label: "Rujukan guru" }] : []),
    ...(agregat ? [{ href: "/admin/bk/laporan", label: "Laporan agregat" }] : []),
    ...(konselor ? [{ href: "/admin/bk/log", label: "Log akses" }] : []),
  ];
  return (
    <nav aria-label="Menu BK" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm">
      {item.map((i) => (
        <Link key={i.href} href={i.href} aria-current={p === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${p === i.href ? "bg-brand-900 text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
