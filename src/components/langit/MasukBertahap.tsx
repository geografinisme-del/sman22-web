"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Animasi masuk bertahap (naik + memudar, jeda 0.12 s) untuk anak bertanda [data-masuk].
 * Konten dirender server dan terlihat tanpa JS; keadaan awal hanya diset di sini lewat Web Animations
 * (fill "backwards"). Dilewati bila prefers-reduced-motion, halaman sudah digulir, atau hidrasi lambat
 * (teks yang sudah terbaca tidak dibuat hilang lalu muncul).
 */
export function MasukBertahap({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.scrollY > 40 || performance.now() > 2500) return;
    const anim = [...el.querySelectorAll<HTMLElement>("[data-masuk]")].map((x, i) =>
      x.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], {
        duration: 800,
        delay: i * 120,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      }),
    );
    return () => anim.forEach((a) => a.cancel());
  }, []);
  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
