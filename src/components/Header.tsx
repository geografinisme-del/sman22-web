"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { layanan, menu } from "@/content/menu";
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

/** Menu "Layanan" (disclosure): Esc/klik di luar menutup, fokus kembali ke tombolnya. */
function MenuLayanan() {
  const [buka, setBuka] = useState(false);
  const tombol = useRef<HTMLButtonElement>(null);
  const wadah = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!buka) return;
    const tekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBuka(false);
        tombol.current?.focus();
      }
    };
    const klik = (e: MouseEvent) => {
      if (!e.composedPath().includes(wadah.current!)) setBuka(false);
    };
    // fokus berpindah keluar menu (mis. Tab) → tutup
    const fokus = (e: FocusEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("keydown", tekan);
    document.addEventListener("click", klik);
    document.addEventListener("focusin", fokus);
    return () => {
      document.removeEventListener("keydown", tekan);
      document.removeEventListener("click", klik);
      document.removeEventListener("focusin", fokus);
    };
  }, [buka]);

  return (
    <div ref={wadah} className="menu-layanan">
      <button ref={tombol} type="button" aria-expanded={buka} aria-controls={id} onClick={() => setBuka((b) => !b)}>
        Layanan
        <ChevronDown size={16} aria-hidden className="menu-layanan-panah" />
      </button>
      <div id={id} className="menu-layanan-panel" hidden={!buka}>
        <ul>
          {layanan.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={() => setBuka(false)}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#1f2328]">{l.label}</span>
                  <span className="block text-[0.875rem] leading-snug text-[#5b6270]">{l.teks}</span>
                </span>
                <ArrowRight size={16} aria-hidden className="ikon-geser mt-1 shrink-0 text-[#5b6270]" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
          <MenuLayanan />
        </nav>
        <Link className="btn tombol-portal" href="/admin/login">
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
            <p className="menu-hp-judul">Layanan</p>
            {layanan.map((l) => (
              <Link key={l.href} href={l.href} onClick={tutup}>
                {l.label}
              </Link>
            ))}
            <button type="button" onClick={tutup} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc8bd] font-semibold">
              <X size={18} aria-hidden /> Tutup menu
            </button>
          </nav>
        </details>
      </div>
    </header>
  );
}
