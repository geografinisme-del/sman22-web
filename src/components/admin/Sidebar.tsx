"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type GrupMenu = { judul?: string; item: { href: string; label: string; badge?: number }[] };

export function Sidebar({
  grup,
  nama,
  email,
  peran,
  keluar,
  notif = 0,
}: {
  grup: GrupMenu[];
  nama: string;
  email: string;
  peran: string;
  keluar: () => Promise<void>;
  notif?: number;
}) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  // menu aktif = href terpanjang yang cocok dengan alamat sekarang
  const semua = grup.flatMap((g) => g.item.map((i) => i.href));
  const cocok = semua.filter((h) => path === h || (h !== "/admin" && path.startsWith(h + "/"))).sort((a, b) => b.length - a.length)[0];
  const aktif = (h: string) => h === cocok;

  return (
    <aside className="border-b border-black/10 bg-brand-900 text-white print:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:overflow-y-auto lg:border-0">
      <div className="flex h-16 items-center justify-between px-5 lg:h-20">
        <Link href="/admin" className="font-serif text-2xl">
          Admin <em className="text-accent-400">SMAN 22</em>
        </Link>
        <Link href="/admin/notifikasi" aria-label={`Notifikasi${notif ? `, ${notif} belum dibaca` : ""}`} className="relative ml-auto mr-1 rounded-full p-2 hover:bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0" /></svg>
          {notif > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-merah px-1 text-[11px] font-bold">{notif > 99 ? "99+" : notif}</span>}
        </Link>
        <button
          type="button"
          className="rounded-full p-2 hover:bg-white/10 lg:hidden"
          aria-expanded={buka}
          aria-label={buka ? "Tutup menu" : "Buka menu"}
          onClick={() => setBuka((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {buka ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>
      <div className={`${buka ? "block" : "hidden"} px-3 pb-5 lg:flex lg:min-h-[calc(100%-5rem)] lg:flex-col lg:pb-6`}>
        <nav aria-label="Menu admin" className="space-y-5">
          {grup.map((g, gi) => (
            <div key={gi}>
              {g.judul && <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{g.judul}</p>}
              <ul className="space-y-0.5">
                {g.item.map((m) => (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      onClick={() => setBuka(false)}
                      aria-current={aktif(m.href) ? "page" : undefined}
                      className={`block rounded-xl px-4 py-2 text-sm font-medium transition ${
                        aktif(m.href) ? "bg-white text-brand-900" : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {m.label}
                        {m.badge ? (
                          <span className="rounded-full bg-accent-400 px-2 text-xs font-bold text-brand-900" aria-label={`${m.badge} perlu ditindaklanjuti`}>
                            {m.badge}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a href="/" target="_blank" rel="noopener" className="block rounded-xl px-4 py-2 text-sm text-white/60 hover:bg-white/10">
            Lihat website ↗
          </a>
        </nav>
        <div className="mt-6 border-t border-white/10 px-4 pt-5 lg:mt-auto">
          <p className="truncate text-sm font-semibold">{nama || email}</p>
          <p className="truncate text-xs text-white/50">{email}</p>
          <p className="mt-1 text-xs text-accent-400">{peran}</p>
          <form action={keluar}>
            <button type="submit" className="mt-3 text-sm text-white/70 hover:text-white hover:underline">
              Keluar
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
