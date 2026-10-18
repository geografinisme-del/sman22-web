"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, LayoutGrid, Menu, X } from "lucide-react";
import { navigasi, type GrupMenu } from "@/content/menu";
import { sekolah } from "@/content/sekolah";

export function Brand({ sub = "Kota Bandung · Sejak 1989" }: { sub?: string }) {
  return (
    <Link href="/" className="brand" aria-label={`Beranda ${sekolah.nama}`} prefetch={false}>
      <Image src={sekolah.logo} alt="" width={502} height={497} sizes="48px" priority className="brand-logo" />
      <span className="min-w-0">
        <strong>{sekolah.nama}</strong>
        <small>{sub}</small>
      </span>
    </Link>
  );
}

const cocok = (path: string, href: string) => {
  const dasar = href.split("?")[0];
  return dasar === "/" ? path === "/" : path === dasar || path.startsWith(dasar + "/");
};

/** Satu kelompok menu (disclosure): Esc/klik di luar/Tab keluar menutup; Esc mengembalikan fokus ke tombol. */
function MenuGrup({ grup, kanan }: { grup: GrupMenu; kanan?: boolean }) {
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  const tombol = useRef<HTMLButtonElement>(null);
  const wadah = useRef<HTMLDivElement>(null);
  const id = useId();
  const aktif = grup.anak!.some((a) => cocok(path, a.href));

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
      <button ref={tombol} type="button" aria-expanded={buka} aria-controls={id} data-aktif={aktif || undefined} onClick={() => setBuka((b) => !b)}>
        {grup.label}
        <ChevronDown size={16} aria-hidden className="menu-layanan-panah" />
      </button>
      <div id={id} className={`menu-layanan-panel ${kanan ? "" : "menu-kiri"}`} hidden={!buka}>
        <ul>
          {grup.anak!.map((l) => (
            <li key={l.href + l.label}>
              <Link href={l.href} onClick={() => setBuka(false)} aria-current={cocok(path, l.href) ? "page" : undefined}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#1f2328]">{l.label}</span>
                  {l.teks && <span className="block text-[0.875rem] leading-snug text-[#5b6270]">{l.teks}</span>}
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
  const tutup = () => menuHp.current?.removeAttribute("open");

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
          {navigasi.map((g, i) =>
            g.anak ? (
              <MenuGrup key={g.label} grup={g} kanan={i >= navigasi.length - 2} />
            ) : (
              <Link key={g.label} href={g.href!} aria-current={cocok(pathname, g.href!) ? "page" : undefined} className="nav-spmb" data-bidang="spmb">
                {g.label}
              </Link>
            ),
          )}
        </nav>
        <Link className="btn tombol-portal" href="/portal-digital">
          <LayoutGrid size={17} aria-hidden />
          Portal Digital 22
        </Link>
        <details className="menu-hp" ref={menuHp}>
          <summary aria-label="Menu navigasi">
            <span className="menu-buka flex items-center gap-2">
              <Menu size={20} aria-hidden /> Menu
            </span>
          </summary>
          <nav aria-label="Menu ponsel">
            <Link href="/portal-digital" onClick={tutup} className="menu-hp-portal">
              <LayoutGrid size={18} aria-hidden /> Portal Digital 22
            </Link>
            {navigasi.map((g) =>
              g.anak ? (
                <div key={g.label} className="contents">
                  <p className="menu-hp-judul">{g.label}</p>
                  {g.anak.map((l) => (
                    <Link key={l.href + l.label} href={l.href} onClick={tutup} aria-current={cocok(pathname, l.href) ? "page" : undefined}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link key={g.label} href={g.href!} onClick={tutup} aria-current={cocok(pathname, g.href!) ? "page" : undefined} className="font-semibold">
                  {g.label} — penerimaan murid baru
                </Link>
              ),
            )}
            <button type="button" onClick={tutup} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cfc8bd] font-semibold">
              <X size={18} aria-hidden /> Tutup menu
            </button>
          </nav>
        </details>
      </div>
    </header>
  );
}
