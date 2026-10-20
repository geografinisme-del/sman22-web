"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mesin tur (GSAP + ScrollTrigger) dimuat terpisah, hanya saat section tur mendekati layar. */
const MesinTur = dynamic(() => import("./MesinTur"), { ssr: false });

/**
 * Pembungkus section tur. Tanpa JS: daftar biasa (data-mode="daftar"). Saat section mendekati layar,
 * mesin dimuat; mesin sendiri yang memutuskan (gsap.matchMedia) apakah memakai mode sticky.
 * Video di mode daftar hanya diputar saat terlihat dan tidak pernah saat prefers-reduced-motion.
 */
export function TurPembungkus({ jumlah, children }: { jumlah: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [dekat, setDekat] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setDekat(true), io.disconnect()), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // mode daftar: putar video yang terlihat saja (bila gerak diizinkan)
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (es) => {
        if (el.dataset.mode === "sticky") return;
        for (const e of es) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) void v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.5 },
    );
    el.querySelectorAll("video").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id="tur" className="tur" data-mode="daftar" aria-labelledby="judul-tur" style={{ ["--tur-n" as string]: jumlah }}>
      {children}
      {dekat && <MesinTur akar={ref} />}
    </section>
  );
}
