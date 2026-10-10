"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function NavMutu() {
  const p = usePathname();
  const q = useSearchParams();
  const sufiks = q.get("k") ? `?k=${q.get("k")}${q.get("periode") ? `&periode=${q.get("periode")}` : ""}` : "";
  const item = [{ href: "/admin/mutu", label: "Dasbor & kesenjangan" }, { href: "/admin/mutu/temuan", label: "Temuan & perbaikan" }, { href: "/admin/mutu/bukti", label: "Repositori bukti" }];
  return (
    <nav aria-label="Menu mutu" className="-mt-4 mb-6 flex gap-2 overflow-x-auto pb-1 text-sm">
      {item.map((i) => (
        <Link key={i.href} href={i.href + sufiks} aria-current={p === i.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 ${p === i.href ? "bg-brand-900 text-white" : "ring-1 ring-black/10 hover:bg-black/5"}`}>{i.label}</Link>
      ))}
    </nav>
  );
}
