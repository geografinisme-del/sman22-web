"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, CustomEase);
/** easing tunggal situs (tokens.css --ease), tanpa bounce */
const EASE = CustomEase.create("langit", "0.22,1,0.36,1");

/** Blok yang muncul saat digulir (bertahap per kelompok, maks. 4 jeda). */
const TARGET = [
  ".lp .lgt-shead",
  ".lp .lgt-kisi > *",
  ".lp .lgt-nomor-kisi > *",
  ".lp .lgt-mozaik > li",
  ".lp .lgt-daftar-tgl > li",
  ".lp .lgt-kabar > *",
  ".lp .lgt-akses > li",
  ".lp .lgt-bento > *",
  ".lp .lgt-cta",
  ".lp .lgt-prestasi > *",
  ".lp .lgt-orang-kisi > li",
  ".lp .galeri-kisi > li",
  ".lp .lgt-faq",
  ".lp .lgt-kosong",
  ".lp .pd-peran > li",
  ".lp .pd-daftar",
  ".lp li.kartu",
  ".lp aside > .kartu",
].join(",");

/**
 * Mesin gerak halaman publik "Langit cerah" (GSAP + ScrollTrigger), dimuat terpisah oleh GerakLangit.
 * - Semua gerak hanya untuk (prefers-reduced-motion: no-preference) lewat gsap.matchMedia().
 * - Keadaan awal (tersembunyi) HANYA diset di sini, dan hanya untuk blok yang masih di bawah layar —
 *   tanpa JS / reduced motion / tingkat "minimal", semua konten langsung terlihat.
 * - Blok besar 800 ms; efek berat (parallax foto) hanya (min-width: 900px) and (hover: hover) + tingkat "dinamis".
 * - Awan hero dijeda saat hero tidak terlihat. Kartu putar & tur punya mesin sendiri.
 */
export default function MesinLangit({ tingkat }: { tingkat: string }) {
  useEffect(() => {
    const mm = gsap.matchMedia();
    const dinamis = tingkat === "dinamis";

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const batas = window.innerHeight * 0.92;
      const blok = gsap.utils
        .toArray<HTMLElement>(TARGET)
        // hanya yang belum terlihat & belum terlewati; tur punya mesin sendiri
        .filter((el) => el.getBoundingClientRect().top > batas && !el.closest(".tur, [data-hero-langit], dialog"));
      if (!blok.length) return;
      const jarak = dinamis ? 40 : 24;
      // hanya opacity (bukan visibility): teks tetap ada untuk pembaca layar, Ctrl+F, dan innerText
      gsap.set(blok, { opacity: 0, y: jarak });
      ScrollTrigger.batch(blok, {
        start: "top 92%",
        once: true,
        onEnter: (kelompok) =>
          gsap.to(kelompok, { opacity: 1, y: 0, duration: 0.8, ease: EASE, stagger: (i: number) => Math.min(i, 3) * 0.08, overwrite: true, clearProps: "transform,opacity" }),
      });
      // cetak/simpan halaman: tampilkan semuanya
      const cetak = () => gsap.set(blok, { clearProps: "all" });
      window.addEventListener("beforeprint", cetak);
      return () => window.removeEventListener("beforeprint", cetak);
    });

    // angka bertanda [data-hitung] (siswa aktif, ekstrakurikuler) menghitung naik sekali saat terlihat;
    // nilai asli sudah ada di HTML dan dikembalikan di akhir / saat dilepas
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const pulihkan: (() => void)[] = [];
      gsap.utils.toArray<HTMLElement>(".lp [data-hitung]").forEach((el) => {
        const asli = el.textContent ?? "";
        const m = asli.match(/^(\D*)([\d.]+)(.*)$/);
        if (!m || el.getBoundingClientRect().top < window.innerHeight) return;
        const target = Number(m[2].replace(/\./g, ""));
        if (!Number.isFinite(target) || target <= 0) return;
        const nilai = { n: 0 };
        el.textContent = `${m[1]}0${m[3]}`;
        pulihkan.push(() => (el.textContent = asli));
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () =>
            gsap.to(nilai, {
              n: target,
              duration: 1,
              ease: EASE,
              onUpdate: () => void (el.textContent = `${m[1]}${Math.round(nilai.n).toLocaleString("id-ID")}${m[3]}`),
              onComplete: () => void (el.textContent = asli),
            }),
        });
      });
      return () => pulihkan.forEach((f) => f());
    });

    // parallax foto: efek berat, hanya desktop dengan pointer hover & tingkat dinamis
    if (dinamis) {
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px) and (hover: hover)", () => {
        gsap.utils.toArray<HTMLElement>(".lp .lgt-foto-besar img, .lp .lgt-mozaik > li:first-child img").forEach((img) => {
          gsap.fromTo(img, { yPercent: -5, scale: 1.1 }, { yPercent: 5, scale: 1.1, ease: "none", scrollTrigger: { trigger: img.closest(".media-slot") ?? img, start: "top bottom", end: "bottom top", scrub: true } });
        });
      });
    }

    // awan hero berhenti saat hero di luar layar
    const hero = document.querySelector<HTMLElement>("[data-hero-langit]");
    const io = hero ? new IntersectionObserver(([e]) => hero.toggleAttribute("data-diam", !e.isIntersecting)) : null;
    if (hero && io) io.observe(hero);

    return () => {
      io?.disconnect();
      hero?.removeAttribute("data-diam");
      mm.revert();
    };
  }, [tingkat]);
  return null;
}
