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
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        transparan ? "bg-transparent text-white" : "border-b border-black/5 bg-krem/90 text-tinta backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setBuka(false)}>
          <Image src={sekolah.logo} alt="" width={44} height={44} className="h-10 w-10 sm:h-11 sm:w-11" priority />
          <span className="leading-tight">
            <span className="block font-serif text-xl sm:text-2xl">{sekolah.namaPendek}</span>
            <span className={`block text-[11px] uppercase tracking-[0.2em] ${transparan ? "text-white/70" : "text-black/50"}`}>
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
                        : "bg-brand-900 text-white"
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
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors ${
                  transparan ? "ring-white/40 hover:bg-white/10" : "ring-brand-900/30 hover:bg-brand-900 hover:text-white"
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
        <nav id="menu-hp" aria-label="Menu utama" className="h-[calc(100svh-4rem)] overflow-y-auto bg-krem lg:hidden">
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
