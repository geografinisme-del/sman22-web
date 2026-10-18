"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** GSAP + ScrollTrigger dimuat sebagai potongan terpisah (tidak ikut bundel awal). */
const MesinGerak = dynamic(() => import("./MesinGerak"), { ssr: false });

/**
 * Pembungkus beranda Buku Tahunan. Konten dirender server dan langsung terlihat; mesin gerak (GSAP) baru
 * dimuat setelah foto hero (LCP) dilukis dan peramban senggang, sehingga tidak menunda LCP di ponsel.
 * Pengguna dengan prefers-reduced-motion: reduce tidak mengunduh mesin gerak sama sekali.
 */
export function GerakBuku({ children }: { children: ReactNode }) {
  const lingkup = useRef<HTMLDivElement>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    // tunggu sampai elemen terbesar (foto hero) sudah dilukis, baru muat mesin gerak
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
  }, []);

  return (
    <div ref={lingkup} className="lp lp-buku">
      {children}
      {siap && <MesinGerak lingkup={lingkup} />}
    </div>
  );
}
