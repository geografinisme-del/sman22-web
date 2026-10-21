"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ChevronDown, Menu, Search } from "lucide-react";
import { sekolah } from "@/content/sekolah";
import type { KunciGrup } from "@/content/menu-langit";
import { MenuHp } from "./MenuHp";
import { PanelMega } from "./PanelMega";
import type { DataMenu } from "./tipeMenu";
import "./navigasi.css";

const JEDA_NIAT = 120; // ms sebelum hover membuka panel
const JEDA_TUTUP = 250; // ms kursor di luar header+panel sebelum panel menutup

/**
 * Header situs (semua halaman publik).
 * - Desktop (≥ 1024px): pil putih — logo + "SMA Negeri 22 / BANDUNG", 5 menu ber-chevron yang membuka MEGA MENU
 *   (panel overlay di bawah header; hover dengan jeda niat 120ms, klik, atau Enter/↓), ikon cari, tombol lime
 *   "Portal Digital 22 →". Panel tutup: kursor keluar > 250ms, klik di luar, Esc (fokus kembali ke pemicu), atau
 *   klik tautan. Layar sentuh: panel hanya dibuka dengan ketuk.
 * - HP & tablet (< 1024px): logo + tombol Menu (menu layar penuh terang, MenuHp) + Portal.
 * - Di atas hero langit: latar header transparan; setelah melewati hero / halaman tanpa hero: lengket.
 * - Tanpa JavaScript: menu adalah tautan ke halaman utama grup / navigasi lengkap di footer (#navigasi-situs).
 * Tinggi nyata header diukur ke --tinggi-header (jarak atas hero).
 */
