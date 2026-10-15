"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const JEDA_MS = 70;
const MAKS_JEDA = 3; // item ke-5 dst. memakai jeda item ke-4

/**
 * Menghidupkan atribut `data-muncul` di halaman publik (lihat globals.css).
 * Hanya elemen yang masih di bawah layar yang disembunyikan dulu, lalu muncul sekali saat
 * memasuki layar — tanpa JS, saat reduced motion, atau untuk konten yang sudah terlihat,
 * tidak ada yang disembunyikan. Satu observer per halaman; dilepas saat halaman berganti.
 */
export function PengamatMuncul() {
  const path = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = new Map<Element, HTMLElement[]>();
    const tampilkan = (el: Element) => {
      const anak = target.get(el);
      target.delete(el);
      requestAnimationFrame(() => anak?.forEach((a) => a.classList.add("muncul")));
    };
    const io = new IntersectionObserver(
      (entri) => {
        for (const e of entri) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          tampilkan(e.target);
        }
      },
      // terpicu begitu tepi atas masuk 92% tinggi layar — aman untuk layar pendek & elemen besar
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    const batas = window.innerHeight * 0.92;
    document.querySelectorAll<HTMLElement>("[data-muncul]:not([data-muncul-siap])").forEach((el) => {
      el.dataset.munculSiap = "";
      // sudah terlihat atau sudah terlewati (mis. kembali ke posisi gulir) → biarkan apa adanya
      if (el.getBoundingClientRect().top < batas) return;
      const kelompok = el.dataset.muncul === "kelompok";
      const anak = kelompok ? (Array.from(el.children) as HTMLElement[]) : [el];
      anak.forEach((a, i) => {
        a.classList.add("akan-muncul");
        if (kelompok && i > 0) a.style.setProperty("--jeda", `${Math.min(i, MAKS_JEDA) * JEDA_MS}ms`);
      });
      target.set(el, anak);
      io.observe(el);
    });

    // cetak/simpan halaman: tampilkan semuanya
    const cetak = () => target.forEach((_, el) => tampilkan(el));
    window.addEventListener("beforeprint", cetak);
    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", cetak);
      // elemen yang belum sempat muncul dikembalikan ke keadaan awal (terlihat) dan boleh diproses ulang
      target.forEach((anak, el) => {
        delete (el as HTMLElement).dataset.munculSiap;
        anak.forEach((a) => a.classList.remove("akan-muncul"));
      });
    };
  }, [path]);

  return null;
}
