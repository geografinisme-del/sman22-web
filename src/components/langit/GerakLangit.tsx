"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** GSAP + ScrollTrigger dimuat sebagai potongan terpisah (tidak ikut bundel awal). */
const MesinLangit = dynamic(() => import("./MesinLangit"), { ssr: false });

/**
 * Pemuat mesin gerak halaman publik. Konten dirender server dan langsung terlihat; mesin baru dimuat setelah
 * elemen terbesar (LCP) dilukis dan peramban senggang, sehingga tidak menunda LCP di ponsel.
 * Tidak dimuat sama sekali bila prefers-reduced-motion: reduce atau tingkat gerak "minimal" (Admin → Tampilan).
 * Dipasang ulang setiap pindah halaman agar blok halaman baru ikut teranimasi.
 */
export function GerakLangit({ tingkat }: { tingkat: string }) {
  const path = usePathname();
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    if (tingkat === "minimal" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let idle = 0;
    let cadangan = 0;
    let pengamat: PerformanceObserver | undefined;
    let selesai = false;
    const muat = () => {
      if (selesai) return;
      selesai = true;
      pengamat?.disconnect();
      clearTimeout(cadangan);
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(() => setSiap(true), { timeout: 1500 });
      else setSiap(true);
    };
    try {
      pengamat = new PerformanceObserver((daftar) => daftar.getEntries().length && muat());
      pengamat.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* peramban tanpa LCP API: pakai cadangan waktu */
    }
    cadangan = window.setTimeout(muat, 2500);
    return () => {
      selesai = true;
      pengamat?.disconnect();
      clearTimeout(cadangan);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [tingkat]);

  return siap ? <MesinLangit key={path} tingkat={tingkat} /> : null;
}
