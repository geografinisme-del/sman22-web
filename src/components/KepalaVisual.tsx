"use client";

import { useEffect, useRef } from "react";

/** Komposisi mini beranda (kelopak, cakram, orbit, bintang) yang bergeser halus mengikuti kursor. */
export function KepalaVisual({ monogram }: { monogram: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const induk = el.closest("header") ?? el;
    let frame = 0;
    const gerak = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    induk.addEventListener("pointermove", gerak as EventListener);
    return () => {
      induk.removeEventListener("pointermove", gerak as EventListener);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="kv relative mx-auto hidden h-[240px] w-full max-w-[380px] md:block lg:h-[270px]">
      <span className="kv-kelopak" />
      <span className="kv-cakram">
        <span className="kv-monogram">{monogram}</span>
      </span>
      <span className="kv-orbit" />
      <span className="kv-bintang">✳</span>
      <span className="kv-titik" />
    </div>
  );
}
