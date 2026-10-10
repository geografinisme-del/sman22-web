"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sekolah } from "@/content/sekolah";
import { menu } from "@/content/menu";

export function Header() {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);
  const [discroll, setDiscroll] = useState(false);
  const aktif = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  useEffect(() => {
    const onScroll = () => setDiscroll(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Di beranda, header transparan di atas foto hero sampai halaman di-scroll
  const transparan = pathname === "/" && !discroll && !buka;

  return (
    <header className={`fixed inset-x-0 top-0 z-40 px-2 transition-[padding] duration-500 sm:px-3 ${transparan ? "pt-3 sm:pt-5" : "pt-2 sm:pt-3"}`}>
      <div
        className={`mx-auto flex h-14 items-center justify-between rounded-full transition-all duration-500 sm:h-16 ${
          transparan
            ? "max-w-[90rem] bg-transparent px-3 text-white sm:px-7"
            : "max-w-6xl bg-kertas/80 pl-3 pr-2 text-tinta sm:pl-4 shadow-[0_8px_30px_-12px_rgb(18_24_49/0.25)] ring-1 ring-black/5 backdrop-blur-xl"
        }`}
      >
        <Link href="/" className="flex items-center gap-3" onClick={() => setBuka(false)}>
          <Image src={sekolah.logo} alt="" width={44} height={44} className="h-9 w-9 sm:h-10 sm:w-10" priority />
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold tracking-tight sm:text-lg">{sekolah.namaPendek}</span>
            <span className={`block text-[10px] uppercase tracking-[0.2em] ${transparan ? "text-white/70" : "text-black/50"}`}>
              Sejak {sekolah.tahunBerdiri}
            </span>
          </span>
        </Link>

        <nav aria-label="Menu utama" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {menu.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  aria-current={aktif(m.href) ? "page" : undefined}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    aktif(m.href)
                      ? transparan
                        ? "bg-white/15"
                        : "bg-tinta text-white"
                      : transparan
                        ? "hover:bg-white/10"
                        : "hover:bg-black/5"
                  }`}
                >
                  {m.label}
                </Link>
              </li>
            ))}
            <li className="ml-2">
              <Link
                href="/masuk"
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  transparan ? "bg-white text-tinta hover:bg-mentega" : "bg-kobalt text-white hover:bg-kobalt-tua"
                }`}
              >
                Masuk
              </Link>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className={`rounded-full p-2 lg:hidden ${transparan ? "hover:bg-white/10" : "hover:bg-black/5"}`}
          aria-expanded={buka}
          aria-controls="menu-hp"
          aria-label={buka ? "Tutup menu" : "Buka menu"}
          onClick={() => setBuka((v) => !v)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {buka ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>

      {buka && (
        <nav id="menu-hp" aria-label="Menu utama" className="mt-2 max-h-[calc(100svh-5.5rem)] overflow-y-auto rounded-[2rem] bg-kertas shadow-xl ring-1 ring-black/5 lg:hidden">
          <ul className="mx-auto max-w-7xl px-5 py-6">
            {menu.map((m, i) => (
              <li key={m.href} className="naik border-b border-black/10" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={m.href}
                  onClick={() => setBuka(false)}
                  aria-current={aktif(m.href) ? "page" : undefined}
                  className={`flex items-baseline justify-between py-4 font-serif text-4xl ${
                    aktif(m.href) ? "italic text-merah" : ""
                  }`}
                >
                  {m.label}
                  <span className="font-sans text-xs text-black/40">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
            <li className="naik pt-6" style={{ animationDelay: `${menu.length * 50}ms` }}>
              <Link href="/masuk" onClick={() => setBuka(false)} className="inline-block rounded-full bg-brand-900 px-6 py-3 font-semibold text-white">
                Masuk portal siswa / orang tua / guru
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
