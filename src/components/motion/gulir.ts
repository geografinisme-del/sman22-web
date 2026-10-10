"use client";

import { useEffect, type RefObject } from "react";

/** true bila pengunjung meminta animasi dikurangi (aksesibilitas) */
export const kurangiGerak = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Memanggil `cb(progres)` tiap frame saat elemen terlihat.
 * progres 0 = tepi atas elemen di bawah layar, 1 = tepi bawah elemen sudah lewat atas layar.
 * Hanya berjalan saat elemen tampak (hemat baterai HP) dan tidak berjalan bila animasi dikurangi.
 */
export function useGulir(ref: RefObject<HTMLElement | null>, cb: (p: number, el: HTMLElement) => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el || kurangiGerak()) return;
    let tampak = false;
    let frame = 0;
    const hitung = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const tinggi = window.innerHeight;
      const p = Math.min(1, Math.max(0, (tinggi - r.top) / (tinggi + r.height)));
      cb(p, el);
    };
    const jadwal = () => {
      if (tampak && !frame) frame = requestAnimationFrame(hitung);
    };
    const obs = new IntersectionObserver(([e]) => {
      tampak = e.isIntersecting;
      jadwal();
    });
    obs.observe(el);
    window.addEventListener("scroll", jadwal, { passive: true });
    window.addEventListener("resize", jadwal);
    hitung();
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", jadwal);
      window.removeEventListener("resize", jadwal);
      if (frame) cancelAnimationFrame(frame);
    };
    // cb sengaja tidak masuk dependensi: komponen memakai fungsi stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
