"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/** Komposisi hero beranda untuk panel kiri halaman akun; lapisan bergeser halus mengikuti kursor. */
export function VisualAkun() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const gerak = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("pointermove", gerak);
    return () => {
      window.removeEventListener("pointermove", gerak);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="hero-visual akun-visual">
      <div className="hero-petal" />
      <div className="hero-disc" />
      <div className="hero-orbit" />
      <span className="hero-spark">✳</span>
      <div className="hero-portrait is-active">
        <span className="hero-portrait-isi">
          <Image src="/images/hero/model-sintetis.png" alt="" fill priority sizes="(min-width: 1024px) 40vw, 0px" className="object-contain" />
        </span>
      </div>
      <div className="hero-sticker">
        <span>Hari ini belajar.</span>
        <strong>Esok, memberi arti.</strong>
        <span className="sticker-line" />
      </div>
    </div>
  );
}
