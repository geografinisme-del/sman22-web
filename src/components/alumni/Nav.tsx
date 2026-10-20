"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavAlumni({ kelola }: { kelola: boolean }) {
  const p = usePathname();
  const item = [
    { href: "/admin/alumni", label: "Ringkasan" },
    ...(kelola ? [{ href: "/admin/alumni/pendaftaran", label: "Verifikasi" }, { href: "/admin/alumni/layanan", label: "Layanan & moderasi" }] : []),
    { href: "/admin/alumni/tracer", label: "Tracer study" },
  ];
  return (
    <nav aria-label="Menu alumni" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm">
      {item.map((i) => (
        <Link key={i.href} href={i.href} aria-current={p === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${p === i.href ? "bg-ink text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
