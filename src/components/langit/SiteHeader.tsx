"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { sekolah } from "@/content/sekolah";
import { GRUP_LANGIT, PIL_HEADER, type GrupLangit } from "@/content/menu-langit";
import { FullMenu, type DataMenu } from "./FullMenu";

/**
 * Header situs (semua halaman publik).
 * - Di atas hero langit (`[data-hero-langit]`): transparan, teks putih, pil navigasi tengah berlatar biru gelap + blur.
 * - Setelah melewati hero / di halaman tanpa hero: lengket, putih 90% + blur, teks tinta.
 * - Tanpa JavaScript: header ikut tergulir di atas hero (tidak menimpa konten); pil & tombol Menu adalah tautan
 *   ke navigasi lengkap di footer (#navigasi-situs). Dengan JS, klik membuka menu layar penuh.
 * Pil Profil/Pembelajaran/Kabar/Layanan & "Menu lengkap" membuka menu layar penuh pada grup terkait.
 */
export function SiteHeader({ data }: { data: DataMenu }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  // true hanya di peramban setelah hidrasi (server & tanpa JS: false)
  const js = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [lewat, setLewat] = useState(false);
  const [menu, setMenu] = useState<GrupLangit["kunci"] | null>(null);
  const pemicu = useRef<HTMLElement | null>(null);

  // menu tertutup saat berpindah halaman (penyesuaian state saat render, bukan di effect)
  const [pathLama, setPathLama] = useState(path);
  if (path !== pathLama) {
    setPathLama(path);
    setMenu(null);
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


  const buka = (k: GrupLangit["kunci"], e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    pemicu.current = e.currentTarget;
    setMenu(k);
  };
  const tutup = useCallback(() => {
    setMenu(null);
    // fokus kembali ke tombol pemicu
    requestAnimationFrame(() => pemicu.current?.focus());
  }, []);

  const terang = js && !lewat; // di atas hero → teks putih
  return (
    <>
      <header ref={ref} className="lgt-header" data-js={js || undefined} data-terang={terang || undefined} data-lewat={(js && lewat) || undefined}>
        <div className="lgt-wadah lgt-header-isi">
          <Link href="/" className="lgt-merek" aria-label={`Beranda ${sekolah.nama}`} prefetch={false}>
            <Image src={sekolah.logo} alt="" width={502} height={497} sizes="40px" className="lgt-logo" priority />
            <span>SMAN 22 Bandung</span>
          </Link>

          <nav className="lgt-pil" aria-label="Menu utama">
            {PIL_HEADER.map((k) => {
              const g = GRUP_LANGIT.find((x) => x.kunci === k)!;
              const aktif = g.anak.some((a) => path === a.href.split(/[?#]/)[0] && a.href !== "/");
              return (
                <a key={k} href="#navigasi-situs" aria-haspopup="dialog" data-aktif={aktif || undefined} onClick={(e) => buka(k, e)}>
                  {g.pendek}
                </a>
              );
            })}
            <a href="#navigasi-situs" aria-haspopup="dialog" className="lgt-pil-lengkap" onClick={(e) => buka("profil", e)}>
              Menu lengkap <ChevronDown size={15} aria-hidden />
            </a>
          </nav>

          <div className="lgt-header-kanan">
            <a href="#navigasi-situs" className="lgt-tombol-menu" aria-haspopup="dialog" onClick={(e) => buka("profil", e)}>
              <Menu size={18} aria-hidden /> Menu
            </a>
            <Link href="/portal-digital" className="lgt-tombol-portal">
              <span className="lgt-portal-panjang">Portal Digital 22</span>
              <span className="lgt-portal-pendek">Portal</span>
            </Link>
          </div>
        </div>
      </header>
      <FullMenu terbuka={menu !== null} grupAwal={menu ?? "profil"} onTutup={tutup} data={data} />
    </>
  );
}
