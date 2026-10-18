"use client";

import { useEffect } from "react";

/**
 * Header sticky tema Buku Tahunan: padding mengecil setelah halaman digulir (transisi CSS 0,3 s).
 * Hanya menambah kelas `data-kecil` pada .lp-header; tanpa JavaScript header tetap tampil normal.
 */
export function HeaderMengecil() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".situs-publik .lp-header");
    if (!header) return;
    let jadwal = 0;
    const periksa = () => {
      jadwal = 0;
      header.toggleAttribute("data-kecil", window.scrollY > 24);
    };
    const saatGulir = () => {
      if (!jadwal) jadwal = requestAnimationFrame(periksa);
    };
    periksa();
    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => {
      window.removeEventListener("scroll", saatGulir);
      if (jadwal) cancelAnimationFrame(jadwal);
      header.removeAttribute("data-kecil");
    };
  }, []);
  return null;
}
