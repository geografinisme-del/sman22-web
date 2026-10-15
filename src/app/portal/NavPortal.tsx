"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Menu portal siswa/orang tua: bergulir menyamping di ponsel, menu aktif ditandai garis bawah & aria-current. */
export function NavPortal({ menu }: { menu: { href: string; label: string }[] }) {
  const path = usePathname();
  const aktif = (href: string) => (href === "/portal" ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label="Menu portal" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3">
      {menu.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          aria-current={aktif(m.href) ? "page" : undefined}
          className="relative shrink-0 px-3 py-3 text-[0.9375rem] font-medium text-[#3b414b] transition-colors duration-150 hover:text-[#1f2328] aria-[current=page]:font-semibold aria-[current=page]:text-[var(--tema-utama)] aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-current"
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}
