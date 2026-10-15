"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { menu } from "@/content/menu";
import { sekolah } from "@/content/sekolah";

export function Brand({ sub = "Kota Bandung · Sejak 1989" }: { sub?: string }) {
  return (
    <Link href="/" className="brand" aria-label={`Beranda ${sekolah.nama}`}>
      <Image src={sekolah.logo} alt="" width={502} height={497} sizes="48px" priority className="brand-logo" />
      <span className="min-w-0">
        <strong>{sekolah.nama}</strong>
        <small>{sub}</small>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const menuHp = useRef<HTMLDetailsElement>(null);
  const aktif = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const tutup = () => menuHp.current?.removeAttribute("open");
  const tautan = menu.filter((m) => m.href !== "/");

  // menu ponsel: tutup dengan Esc (fokus kembali ke tombol) atau klik di luar menu
  useEffect(() => {
    const d = menuHp.current;
    if (!d) return;
    const tekan = (e: KeyboardEvent) => {
      if (e.key === "Escape" && d.open) {
        d.removeAttribute("open");
        d.querySelector("summary")?.focus();
      }
    };
    const klik = (e: MouseEvent) => {
      if (d.open && !d.contains(e.target as Node)) d.removeAttribute("open");
    };
    document.addEventListener("keydown", tekan);
    document.addEventListener("click", klik);
    return () => {
      document.removeEventListener("keydown", tekan);
      document.removeEventListener("click", klik);
    };
  }, []);

  return (
    <header className="lp lp-header">
      <div className="lp-wadah lp-header-isi">
        <Brand />
        <nav className="nav-links" aria-label="Menu utama">
          {tautan.map((m) => (
            <Link key={m.href} href={m.href} aria-current={aktif(m.href) ? "page" : undefined}>
              {m.label}
            </Link>
          ))}
        </nav>
        <Link className="btn tombol-portal" href="/masuk">
          Masuk Portal
        </Link>
        <details className="menu-hp" ref={menuHp}>
          <summary aria-label="Menu navigasi">
            <span className="menu-buka flex items-center gap-2">
              <Menu size={20} aria-hidden /> Menu
            </span>
          </summary>
          <nav aria-label="Menu ponsel">
            {tautan.map((m) => (
              <Link key={m.href} href={m.href} onClick={tutup} aria-current={aktif(m.href) ? "page" : undefined}>
                {m.label}
              </Link>
            ))}
            <Link href="/masuk" onClick={tutup} className="font-semibold text-[var(--tema-utama)]">
              Masuk Portal
            </Link>
            <button type="button" onClick={tutup} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc8bd] font-semibold">
              <X size={18} aria-hidden /> Tutup menu
            </button>
          </nav>
        </details>
      </div>
    </header>
  );
}