export function SiteHeader({ data }: { data: DataMenu }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // true hanya di peramban setelah hidrasi (server & tanpa JS: false)
  const js = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [lewat, setLewat] = useState(false);
  const [mega, setMega] = useState<KunciGrup | null>(null);
  const [menuHp, setMenuHp] = useState(false);
  const pemicuHp = useRef<HTMLButtonElement>(null);
  const timer = useRef({ niat: 0, tutup: 0 });

  // menu tertutup saat berpindah halaman (penyesuaian state saat render, bukan di effect)
  const [pathLama, setPathLama] = useState(path);
  if (path !== pathLama) {
    setPathLama(path);
    setMega(null);
    setMenuHp(false);
  }

  // status "lewat hero": hero (bila ada) sudah tergulir melewati bagian bawah header
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-hero-langit]");
    let jadwal = 0;
    const periksa = () => {
      jadwal = 0;
      const tinggi = ref.current?.offsetHeight ?? 72;
      setLewat(!hero || hero.getBoundingClientRect().bottom <= tinggi);
    };
    const gulir = () => {
      if (!jadwal) jadwal = requestAnimationFrame(periksa);
    };
    gulir();
    window.addEventListener("scroll", gulir, { passive: true });
    window.addEventListener("resize", gulir);
    return () => {
      window.removeEventListener("scroll", gulir);
      window.removeEventListener("resize", gulir);
      if (jadwal) cancelAnimationFrame(jadwal);
    };
  }, [path]);

  // tinggi header nyata (berubah saat zoom / teks terbungkus) → variabel CSS --tinggi-header untuk jarak atas hero
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const akar = document.documentElement;
    const ukur = () => akar.style.setProperty("--tinggi-header", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    ukur();
    return () => {
      ro.disconnect();
      akar.style.removeProperty("--tinggi-header");
    };
  }, []);

  const bersihkanTimer = () => {
    clearTimeout(timer.current.niat);
    clearTimeout(timer.current.tutup);
  };
  const tutupMega = useCallback((kembalikanFokus = false) => {
    clearTimeout(timer.current.niat);
    clearTimeout(timer.current.tutup);
    setMega((lama) => {
      if (kembalikanFokus && lama) requestAnimationFrame(() => navRef.current?.querySelector<HTMLElement>(`[data-pemicu="${lama}"]`)?.focus());
      return null;
    });
  }, []);

  // mega menu terbuka: klik di luar header menutup; Esc menutup & mengembalikan fokus ke pemicu
  useEffect(() => {
    if (!mega) return;
    const luar = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) tutupMega();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutupMega(true);
    };
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [mega, tutupMega]);

  useEffect(() => () => bersihkanTimer(), []);

  // hover (hanya mouse): jeda niat 120ms; bila panel sudah terbuka, langsung berganti
  const masukPemicu = (k: KunciGrup, e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    bersihkanTimer();
    if (mega) setMega(k);
    else timer.current.niat = window.setTimeout(() => setMega(k), JEDA_NIAT);
  };
  const keluarNav = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current.niat);
    timer.current.tutup = window.setTimeout(() => setMega(null), JEDA_TUTUP);
  };
  const masukNav = () => clearTimeout(timer.current.tutup);

  const tekanTombol = (k: KunciGrup, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    setMega(k);
    // ↓ membuka panel & fokus ke tautan pertama
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#lgt-mega-${k} a, #lgt-mega-${k} button`)?.focus());
  };
  // fokus keluar dari navigasi (Tab melewati panel terakhir) → panel menutup
  const fokusKeluar = (e: React.FocusEvent) => {
    if (mega && !navRef.current?.contains(e.relatedTarget as Node | null)) setMega(null);
  };

  const tutupHp = useCallback(() => {
    setMenuHp(false);
    requestAnimationFrame(() => pemicuHp.current?.focus());
  }, []);

  const terang = js && !lewat; // di atas hero → teks putih (HP)
  return (
    <>
      <header
        ref={ref}
        className="lgt-header"
        data-js={js || undefined}
        data-terang={terang || undefined}
        data-lewat={(js && lewat) || undefined}
        data-mega={mega ?? undefined}
        onPointerEnter={masukNav}
      >
        <div className="lgt-wadah lgt-header-isi">
          <Link href="/" className="lgt-merek" prefetch={false}>
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="96px" className="lgt-logo" loading="eager" />
            {/* nama yang terbaca = teks yang terlihat (WCAG 2.5.3) + keterangan tujuan untuk pembaca layar */}
            <span className="lgt-merek-teks">
              <strong>SMA Negeri 22</strong>
              <small>Bandung</small>
            </span>
            <span className="sr-only">, ke beranda</span>
          </Link>

          <nav ref={navRef} className="lgt-mega" aria-label="Menu utama" onPointerEnter={masukNav} onPointerLeave={keluarNav} onBlur={fokusKeluar}>
            <ul className="lgt-mega-menu">
              {data.grup.map((g) => {
                const aktifHalaman = g.anak.some((a) => path === a.href.split(/[?#]/)[0]);
                const terbukaIni = mega === g.kunci;
                return (
                  <li key={g.kunci}>
                    {js ? (
                      <button
                        type="button"
                        className="lgt-mega-pemicu"
                        data-pemicu={g.kunci}
                        data-halaman={aktifHalaman || undefined}
                        aria-expanded={terbukaIni}
                        aria-controls={`lgt-mega-${g.kunci}`}
                        onPointerEnter={(e) => masukPemicu(g.kunci, e)}
                        onClick={() => {
                          bersihkanTimer();
                          setMega(terbukaIni ? null : g.kunci);
                        }}
                        onKeyDown={(e) => tekanTombol(g.kunci, e)}
                      >
                        {g.label}
                        <ChevronDown size={15} aria-hidden className="lgt-mega-chevron" />
                      </button>
                    ) : (
                      <a href="#navigasi-situs" className="lgt-mega-pemicu">
                        {g.label}
                        <ChevronDown size={15} aria-hidden className="lgt-mega-chevron" />
                      </a>
                    )}
                    {js && (
                      <div id={`lgt-mega-${g.kunci}`} className="lgt-mega-panel" role="region" aria-label={`Menu ${g.label}`} hidden={!terbukaIni}>
                        {terbukaIni && <PanelMega g={g} data={data} onPilih={() => tutupMega()} />}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="lgt-header-kanan">
            <Link href="/cari" className="lgt-ikon-cari" aria-label="Cari di situs">
              <Search size={18} aria-hidden />
            </Link>
            {js ? (
              <button ref={pemicuHp} type="button" className="lgt-tombol-menu" aria-haspopup="dialog" aria-expanded={menuHp} onClick={() => setMenuHp(true)}>
                <Menu size={18} aria-hidden /> Menu
              </button>
            ) : (
              <a href="#navigasi-situs" className="lgt-tombol-menu">
                <Menu size={18} aria-hidden /> Menu
              </a>
            )}
            <Link href="/portal-digital" className="lgt-tombol-portal">
              <span className="lgt-portal-panjang">Portal Digital 22</span>
              <span className="lgt-portal-pendek">Portal</span>
              <ArrowRight size={16} aria-hidden className="lgt-portal-panah" />
            </Link>
          </div>
        </div>
      </header>
      {js && <MenuHp terbuka={menuHp} onTutup={tutupHp} data={data} />}
    </>
  );
}
