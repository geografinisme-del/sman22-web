"use client";

import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { hitungTur } from "@/lib/tur";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Mesin tur sekolah (GSAP + ScrollTrigger, dimuat lambat oleh TurPembungkus).
 * gsap.matchMedia: mode sticky di semua lebar layar selama (prefers-reduced-motion: no-preference) — HP memakai
 * tata letak sticky ringkas (foto di atas, kartu di bawah; lihat langit.css).
 * Semua keadaan awal diset di sini; saat kondisi tidak terpenuhi / unmount, section kembali ke mode daftar
 * (gaya inline dibersihkan). Hanya transform/opacity.
 */
export default function MesinTur({ akar }: { akar: RefObject<HTMLElement | null> }) {
  useGSAP(
    () => {
      const sec = akar.current;
      if (!sec) return;
      const mm = gsap.matchMedia();
      // HP: bilah alamat yang menyusut/membesar tidak memicu hitung ulang (tanpa lompatan)
      ScrollTrigger.config({ ignoreMobileResize: true });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const item = [...sec.querySelectorAll<HTMLElement>(".tur-item")];
        const media = item.map((li) => li.querySelector<HTMLElement>(".tur-media")!);
        const foto = item.map((li) => li.querySelector<HTMLElement>(".tur-foto"));
        const video = item.map((li) => li.querySelector<HTMLVideoElement>(".tur-video"));
        const kartu = item.map((li) => li.querySelector<HTMLElement>(".tur-kartu")!);
        const penanda = [...sec.querySelectorAll<HTMLElement>(".tur-penanda li")];
        const awan = sec.querySelector<HTMLElement>(".tur-awan")!;
        const n = item.length;
        let aktifLama = -1;

        sec.dataset.mode = "sticky";
        const terapkan = (p: number) => {
          const k = hitungTur(p, n);
          awan.style.opacity = String(k.awan);
          awan.style.visibility = k.awan > 0.01 ? "visible" : "hidden";
          for (let i = 0; i < n; i++) {
            media[i].style.opacity = String(k.bobot[i]);
            media[i].style.visibility = k.bobot[i] > 0.001 ? "visible" : "hidden";
            const f = foto[i];
            if (f) f.style.transform = `translate3d(${k.geser[i]}%, 0, 0) scale(${k.skala[i]})`;
          }
          if (k.aktif !== aktifLama) {
            aktifLama = k.aktif;
            kartu.forEach((c, i) => {
              c.toggleAttribute("data-aktif", i === k.aktif);
              c.setAttribute("aria-hidden", String(i !== k.aktif));
              c.querySelectorAll("a").forEach((a) => (i === k.aktif ? a.removeAttribute("tabindex") : a.setAttribute("tabindex", "-1")));
            });
            penanda.forEach((m, i) => m.toggleAttribute("data-aktif", i === k.aktif));
          }
          // video hanya diputar saat titiknya terlihat
          video.forEach((v, i) => {
            if (!v) return;
            if (k.bobot[i] > 0.05 && k.awan < 0.5) {
              if (v.paused) void v.play().catch(() => {});
            } else if (!v.paused) v.pause();
          });
        };

        const st = ScrollTrigger.create({ trigger: sec, start: "top top", end: "bottom bottom", onUpdate: (s) => terapkan(s.progress) });
        terapkan(st.progress);
        ScrollTrigger.refresh();

        return () => {
          st.kill();
          sec.dataset.mode = "daftar";
          awan.removeAttribute("style");
          media.forEach((m) => m.removeAttribute("style"));
          foto.forEach((f) => f?.style.removeProperty("transform"));
          video.forEach((v) => v?.pause());
          kartu.forEach((c) => {
            c.removeAttribute("data-aktif");
            c.removeAttribute("aria-hidden");
            c.querySelectorAll("a").forEach((a) => a.removeAttribute("tabindex"));
          });
          penanda.forEach((m) => m.removeAttribute("data-aktif"));
        };
      });
      return () => mm.revert();
    },
    { scope: akar },
  );
  return null;
}
