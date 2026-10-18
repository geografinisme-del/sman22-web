"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);
/** easing tunggal situs: cubic-bezier(0.22, 1, 0.36, 1), tanpa pantulan */
const EASE = CustomEase.create("buku", "M0,0 C0.22,1 0.36,1 1,1");

/** "1.200+" → { n: 1200, plus: "+" }; selain angka → null */
function bacaAngka(t: string) {
  const m = t.trim().match(/^(\d[\d.]*)(\+?)$/);
  return m ? { n: Number(m[1].replace(/\./g, "")), plus: m[2] } : null;
}

/**
 * Mesin gerak beranda Buku Tahunan (progressive enhancement). Dimuat terpisah oleh GerakBuku setelah halaman
 * tampil & peramban senggang, agar GSAP tidak menunda render pertama (LCP).
 * - Konten dirender server dan TERLIHAT tanpa JavaScript; keadaan awal animasi hanya diset di sini.
 * - Semua animasi hanya untuk (prefers-reduced-motion: no-preference); parallax hanya untuk
 *   (min-width: 900px) and (hover: hover). gsap.matchMedia + useGSAP membersihkan semuanya saat unmount.
 * - Teks isi, daftar pengumuman, dan footer tidak dianimasikan. Hanya transform/opacity/clip-path.
 */
export default function MesinGerak({ lingkup }: { lingkup: RefObject<HTMLDivElement | null> }) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          gerak: "(prefers-reduced-motion: no-preference)",
          paralaks: "(prefers-reduced-motion: no-preference) and (min-width: 900px) and (hover: hover)",
        },
        (ctx) => {
          const { gerak, paralaks } = ctx.conditions as { gerak: boolean; paralaks: boolean };
          if (!gerak) return;
          const akar = lingkup.current!;
          const q = gsap.utils.selector(akar);
          const hero = akar.querySelector<HTMLElement>(".bk-hero");

          /* 1. Hero saat dimuat — hanya bila halaman baru dibuka di posisi atas & hidrasi cepat,
                agar teks yang sudah terbaca tidak "hilang lalu muncul" di perangkat lambat. */
          if (hero && window.scrollY < 40 && performance.now() < 4000) {
            const tl = gsap.timeline({ defaults: { ease: EASE } });
            tl.from(q(".hb-slide:first-child img"), { scale: 1.08, duration: 1.6, clearProps: "transform" }, 0)
              .from(q(".bk-hero .bk-baris"), { yPercent: 110, duration: 0.8, stagger: 0.12 }, 0.1)
              .from(q(".bk-hero .bk-label"), { opacity: 0, y: 12, duration: 0.6 }, 0.2)
              .from(q(".bk-hero-fakta, .bk-hero-aksi"), { opacity: 0, y: 16, duration: 0.7, stagger: 0.1 }, 0.55);
          }

          const spmb = akar.querySelector<HTMLElement>(".bk-spmb");
          /* 6. Parallax — hanya 2 titik, hanya desktop dengan hover */
          if (paralaks && hero) {
            gsap.to(q(".hb-lapisan"), { y: 140, ease: "none", scrollTrigger: { start: 0, end: 700, scrub: true } });
            gsap.to(q(".bk-hero-isi"), { y: -60, opacity: 0.25, ease: "none", scrollTrigger: { start: 0, end: 600, scrub: true } });
          }

          /* Tahap 2 — pemicu di bawah lipatan dibuat saat peramban senggang (tidak membentuk long task saat muat) */
          const tahap2 = () =>
            ctx.add(() => {
              /* 2. Garis emas 160px di bawah judul Kabar, Prestasi, Kehidupan Siswa */
              q(".bk-garis-emas").forEach((garis) => {
                gsap.from(garis, { scaleX: 0, duration: 0.9, ease: EASE, scrollTrigger: { trigger: garis, start: "top 95%", once: true } });
              });

              /* 3. Foto berita & galeri: buka dari bawah + skala, sekali saja */
              q(".bk-foto-berita .media-slot, .bk-mozaik .media-slot").forEach((slot) => {
                const img = slot.querySelector("img");
                const tl = gsap.timeline({ scrollTrigger: { trigger: slot, start: "top bottom", once: true }, defaults: { duration: 0.9, ease: EASE } });
                tl.fromTo(slot, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", clearProps: "clipPath" }, 0);
                // transform dibersihkan agar efek hover CSS (scale 1.04) tetap bekerja
                if (img) tl.from(img, { scale: 1.06, clearProps: "transform" }, 0);
              });

              /* 4. Pita angka: hitung naik sekali (1,2 s) */
              q(".bk-angka-nilai[data-hitung]").forEach((el) => {
                const a = bacaAngka(el.dataset.angka ?? "");
                if (!a) return;
                const o = { v: 0 };
                let mulai = false; // ScrollTrigger.refresh() merender progres 0 — teks baru diubah setelah hitungan benar-benar mulai
                gsap.to(o, {
                  v: a.n,
                  duration: 1.2,
                  ease: EASE,
                  scrollTrigger: { trigger: el, start: "top 95%", once: true },
                  onStart: () => void (mulai = true),
                  onUpdate: () => void (mulai && (el.textContent = Math.round(o.v).toLocaleString("id-ID") + a.plus)),
                  onComplete: () => void (el.textContent = el.dataset.angka ?? ""),
                });
              });

              /* 5. Garis luar "22" di blok SPMB tergambar mengikuti gulir */
              const teks22 = akar.querySelector<SVGTextElement>(".bk-spmb-22-teks");
              if (spmb && teks22) {
                gsap.fromTo(
                  teks22,
                  { strokeDasharray: 2400, strokeDashoffset: 2400 },
                  { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: spmb, start: "top 85%", end: "center 40%", scrub: true } },
                );
              }
              if (paralaks && spmb) {
                gsap.fromTo(q(".bk-spmb-22"), { y: 90 }, { y: -90, ease: "none", scrollTrigger: { trigger: spmb, start: "top bottom", end: "bottom top", scrub: true } });
              }
              ScrollTrigger.refresh();
            });
          const adaIdle = typeof window.requestIdleCallback === "function";
          const idle = adaIdle ? window.requestIdleCallback(tahap2, { timeout: 800 }) : (setTimeout(tahap2, 200) as unknown as number);

          // hitung ulang posisi setelah semua pemicu dibuat (dan setelah gambar/huruf selesai dimuat), agar
          // elemen yang sudah terlihat saat halaman dibuka (mis. pita angka) langsung berjalan tanpa menunggu gulir
          const segar = () => ScrollTrigger.refresh();
          const id = requestAnimationFrame(segar);
          if (document.readyState !== "complete") window.addEventListener("load", segar, { once: true });
          return () => {
            cancelAnimationFrame(id);
            if (adaIdle) window.cancelIdleCallback(idle);
            else clearTimeout(idle);
            window.removeEventListener("load", segar);
            // angka yang sedang dihitung dikembalikan ke nilai aslinya
            q(".bk-angka-nilai[data-hitung]").forEach((el) => void (el.textContent = el.dataset.angka ?? el.textContent));
          };
        },
      );
      return () => mm.revert();
    },
    { scope: lingkup },
  );

  return null;
}
